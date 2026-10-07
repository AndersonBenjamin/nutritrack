import { prisma } from '../db.js';
import { toDbDate, todayIn } from '../lib/dates.js';
import { badRequest } from '../lib/errors.js';
import type { Kind, RoutineInput } from '../lib/schemas.js';
import { itemData, serializeRoutine } from './serialize.js';

const itemsOrder = { orderBy: { position: 'asc' as const } };

export async function listActiveRoutines(userId: string, kind: Kind) {
  const routines = await prisma.routine.findMany({
    where: { userId, kind, archivedOn: null },
    include: { items: itemsOrder },
    orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
  });
  return routines.map(serializeRoutine);
}

/**
 * Salva o plano inteiro de um tipo (como o botão "Salvar plano"): atualiza os existentes,
 * cria os novos e arquiva os que sumiram. Arquivar em vez de apagar preserva o histórico.
 */
export async function syncRoutines(userId: string, timezone: string, kind: Kind, input: RoutineInput[]) {
  const today = toDbDate(todayIn(timezone));
  const existing = await prisma.routine.findMany({ where: { userId, kind, archivedOn: null }, select: { id: true } });
  const existingIds = new Set(existing.map((r) => r.id));

  const incomingIds = input.flatMap((r) => (r.id ? [r.id] : []));
  if (incomingIds.some((id) => !existingIds.has(id))) throw badRequest('Item do plano não encontrado.');
  if (new Set(incomingIds).size !== incomingIds.length) throw badRequest('Itens do plano duplicados.');

  await prisma.$transaction(async (tx) => {
    const removed = [...existingIds].filter((id) => !incomingIds.includes(id));
    if (removed.length) {
      await tx.routine.updateMany({ where: { id: { in: removed }, userId }, data: { archivedOn: today } });
    }

    for (const r of input) {
      const fields = { name: r.name, time: r.time, notes: r.notes };
      const items = { create: r.items.map(itemData) };
      if (r.id) {
        await tx.routineItem.deleteMany({ where: { routineId: r.id } });
        await tx.routine.update({ where: { id: r.id, userId }, data: { ...fields, items } });
      } else {
        await tx.routine.create({ data: { ...fields, userId, kind, activeFrom: today, items } });
      }
    }
  });

  return listActiveRoutines(userId, kind);
}

const item = (name: string, quantity: number | null, unit: string | null, kcal: number | null) => ({
  name,
  quantity,
  unit,
  kcal,
  proteinG: null,
  carbsG: null,
  fatG: null,
});

/** Plano inicial de quem acabou de se cadastrar (o mesmo exemplo da versão anterior do app). */
export const defaultMeals = (): RoutineInput[] => [
  {
    name: 'Café da manhã',
    time: '07:30',
    notes: null,
    items: [item('Ovos mexidos', 2, 'un', 180), item('Pão integral', 2, 'fatias', 140), item('Café sem açúcar', 1, 'xícara', 5)],
  },
  {
    name: 'Lanche da manhã',
    time: '10:00',
    notes: null,
    items: [item('Iogurte natural', 170, 'g', 110), item('Frutas vermelhas', 80, 'g', 40)],
  },
  {
    name: 'Almoço',
    time: '12:30',
    notes: null,
    items: [item('Arroz integral', 120, 'g', 150), item('Feijão', 100, 'g', 80), item('Frango grelhado', 150, 'g', 240), item('Salada', 1, 'prato', 30)],
  },
  {
    name: 'Lanche da tarde',
    time: '16:00',
    notes: null,
    items: [item('Banana', 1, 'un', 90), item('Pasta de amendoim', 20, 'g', 120)],
  },
  {
    name: 'Jantar',
    time: '19:30',
    notes: null,
    items: [item('Omelete de legumes', 1, 'porção', 300), item('Salada verde', 1, 'prato', 30)],
  },
];
