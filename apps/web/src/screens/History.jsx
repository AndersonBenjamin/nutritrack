import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { addDays, fmt, formatDay, todayKey } from '../lib/utils';
import DayView from '../components/DayView';
import { ChevronLeftIcon, ChevronRightIcon, DropIcon, PillIcon, CheckIcon } from '../components/Icons';

const PAGE = 30;

function DayRow({ d, onOpen, index }) {
  return (
    <button className="history-row" onClick={onOpen} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
      <div className="history-top">
        <strong>{formatDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
        <span className="history-pct">{Math.round(d.progress * 100)}%</span>
      </div>
      <div className="water-bar">
        <span style={{ width: `${d.progress * 100}%` }} />
      </div>
      <div className="history-stats">
        <span>
          <CheckIcon size={13} /> {d.mealsDone}/{d.mealsPlanned} refeições
        </span>
        <span>
          <DropIcon size={13} /> {fmt(d.waterMl)} / {fmt(d.waterGoalMl)} ml
        </span>
        {d.medsPlanned > 0 && (
          <span>
            <PillIcon size={13} /> {d.medsTaken}/{d.medsPlanned}
          </span>
        )}
      </div>
    </button>
  );
}

export default function History({ onEditPlan, onEditMeds }) {
  const today = todayKey();
  const [selected, setSelected] = useState(null);
  const [days, setDays] = useState([]);
  const [until, setUntil] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .history(addDays(until, -(PAGE - 1)), until)
      .then((r) => {
        const page = r.days.reverse();
        setDays((prev) => (until === today ? page : [...prev, ...page]));
        // A API não devolve dias anteriores ao cadastro: página incompleta = fim da lista
        setHasMore(page.length === PAGE);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until, reloadKey]);

  // Volta para a lista recarregando do início, para refletir o que foi corrigido no dia
  const backToList = () => {
    setSelected(null);
    setUntil(today);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selected]);

  if (selected) {
    return (
      <main className="screen history">
        <header className="day-nav">
          <button className="icon-round" onClick={() => setSelected(addDays(selected, -1))} aria-label="Dia anterior">
            <ChevronLeftIcon size={20} />
          </button>
          <button className="day-nav-title" onClick={backToList}>
            <span className="eyebrow">Histórico · voltar à lista</span>
            <strong>{formatDay(selected)}</strong>
          </button>
          <button className="icon-round" onClick={() => setSelected(addDays(selected, 1))} disabled={selected >= today} aria-label="Próximo dia">
            <ChevronRightIcon size={20} />
          </button>
        </header>
        <DayView key={selected} date={selected} isToday={selected === today} onEditPlan={onEditPlan} onEditMeds={onEditMeds} />
      </main>
    );
  }

  return (
    <main className="screen history">
      <div className="greeting">
        <h1>Histórico</h1>
        <p className="date">Toque em um dia para ver e corrigir os registros.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="history-list">
        {days.map((d, i) => (
          <DayRow key={d.date} d={d} index={i} onOpen={() => setSelected(d.date)} />
        ))}
      </div>

      {loading ? (
        <div className="loading">Carregando…</div>
      ) : (
        hasMore && days.length > 0 && (
          <button className="add-btn compact" onClick={() => setUntil(addDays(days.at(-1).date, -1))}>
            Ver dias anteriores
          </button>
        )
      )}
    </main>
  );
}
