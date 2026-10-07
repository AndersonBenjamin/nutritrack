import { fromDbDate } from '../lib/dates.js';
import type { ItemInput } from '../lib/schemas.js';

type ItemRow = ItemInput & { id: string; position: number };

export const serializeItem = ({ id, name, quantity, unit, kcal, proteinG, carbsG, fatG }: ItemRow) => ({
  id,
  name,
  quantity,
  unit,
  kcal,
  proteinG,
  carbsG,
  fatG,
});
export type Item = ReturnType<typeof serializeItem>;

/** Campos de um item (do plano ou do payload) prontos para gravação. */
export const itemData = (item: ItemInput, position: number) => ({
  position,
  name: item.name,
  quantity: item.quantity,
  unit: item.unit,
  kcal: item.kcal,
  proteinG: item.proteinG,
  carbsG: item.carbsG,
  fatG: item.fatG,
});

export function serializeRoutine(r: { id: string; kind: string; name: string; time: string; notes: string | null; items: ItemRow[] }) {
  return { id: r.id, kind: r.kind, name: r.name, time: r.time, notes: r.notes, items: r.items.map(serializeItem) };
}

export function serializeLog(l: {
  id: string;
  routineId: string | null;
  kind: string;
  date: Date;
  name: string;
  time: string;
  loggedAt: Date;
  items: ItemRow[];
}) {
  return {
    id: l.id,
    routineId: l.routineId,
    kind: l.kind,
    date: fromDbDate(l.date),
    name: l.name,
    time: l.time,
    loggedAt: l.loggedAt.toISOString(),
    items: l.items.map(serializeItem),
  };
}
