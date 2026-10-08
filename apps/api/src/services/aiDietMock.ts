// Cardápio fake para testar a tela sem chamar a IA (AI_DIET_MOCK=true).
// Não respeita restrições alimentares; só ajusta as porções para bater as calorias da meta.
import type { DietTargets } from '../lib/nutrition.js';

type Item = { name: string; quantity: number; unit: string; kcal: number; proteinG: number; carbsG: number; fatG: number };
type Meal = { name: string; time: string; items: Item[] };

const i = (name: string, quantity: number, unit: string, kcal: number, proteinG: number, carbsG: number, fatG: number): Item => ({
  name,
  quantity,
  unit,
  kcal,
  proteinG,
  carbsG,
  fatG,
});

const MEALS: Record<string, Meal> = {
  breakfast: {
    name: 'Café da manhã',
    time: '07:00',
    items: [i('Pão francês', 1, 'un', 150, 4.7, 29, 1.5), i('Ovo cozido', 2, 'un', 140, 12, 1, 10), i('Mamão papaia', 150, 'g', 60, 0.8, 15, 0.2)],
  },
  morningSnack: {
    name: 'Lanche da manhã',
    time: '10:00',
    items: [i('Banana', 1, 'un', 90, 1, 23, 0.3), i('Aveia em flocos', 30, 'g', 115, 4.4, 20, 2.2)],
  },
  lunch: {
    name: 'Almoço',
    time: '12:30',
    items: [
      i('Arroz branco cozido', 150, 'g', 192, 3.8, 42, 0.3),
      i('Feijão carioca cozido', 100, 'g', 76, 4.8, 13.6, 0.5),
      i('Peito de frango grelhado', 150, 'g', 240, 48, 0, 4.2),
      i('Salada de alface e tomate', 100, 'g', 15, 1, 3, 0.2),
      i('Azeite de oliva', 5, 'ml', 44, 0, 0, 5),
    ],
  },
  afternoonSnack: {
    name: 'Lanche da tarde',
    time: '16:00',
    items: [i('Iogurte natural', 170, 'g', 100, 6, 8, 5), i('Granola', 30, 'g', 130, 3, 20, 4.5)],
  },
  dinner: {
    name: 'Jantar',
    time: '19:30',
    items: [i('Patinho grelhado', 120, 'g', 260, 36, 0, 12), i('Batata-doce cozida', 150, 'g', 115, 1, 27, 0.1), i('Brócolis cozido', 100, 'g', 25, 2, 4, 0.3)],
  },
  supper: {
    name: 'Ceia',
    time: '22:00',
    items: [i('Leite desnatado', 200, 'ml', 70, 6.6, 10, 0.4), i('Castanha-do-pará', 10, 'g', 66, 1.4, 1.2, 6)],
  },
};

const BY_COUNT: Record<number, string[]> = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'afternoonSnack', 'dinner'],
  5: ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'],
  6: ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'supper'],
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function mockDiet(mealsPerDay: number, targets: DietTargets) {
  const meals = BY_COUNT[mealsPerDay].map((key) => MEALS[key]);
  const items = meals.flatMap((m) => m.items);
  // Itens em g/ml são reescalados; os contados em unidades ficam fixos
  const scalable = (it: Item) => it.unit === 'g' || it.unit === 'ml';
  const fixedKcal = items.filter((it) => !scalable(it)).reduce((s, it) => s + it.kcal, 0);
  const scalableKcal = items.filter(scalable).reduce((s, it) => s + it.kcal, 0);
  const factor = Math.min(3, Math.max(0.4, (targets.kcal - fixedKcal) / scalableKcal));

  return {
    meals: meals.map((m) => ({
      ...m,
      items: m.items.map((it) => {
        if (!scalable(it)) return it;
        const quantity = Math.max(5, Math.round((it.quantity * factor) / 5) * 5);
        const r = quantity / it.quantity;
        return { ...it, quantity, kcal: Math.round(it.kcal * r), proteinG: round1(it.proteinG * r), carbsG: round1(it.carbsG * r), fatG: round1(it.fatG * r) };
      }),
    })),
  };
}

// Opções usadas na troca de refeição: todas em g/ml, para dar para ajustar às calorias da original
const SWAP_OPTIONS: Item[][] = [
  [i('Goma de tapioca', 50, 'g', 120, 0, 30, 0), i('Queijo minas frescal', 30, 'g', 72, 5.2, 1, 5.4), i('Café com leite', 150, 'ml', 60, 3, 7, 2)],
  [i('Tilápia grelhada', 150, 'g', 190, 39, 0, 4), i('Arroz integral cozido', 120, 'g', 150, 3, 31, 1), i('Legumes no vapor', 120, 'g', 50, 2, 10, 0.3)],
  [i('Pão integral', 50, 'g', 125, 4.7, 24, 1.7), i('Peito de peru', 40, 'g', 45, 8, 1, 1), i('Suco de laranja natural', 200, 'ml', 90, 1.4, 21, 0.4)],
  [i('Omelete', 100, 'g', 155, 11, 1, 12), i('Espinafre refogado', 60, 'g', 40, 2, 3, 2.5), i('Mandioca cozida', 100, 'g', 125, 0.6, 30, 0.3)],
];

/** Troca fake: outra combinação de alimentos com as mesmas calorias da refeição original. */
export function mockMealSwap(original: { name: string; time: string; items: { kcal: number | null }[] }, seed: number): Meal {
  const target = original.items.reduce((s, it) => s + (it.kcal ?? 0), 0);
  const option = SWAP_OPTIONS[seed % SWAP_OPTIONS.length];
  const factor = target / option.reduce((s, it) => s + it.kcal, 0);
  return {
    name: original.name,
    time: original.time,
    items: option.map((it) => {
      const quantity = Math.max(5, Math.round((it.quantity * factor) / 5) * 5);
      const r = quantity / it.quantity;
      return { ...it, quantity, kcal: Math.round(it.kcal * r), proteinG: round1(it.proteinG * r), carbsG: round1(it.carbsG * r), fatG: round1(it.fatG * r) };
    }),
  };
}
