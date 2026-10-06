// Persistência local (localStorage). Não há servidor: contas e registros ficam no aparelho.
const KEY = 'nutrio:db:v1';
let memory = null; // fallback quando o navegador bloqueia o localStorage

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return memory || { users: {}, session: null };
}

export function saveDB(db) {
  memory = db;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function hashPassword(pw) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nutrio:' + pw));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    for (const c of pw) h = (h * 31 + c.charCodeAt(0)) | 0;
    return 'f' + h;
  }
}

export const defaultPlan = () => ({
  meals: [
    { id: uid(), name: 'Café da manhã', time: '07:30', items: 'Ovos mexidos, pão integral, café sem açúcar', kcal: 380 },
    { id: uid(), name: 'Lanche da manhã', time: '10:00', items: 'Iogurte natural com frutas vermelhas', kcal: 180 },
    { id: uid(), name: 'Almoço', time: '12:30', items: 'Arroz integral, feijão, frango grelhado e salada', kcal: 620 },
    { id: uid(), name: 'Lanche da tarde', time: '16:00', items: 'Banana com pasta de amendoim', kcal: 220 },
    { id: uid(), name: 'Jantar', time: '19:30', items: 'Omelete de legumes e salada verde', kcal: 450 },
  ],
  water: { goal: 2500, cup: 250 },
});

export const sortMeals = (meals) => [...meals].sort((a, b) => a.time.localeCompare(b.time));

export const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
