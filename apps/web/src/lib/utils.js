// Helpers de formatação e de datas usados pelas telas

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export const formatDay = (day, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', opts);

export const sortByTime = (list) => [...list].sort((a, b) => a.time.localeCompare(b.time));

export const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const sumBy = (items, key) => items.reduce((s, i) => s + (Number(i[key]) || 0), 0);

/** "Pão integral · 2 fatias" */
export function describeItem(item) {
  const qty = [item.quantity != null && item.quantity !== '' ? fmt(item.quantity) : '', item.unit || ''].join(' ').trim();
  return qty ? `${item.name} · ${qty}` : item.name;
}

/** Resumo do dia calculado no cliente, para a tela refletir na hora as ações otimistas. */
export function summarize(day) {
  const meals = day.meals.planned;
  const meds = day.medications.planned;
  const mealsDone = meals.filter((m) => m.log).length;
  const medsTaken = meds.filter((m) => m.log).length;
  const waterMl = sumBy(day.water.logs, 'amountMl');
  const consumed = [...meals.filter((m) => m.log).flatMap((m) => m.log.items), ...day.meals.extra.flatMap((l) => l.items)];

  const parts = [
    meals.length ? mealsDone / meals.length : null,
    meds.length ? medsTaken / meds.length : null,
    day.water.goalMl ? Math.min(1, waterMl / day.water.goalMl) : null,
  ].filter((p) => p !== null);

  return {
    mealsPlanned: meals.length,
    mealsDone,
    medsPlanned: meds.length,
    medsTaken,
    waterMl,
    kcalPlanned: sumBy(meals.flatMap((m) => m.items), 'kcal'),
    kcalConsumed: sumBy(consumed, 'kcal'),
    proteinG: sumBy(consumed, 'proteinG'),
    carbsG: sumBy(consumed, 'carbsG'),
    fatG: sumBy(consumed, 'fatG'),
    progress: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0,
  };
}
