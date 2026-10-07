import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db.js';
import { addDays, daysBetween, parseDay, timeIn, toDbDate, todayIn } from '../lib/dates.js';
import { badRequest, notFound } from '../lib/errors.js';
import { idParam, itemsSchema, timeString } from '../lib/schemas.js';
import { loadDays } from '../services/days.js';
import { itemData, serializeLog } from '../services/serialize.js';

const MAX_HISTORY_DAYS = 92;
const itemsOrder = { orderBy: { position: 'asc' as const } };

const dateParam = z.object({ date: z.string() });

const createLogBody = z.object({
  // Com routineId: registra um item do plano (copiando os itens, ou com os itens ajustados enviados).
  // Sem routineId: registro avulso, fora do plano.
  routineId: z.uuid().optional(),
  kind: z.enum(['MEAL', 'MEDICATION']).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  time: timeString.optional(),
  items: itemsSchema.optional(),
});

const updateLogBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  time: timeString.optional(),
  items: itemsSchema.optional(),
});

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/** Registros do dia (refeições, remédios, água), resumo diário e histórico. */
export const dayRoutes: FastifyPluginAsync = async (app) => {
  const getLog = (id: string) =>
    prisma.routineLog.findUniqueOrThrow({ where: { id }, include: { items: itemsOrder } }).then(serializeLog);

  app.get('/days/:date', async (request) => {
    const date = parseDay(dateParam.parse(request.params).date, request.user.timezone);
    const [day] = await loadDays(request.user.id, date, date);
    return day;
  });

  app.get('/history', async (request) => {
    const { timezone, id, createdAt } = request.user;
    const query = z.object({ from: z.string().optional(), to: z.string().optional() }).parse(request.query);
    const to = parseDay(query.to ?? todayIn(timezone), timezone);
    const requestedFrom = parseDay(query.from ?? addDays(to, -29), timezone);
    if (requestedFrom > to) throw badRequest('O início do período deve ser antes do fim.');
    if (daysBetween(requestedFrom, to) >= MAX_HISTORY_DAYS) throw badRequest(`Consulte no máximo ${MAX_HISTORY_DAYS} dias por vez.`);

    // Não há o que mostrar antes do dia do cadastro
    const signupDay = todayIn(timezone, createdAt);
    if (to < signupDay) return { days: [] };
    const from = requestedFrom < signupDay ? signupDay : requestedFrom;

    const days = await loadDays(id, from, to);
    return { days: days.map((d) => ({ date: d.date, ...d.summary })) };
  });

  app.post('/days/:date/logs', async (request, reply) => {
    const { id: userId, timezone } = request.user;
    const date = parseDay(dateParam.parse(request.params).date, timezone);
    const body = createLogBody.parse(request.body);

    if (body.routineId) {
      const routine = await prisma.routine.findFirst({ where: { id: body.routineId, userId }, include: { items: itemsOrder } });
      if (!routine) throw notFound('Item do plano');

      const where = { userId, routineId: routine.id, date: toDbDate(date) };
      const existing = await prisma.routineLog.findFirst({ where });
      if (existing) {
        // Já registrado no dia: apenas atualiza os itens, se vieram ajustados
        if (body.items) {
          await prisma.$transaction([
            prisma.routineLogItem.deleteMany({ where: { logId: existing.id } }),
            prisma.routineLog.update({ where: { id: existing.id }, data: { items: { create: body.items.map(itemData) } } }),
          ]);
        }
        return getLog(existing.id);
      }

      try {
        const log = await prisma.routineLog.create({
          data: {
            ...where,
            kind: routine.kind,
            name: body.name ?? routine.name,
            time: body.time ?? routine.time,
            items: { create: (body.items ?? routine.items).map(itemData) },
          },
        });
        return reply.status(201).send(await getLog(log.id));
      } catch (e) {
        // Dois toques simultâneos no mesmo check: devolve o registro que venceu
        if (!isUniqueViolation(e)) throw e;
        return getLog((await prisma.routineLog.findFirstOrThrow({ where })).id);
      }
    }

    if (!body.kind || !body.name) throw badRequest('Informe o tipo e o nome do registro.');
    const log = await prisma.routineLog.create({
      data: {
        userId,
        date: toDbDate(date),
        kind: body.kind,
        name: body.name,
        time: body.time ?? timeIn(timezone),
        items: { create: (body.items ?? []).map(itemData) },
      },
    });
    return reply.status(201).send(await getLog(log.id));
  });

  app.put('/logs/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const body = updateLogBody.parse(request.body);
    const log = await prisma.routineLog.findFirst({ where: { id, userId: request.user.id } });
    if (!log) throw notFound();

    await prisma.$transaction([
      ...(body.items ? [prisma.routineLogItem.deleteMany({ where: { logId: id } })] : []),
      prisma.routineLog.update({
        where: { id },
        data: { name: body.name, time: body.time, items: body.items ? { create: body.items.map(itemData) } : undefined },
      }),
    ]);
    return getLog(id);
  });

  app.delete('/logs/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    const { count } = await prisma.routineLog.deleteMany({ where: { id, userId: request.user.id } });
    if (!count) throw notFound();
    return reply.status(204).send();
  });

  app.post('/days/:date/water', async (request, reply) => {
    const date = parseDay(dateParam.parse(request.params).date, request.user.timezone);
    const { amountMl } = z.object({ amountMl: z.number().int().min(1).max(5_000) }).parse(request.body);
    const log = await prisma.waterLog.create({ data: { userId: request.user.id, date: toDbDate(date), amountMl } });
    return reply.status(201).send({ id: log.id, amountMl: log.amountMl, loggedAt: log.loggedAt.toISOString() });
  });

  app.delete('/water-logs/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    const { count } = await prisma.waterLog.deleteMany({ where: { id, userId: request.user.id } });
    if (!count) throw notFound();
    return reply.status(204).send();
  });
};
