// Cliente da API. A sessão fica num cookie httpOnly, então não há token para guardar aqui.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
/** Chamado quando a sessão expira no meio do uso (qualquer 401 fora das rotas de login). */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, data?.error || 'Algo deu errado. Tente novamente.');
  }
  return data;
}

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: ({ name, email, password }) => request('POST', '/auth/register', { name, email, password, timezone: timezone() }),
  logout: () => request('POST', '/auth/logout'),

  // kind: 'meals' | 'medications'
  routines: (kind) => request('GET', `/routines/${kind}`),
  saveRoutines: (kind, routines) => request('PUT', `/routines/${kind}`, { routines }),
  waterGoal: () => request('GET', '/water-goal'),
  saveWaterGoal: (goal) => request('PUT', '/water-goal', goal),

  aiDietStatus: () => request('GET', '/ai-diet'),
  generateDiet: (profile) => request('POST', '/ai-diet/generate', profile),
  swapMeal: (body) => request('POST', '/ai-diet/swap', body),

  day: (date) => request('GET', `/days/${date}`),
  history: (from, to) => request('GET', `/history?from=${from}&to=${to}`),
  createLog: (date, body) => request('POST', `/days/${date}/logs`, body),
  updateLog: (id, body) => request('PUT', `/logs/${id}`, body),
  deleteLog: (id) => request('DELETE', `/logs/${id}`),
  addWater: (date, amountMl) => request('POST', `/days/${date}/water`, { amountMl }),
  deleteWater: (id) => request('DELETE', `/water-logs/${id}`),
};
