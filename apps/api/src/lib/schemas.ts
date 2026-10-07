import { z } from 'zod';

const optionalNumber = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .nullish()
    .transform((v) => v ?? null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve estar no formato HH:MM');

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do item.').max(120),
  quantity: optionalNumber(100_000),
  unit: optionalText(30),
  kcal: optionalNumber(20_000),
  proteinG: optionalNumber(2_000),
  carbsG: optionalNumber(2_000),
  fatG: optionalNumber(2_000),
});
export type ItemInput = z.infer<typeof itemSchema>;

export const itemsSchema = z.array(itemSchema).max(50);

export const routineSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome.').max(80),
  time: timeString,
  notes: optionalText(500),
  items: itemsSchema,
});
export type RoutineInput = z.infer<typeof routineSchema>;

export type Kind = 'MEAL' | 'MEDICATION';

export const kindParam = z.object({
  kind: z.enum(['meals', 'medications']).transform((k): Kind => (k === 'meals' ? 'MEAL' : 'MEDICATION')),
});

export const idParam = z.object({ id: z.uuid() });
