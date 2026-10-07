import { prisma } from '../db.js';
import { addDays, daysBetween, fromDbDate, toDbDate } from '../lib/dates.js';
import type { Kind } from '../lib/schemas.js';
import { type Item, serializeLog, serializeRoutine } from './serialize.js';

export const DEFAULT_WATER = { goalMl: 2500, cupMl: 250 };
const itemsOrder = { orderBy: { position: 'asc' as const } };

const sum = (items: Item[], key: 'kcal' | 'proteinG' | 'carbsG' | 'fatG') => items.reduce((s, i) => s + (i[key] ?? 0), 0);
const round = (n: number) => Math.round(n * 100) / 100;

/** Carrega um intervalo de dias com poucas consultas e monta o resumo de cada dia em memória. */
export async function loadDays(userId: string, from: string, to: string) {
  const [routines, logs, waterLogs, goals] = await Promise.all([
    prisma.routine.findMany({
      where: {
        userId,
        activeFrom: { lte: toDbDate(to) },
        OR: [{ archivedOn: null }, { archivedOn: { gt: toDbDate(from) } }],
      },
      include: { items: itemsOrder },
      orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.routineLog.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      include: { items: itemsOrder },
      orderBy: [{ time: 'asc' }, { loggedAt: 'asc' }],
    }),
    prisma.waterLog.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.waterGoal.findMany({ where: { userId }, orderBy: { effectiveFrom: 'asc' } }),
  ]);

  const logsByDay = Map.groupBy(logs.map(serializeLog), (l) => l.date);
  const waterByDay = Map.groupBy(waterLogs, (w) => fromDbDate(w.date));

  return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => {
    const date = addDays(from, i);
    const planned = routines.filter((r) => fromDbDate(r.activeFrom) <= date && (!r.archivedOn || fromDbDate(r.archivedOn) > date));
    const dayLogs = logsByDay.get(date) ?? [];

    const section = (kind: Kind) => {
      const plannedOfKind = planned.filter((r) => r.kind === kind);
      const plannedIds = new Set(plannedOfKind.map((r) => r.id));
      return {
        planned: plannedOfKind.map((r) => ({ ...serializeRoutine(r), log: dayLogs.find((l) => l.routineId === r.id) ?? null })),
        // Registros fora do plano do dia: avulsos ou de itens que já saíram do plano
        extra: dayLogs.filter((l) => l.kind === kind && !(l.routineId && plannedIds.has(l.routineId))),
      };
    };
    const meals = section('MEAL');
    const medications = section('MEDICATION');

    // Meta vigente no dia; para dias anteriores à primeira meta, vale a primeira
    const goal = goals.findLast((g) => fromDbDate(g.effectiveFrom) <= date) ?? goals[0] ?? DEFAULT_WATER;
    const water = (waterByDay.get(date) ?? []).map((w) => ({ id: w.id, amountMl: w.amountMl, loggedAt: w.loggedAt.toISOString() }));
    const waterMl = water.reduce((s, w) => s + w.amountMl, 0);

    const consumedItems = dayLogs.filter((l) => l.kind === 'MEAL').flatMap((l) => l.items);
    const plannedItems = meals.planned.flatMap((r) => r.items);
    const mealsDone = meals.planned.filter((r) => r.log).length;
    const medsTaken = medications.planned.filter((r) => r.log).length;

    // Progresso geral: média das partes que existem no dia (refeições, remédios, água)
    const parts = [
      meals.planned.length ? mealsDone / meals.planned.length : null,
      medications.planned.length ? medsTaken / medications.planned.length : null,
      goal.goalMl ? Math.min(1, waterMl / goal.goalMl) : null,
    ].filter((p) => p !== null);

    return {
      date,
      meals,
      medications,
      water: { goalMl: goal.goalMl, cupMl: goal.cupMl, consumedMl: waterMl, remainingMl: Math.max(0, goal.goalMl - waterMl), logs: water },
      summary: {
        mealsPlanned: meals.planned.length,
        mealsDone,
        extraMeals: meals.extra.length,
        medsPlanned: medications.planned.length,
        medsTaken,
        kcalPlanned: round(sum(plannedItems, 'kcal')),
        kcalConsumed: round(sum(consumedItems, 'kcal')),
        proteinG: round(sum(consumedItems, 'proteinG')),
        carbsG: round(sum(consumedItems, 'carbsG')),
        fatG: round(sum(consumedItems, 'fatG')),
        waterMl,
        waterGoalMl: goal.goalMl,
        progress: parts.length ? round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0,
      },
    };
  });
}
