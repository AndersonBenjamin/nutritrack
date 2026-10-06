import { sortMeals, fmt } from '../lib/store';
import { CheckIcon, ClockIcon, FlameIcon, DropIcon, PlusIcon, MinusIcon, LogoutIcon, SparkIcon } from '../components/Icons';

function Ring({ value }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 76 76" width="76" height="76" aria-hidden="true">
      <circle cx="38" cy="38" r={r} className="ring-track" />
      <circle
        cx="38"
        cy="38"
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" className="ring-text">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

function MealCard({ meal, status, onToggle, index }) {
  const label =
    status === 'done' ? 'Desmarcar refeição' : `Marcar ${meal.name} como consumida`;
  return (
    <article className={`meal-card ${status}`} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="meal-top">
        <span className="meal-time">
          <ClockIcon size={14} /> {meal.time}
        </span>
        {status === 'next' && <span className="tag tag-next">Próxima</span>}
        {status === 'done' && <span className="tag tag-done">Consumida</span>}
      </div>
      <div className="meal-main">
        <div className="meal-text">
          <h3>{meal.name}</h3>
          {meal.items && <p className="meal-items">{meal.items}</p>}
          {meal.kcal ? (
            <span className="kcal">
              <FlameIcon size={14} /> {fmt(meal.kcal)} kcal
            </span>
          ) : null}
        </div>
        <button className="check-btn" onClick={onToggle} aria-pressed={status === 'done'} aria-label={label}>
          <CheckIcon size={status === 'next' ? 22 : 18} />
        </button>
      </div>
    </article>
  );
}

function WaterCard({ water, consumed, onSet }) {
  const { goal, cup } = water;
  const cups = Math.max(1, Math.ceil(goal / cup));
  const filled = Math.floor(consumed / cup);
  const pct = Math.min(1, consumed / goal);
  return (
    <section className="water-card">
      <div className="water-head">
        <span className="water-icon">
          <DropIcon size={20} />
        </span>
        <div className="water-info">
          <span className="eyebrow">Água</span>
          <strong>
            {fmt(consumed)} <small>/ {fmt(goal)} ml</small>
          </strong>
        </div>
        <div className="stepper">
          <button onClick={() => onSet(consumed - cup)} disabled={consumed <= 0} aria-label={`Remover ${cup} ml`}>
            <MinusIcon size={18} />
          </button>
          <button className="plus" onClick={() => onSet(consumed + cup)} aria-label={`Adicionar ${cup} ml`}>
            <PlusIcon size={18} />
          </button>
        </div>
      </div>
      <div className="water-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="cups" role="group" aria-label="Copos de água">
        {Array.from({ length: cups }, (_, i) => {
          const on = i < filled;
          return (
            <button
              key={i}
              className={`cup ${on ? 'on' : ''}`}
              onClick={() => onSet(on && i === filled - 1 ? i * cup : (i + 1) * cup)}
              aria-label={`Copo ${i + 1} de ${cup} ml`}
              aria-pressed={on}
            >
              <DropIcon size={15} />
            </button>
          );
        })}
      </div>
      <p className="water-hint">Toque em um copo ou no + para registrar {fmt(cup)} ml.</p>
    </section>
  );
}

export default function Home({ user, log, onToggleMeal, onSetWater, onLogout, onEditPlan }) {
  const meals = sortMeals(user.plan.meals);
  const done = new Set(log.meals.filter((id) => meals.some((m) => m.id === id)));
  const nextId = meals.find((m) => !done.has(m.id))?.id;
  const kcalPlan = meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
  const kcalDone = meals.filter((m) => done.has(m.id)).reduce((s, m) => s + (Number(m.kcal) || 0), 0);
  const pct = meals.length ? done.size / meals.length : 0;
  const firstName = user.name.split(' ')[0];
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="screen home">
      <header className="topbar">
        <span className="avatar">{firstName[0]?.toUpperCase()}</span>
        <button className="pill-btn" onClick={onLogout}>
          <LogoutIcon size={16} /> Sair
        </button>
      </header>

      <div className="greeting">
        <h1>Olá, {firstName}</h1>
        <p className="date">{date}</p>
      </div>

      <section className="summary-card">
        <Ring value={pct} />
        <div className="summary-text">
          <span className="eyebrow">Progresso de hoje</span>
          <strong>
            {done.size} de {meals.length} refeições
          </strong>
          {kcalPlan > 0 && (
            <span className="muted">
              {fmt(kcalDone)} / {fmt(kcalPlan)} kcal
            </span>
          )}
        </div>
      </section>

      <WaterCard water={user.plan.water} consumed={log.water} onSet={onSetWater} />

      <div className="section-head">
        <h2>Refeições</h2>
        <button className="link small" onClick={onEditPlan}>
          Editar plano
        </button>
      </div>

      {meals.length === 0 ? (
        <div className="empty">
          <p>Você ainda não tem refeições no plano.</p>
          <button className="btn-primary" onClick={onEditPlan}>
            Criar refeições
          </button>
        </div>
      ) : (
        <div className="meal-list">
          {!nextId && (
            <div className="all-done">
              <SparkIcon size={18} /> Todas as refeições de hoje foram concluídas!
            </div>
          )}
          {meals.map((m, i) => (
            <MealCard
              key={m.id}
              meal={m}
              index={i}
              status={done.has(m.id) ? 'done' : m.id === nextId ? 'next' : 'later'}
              onToggle={() => onToggleMeal(m.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
