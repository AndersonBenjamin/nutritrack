import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { uid } from '../lib/utils';

/**
 * Dados de um dia + ações de registro.
 * As ações atualizam a tela na hora (otimista) e vão para a API em fila, uma por vez;
 * cada uma decide o que fazer olhando o último estado confirmado pelo servidor.
 */
export function useDay(date) {
  const [day, setDay] = useState(null);
  const [error, setError] = useState('');
  const server = useRef(null);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  const current = useRef(date);

  const fetchDay = useCallback(async () => {
    const d = await api.day(date);
    if (current.current === date) server.current = d;
    return d;
  }, [date]);

  const load = useCallback(async () => {
    try {
      const d = await fetchDay();
      if (current.current === date && !pending.current) setDay(d);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [date, fetchDay]);

  useEffect(() => {
    current.current = date;
    server.current = null;
    setDay(null);
    load();
    // Recarrega ao voltar para o app (outro aparelho pode ter registrado algo)
    const onVisible = () => document.visibilityState === 'visible' && !pending.current && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [date, load]);

  function enqueue(optimistic, remote) {
    setDay((d) => (d ? optimistic(d) : d));
    pending.current++;
    queue.current = queue.current.then(async () => {
      try {
        if (server.current) await remote(server.current);
        await fetchDay();
      } catch (e) {
        setError(e.message);
        await fetchDay().catch(() => {});
      } finally {
        pending.current--;
        if (!pending.current && current.current === date && server.current) setDay(server.current);
      }
    });
    return queue.current;
  }

  const section = (kind) => (kind === 'MEAL' ? 'meals' : 'medications');
  const patchPlanned = (d, routine, log) => {
    const key = section(routine.kind);
    return { ...d, [key]: { ...d[key], planned: d[key].planned.map((r) => (r.id === routine.id ? { ...r, log } : r)) } };
  };

  /** Marca/desmarca um item do plano como consumido/tomado, exatamente como planejado. */
  const toggle = (routine) => {
    const done = !routine.log;
    return enqueue(
      (d) => patchPlanned(d, routine, done ? { id: null, items: routine.items } : null),
      async (s) => {
        const log = s[section(routine.kind)].planned.find((r) => r.id === routine.id)?.log;
        if (done && !log) await api.createLog(date, { routineId: routine.id });
        if (!done && log) await api.deleteLog(log.id);
      }
    );
  };

  /** Registra um item do plano com os itens ajustados (ou atualiza o registro existente). */
  const saveRoutineLog = (routine, items) =>
    enqueue(
      (d) => patchPlanned(d, routine, { ...routine.log, items }),
      async (s) => {
        const log = s[section(routine.kind)].planned.find((r) => r.id === routine.id)?.log;
        if (log) await api.updateLog(log.id, { items });
        else await api.createLog(date, { routineId: routine.id, items });
      }
    );

  /** Registro avulso (fora do plano): cria quando não tem id, senão atualiza. */
  const saveExtraLog = (log) =>
    enqueue(
      (d) => {
        const extra = log.id ? d.meals.extra.map((l) => (l.id === log.id ? log : l)) : [...d.meals.extra, { ...log, id: `tmp-${uid()}` }];
        return { ...d, meals: { ...d.meals, extra } };
      },
      async () => {
        const body = { name: log.name, time: log.time, items: log.items };
        if (log.id) await api.updateLog(log.id, body);
        else await api.createLog(date, { ...body, kind: 'MEAL' });
      }
    );

  const removeLog = (log) =>
    enqueue(
      (d) => ({
        ...d,
        meals: { planned: d.meals.planned.map((r) => (r.log?.id === log.id ? { ...r, log: null } : r)), extra: d.meals.extra.filter((l) => l.id !== log.id) },
        medications: { ...d.medications, extra: d.medications.extra.filter((l) => l.id !== log.id) },
      }),
      () => api.deleteLog(log.id)
    );

  const addWater = (amountMl) =>
    enqueue(
      (d) => ({ ...d, water: { ...d.water, logs: [...d.water.logs, { id: null, amountMl }] } }),
      () => api.addWater(date, amountMl)
    );

  const removeLastWater = () =>
    enqueue(
      (d) => ({ ...d, water: { ...d.water, logs: d.water.logs.slice(0, -1) } }),
      async (s) => {
        const last = s.water.logs.at(-1);
        if (last) await api.deleteWater(last.id);
      }
    );

  return { day, error, reload: load, toggle, saveRoutineLog, saveExtraLog, removeLog, addWater, removeLastWater };
}
