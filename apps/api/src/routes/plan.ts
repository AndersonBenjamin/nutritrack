import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { toDbDate, todayIn } from '../lib/dates.js';
import { kindParam, routineSchema } from '../lib/schemas.js';
import { loadDays } from '../services/days.js';
import { listActiveRoutines, syncRoutines } from '../services/routines.js';

const waterGoalBody = z.object({
  goalMl: z.number().int().min(250).max(10_000),
  cupMl: z.number().int().min(50).max(2_000),
});

/** Plano: refeições da dieta, horários de remédios/vitaminas e meta de água. */
export const planRoutes: FastifyPluginAsync = async (app) => {
  // kind = meals | medications
  app.get('/routines/:kind', async (request) => {
    const { kind } = kindParam.parse(request.params);
    return { routines: await listActiveRoutines(request.user.id, kind) };
  });

  app.put('/routines/:kind', async (request) => {
    const { kind } = kindParam.parse(request.params);
    const { routines } = z.object({ routines: z.array(routineSchema).max(30) }).parse(request.body);
    return { routines: await syncRoutines(request.user.id, request.user.timezone, kind, routines) };
  });

  app.get('/water-goal', async (request) => {
    const today = todayIn(request.user.timezone);
    const [day] = await loadDays(request.user.id, today, today);
    return { goalMl: day.water.goalMl, cupMl: day.water.cupMl };
  });

  // A meta passa a valer a partir de hoje; os dias anteriores continuam com a meta da época
  app.put('/water-goal', async (request) => {
    const body = waterGoalBody.parse(request.body);
    const effectiveFrom = toDbDate(todayIn(request.user.timezone));
    const goal = await prisma.waterGoal.upsert({
      where: { userId_effectiveFrom: { userId: request.user.id, effectiveFrom } },
      create: { ...body, userId: request.user.id, effectiveFrom },
      update: body,
    });
    return { goalMl: goal.goalMl, cupMl: goal.cupMl };
  });
};
