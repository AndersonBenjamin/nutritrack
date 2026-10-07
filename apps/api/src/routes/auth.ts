import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { createSession, destroySession, dummyVerify, hashPassword, requireAuth, verifyPassword } from '../lib/auth.js';
import { isValidTimezone, toDbDate, todayIn } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import { DEFAULT_WATER } from '../services/days.js';
import { defaultMeals } from '../services/routines.js';
import { itemData } from '../services/serialize.js';

const email = z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.').max(254));

const registerBody = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(80),
  email,
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(200),
  timezone: z.string().max(64).refine(isValidTimezone).optional(),
});

const loginBody = z.object({ email, password: z.string().min(1).max(200) });

const publicUser = (u: { id: string; name: string; email: string; timezone: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  timezone: u.timezone,
});

// Limite por IP contra força bruta e criação de contas em massa
const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', { config: authRateLimit }, async (request, reply) => {
    const body = registerBody.parse(request.body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      throw new HttpError(409, 'Já existe uma conta com esse e-mail.');
    }

    const timezone = body.timezone ?? 'America/Sao_Paulo';
    const today = toDbDate(todayIn(timezone));
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        timezone,
        waterGoals: { create: { ...DEFAULT_WATER, effectiveFrom: today } },
        routines: {
          create: defaultMeals().map((m) => ({
            kind: 'MEAL' as const,
            name: m.name,
            time: m.time,
            activeFrom: today,
            items: { create: m.items.map(itemData) },
          })),
        },
      },
    });

    await createSession(reply, user.id);
    return reply.status(201).send({ user: publicUser(user) });
  });

  app.post('/auth/login', { config: authRateLimit }, async (request, reply) => {
    const body = loginBody.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      await dummyVerify(body.password);
      throw new HttpError(401, 'E-mail ou senha incorretos.');
    }
    if (!(await verifyPassword(user.passwordHash, body.password))) throw new HttpError(401, 'E-mail ou senha incorretos.');

    await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    await createSession(reply, user.id);
    return { user: publicUser(user) };
  });

  app.post('/auth/logout', async (request, reply) => {
    await destroySession(request, reply);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (request) => ({ user: publicUser(request.user) }));
};
