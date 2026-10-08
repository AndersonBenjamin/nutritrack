// Metas nutricionais calculadas no código (a IA só escolhe alimentos e porções para atingi-las).
import { z } from 'zod';

const ACTIVITY_FACTORS = {
  sedentary: 1.2, // pouco ou nenhum exercício
  light: 1.375, // 1 a 3 dias por semana
  moderate: 1.55, // 3 a 5 dias por semana
  intense: 1.725, // 6 a 7 dias por semana
  athlete: 1.9, // treino pesado diário ou trabalho físico
} as const;

export const RESTRICTIONS = {
  vegetarian: 'vegetariano (sem carnes, aves e peixes)',
  vegan: 'vegano (nenhum alimento de origem animal)',
  lactose_free: 'sem lactose',
  gluten_free: 'sem glúten',
  no_seafood: 'sem peixes e frutos do mar',
  no_pork: 'sem carne de porco',
} as const;

export const GOALS = {
  lose: 'perder peso',
  maintain: 'manter o peso',
  gain: 'ganhar massa muscular',
} as const;

export const dietProfileSchema = z.object({
  age: z.number().int().min(18, 'A geração de dieta é apenas para maiores de 18 anos.').max(100),
  sex: z.enum(['male', 'female']),
  heightCm: z.number().min(120, 'Confira a altura.').max(230, 'Confira a altura.'),
  weightKg: z.number().min(35, 'Confira o peso.').max(300, 'Confira o peso.'),
  activity: z.enum(Object.keys(ACTIVITY_FACTORS) as [keyof typeof ACTIVITY_FACTORS]),
  goal: z.enum(Object.keys(GOALS) as [keyof typeof GOALS]),
  mealsPerDay: z.number().int().min(3).max(6),
  restrictions: z
    .array(z.enum(Object.keys(RESTRICTIONS) as [keyof typeof RESTRICTIONS]))
    .max(Object.keys(RESTRICTIONS).length)
    .default([]),
  avoidFoods: z.string().trim().max(200, 'Use no máximo 200 caracteres nos alimentos a evitar.').default(''),
  // Gestação, amamentação ou doenças que exigem dieta específica: encaminha para um profissional
  healthCondition: z.boolean(),
});
export type DietProfile = z.infer<typeof dietProfileSchema>;

export interface DietTargets {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

export const bmiOf = (p: Pick<DietProfile, 'heightCm' | 'weightKg'>) => p.weightKg / (p.heightCm / 100) ** 2;

export function calculateTargets(p: DietProfile): DietTargets {
  // Mifflin-St Jeor
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTORS[p.activity];

  const adjusted = p.goal === 'lose' ? tdee * 0.8 : p.goal === 'gain' ? tdee * 1.1 : tdee;
  // Piso de segurança: nunca abaixo do mínimo usual sem acompanhamento profissional
  const kcal = round(Math.max(adjusted, p.sex === 'male' ? 1500 : 1200), 10);

  // Com IMC acima de 30, a proteína é calculada sobre o peso de referência (IMC 25)
  const refWeight = bmiOf(p) > 30 ? 25 * (p.heightCm / 100) ** 2 : p.weightKg;
  const proteinPerKg = p.goal === 'lose' ? 2 : p.goal === 'gain' ? 1.8 : 1.6;
  const proteinG = round(refWeight * proteinPerKg);
  const fatG = round((kcal * 0.27) / 9);
  const carbsG = round(Math.max(0, kcal - proteinG * 4 - fatG * 9) / 4);

  return { bmr: round(bmr), tdee: round(tdee), kcal, proteinG, carbsG, fatG };
}
