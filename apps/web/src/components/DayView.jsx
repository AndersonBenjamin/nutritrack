import { useCallback, useState } from 'react';
import { useDay } from '../hooks/useDay';
import { describeItem, fmt, sumBy, summarize } from '../lib/utils';
import { CheckIcon, ClockIcon, FlameIcon, DropIcon, PlusIcon, MinusIcon, SparkIcon, PillIcon } from './Icons';
import LogSheet from './LogSheet';

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

const TAGS = { next: 'Próxima', done: 'Consumida', taken: 'Tomado', extra: 'Fora do plano' };

/** Cartão de refeição ou de horário de remédios. Mostra o consumido quando registrado, senão o planejado. */
function RoutineCard({ name, time, items, status, tag, index, onCheck, onOpen, checkLabel, isMed }) {
  const kcal = sumBy(items, 'kcal');
  const content = (
    <>
      <h3>{name}</h3>
      {items.length > 0 && <p className="meal-items">{items.map(describeItem).join(', ')}</p>}
      {!isMed && kcal > 0 && (
        <span className="kcal">
          <FlameIcon size={14} /> {fmt(kcal)} kcal
        </span>
      )}
    </>
  );
  return (
    <article className={`meal-card ${status}`} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="meal-top">
        <span className="meal-time">
          {isMed ? <PillIcon size={14} /> : <ClockIcon size={14} />} {time}
        </span>
        {tag && <span className={`tag ${status === 'next' ? 'tag-next' : 'tag-done'}`}>{tag}</span>}
      </div>
      <div className="meal-main">
        {onOpen ? (
          <button className="meal-text meal-open" onClick={onOpen} aria-label={`Ajustar o que foi consumido em ${name}`}>
            {content}
          </button>
        ) : (
          <div className="meal-text">{content}</div>
        )}
        <button className="check-btn" onClick={onCheck} aria-pressed={status === 'done'} aria-label={checkLabel}>
          <CheckIcon size={status === 'next' ? 22 : 18} />
        </button>
      </div>
    </article>
  );
}

function WaterCard({ water, consumed, onAdd, onRemove }) {
  const { goalMl: goal, cupMl: cup } = water;
  const cups = Math.max(1, Math.ceil(goal / cup));
  const filled = Math.floor(consumed / cup);
  const pct = Math.min(1, consumed / goal);
  const remaining = Math.max(0, goal - consumed);
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
          <button onClick={onRemove} disabled={consumed <= 0} aria-label="Remover último registro de água">
            <MinusIcon size={18} />
          </button>
          <button className="plus" onClick={() => onAdd(cup)} aria-label={`Adicionar ${cup} ml`}>
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
              onClick={() => (on ? onRemove() : onAdd(cup))}
              aria-label={on ? 'Remover último copo' : `Adicionar copo de ${cup} ml`}
              aria-pressed={on}
            >
              <DropIcon size={15} />
            </button>
          );
        })}
      </div>
      <p className="water-hint">
        {remaining > 0 ? (
          <>
            Faltam <strong>{fmt(remaining)} ml</strong>. Toque em um copo ou no + para registrar {fmt(cup)} ml.
          </>
        ) : (
          'Meta de água atingida!'
        )}
      </p>
    </section>
  );
}

const nowTime = () => new Date().toTimeString().slice(0, 5);

/** Resumo e registros de um dia. Usado pela tela Hoje e pelo Histórico. */
export default function DayView({ date, isToday, onEditPlan, onEditMeds }) {
  const { day, error, toggle, saveRoutineLog, saveExtraLog, removeLog, addWater, removeLastWater } = useDay(date);
  const [sheet, setSheet] = useState(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  if (!day) {
    return error ? <p className="form-error">{error}</p> : <div className="loading" aria-live="polite">Carregando…</div>;
  }

  const s = summarize(day);
  const meals = day.meals.planned;
  const nextId = isToday ? meals.find((m) => !m.log)?.id : null;
  const openPlanned = (r) =>
    setSheet({
      title: r.name,
      subtitle: r.log ? 'Editar registro' : 'Registrar refeição',
      initial: { items: r.log?.items ?? r.items },
      onSave: (items) => saveRoutineLog(r, items),
      onRemove: r.log?.id ? () => removeLog(r.log) : null,
    });
  const openExtra = (log) =>
    setSheet({
      title: log ? log.name : 'Refeição fora do plano',
      subtitle: log ? 'Editar registro' : 'Novo registro',
      freeform: true,
      initial: log ?? { name: '', time: isToday ? nowTime() : '12:00', items: [] },
      onSave: (data) => saveExtraLog({ ...log, ...data }),
      onRemove: log && !log.id?.startsWith('tmp-') ? () => removeLog(log) : null,
    });

  return (
    <>
      {error && <p className="form-error">{error}</p>}

      <section className="summary-card">
        <Ring value={s.progress} />
        <div className="summary-text">
          <span className="eyebrow">{isToday ? 'Progresso de hoje' : 'Progresso do dia'}</span>
          <strong>
            {s.mealsDone} de {s.mealsPlanned} refeições
          </strong>
          {(s.kcalPlanned > 0 || s.kcalConsumed > 0) && (
            <span className="muted">
              {fmt(s.kcalConsumed)} / {fmt(s.kcalPlanned)} kcal
            </span>
          )}
          <span className="muted macros-line" aria-label={`Proteína ${fmt(s.proteinG)} g, carboidrato ${fmt(s.carbsG)} g, gordura ${fmt(s.fatG)} g`}>
            <b>P</b> {fmt(s.proteinG)}g · <b>C</b> {fmt(s.carbsG)}g · <b>G</b> {fmt(s.fatG)}g
          </span>
          {s.medsPlanned > 0 && (
            <span className="muted">
              Remédios: {s.medsTaken} de {s.medsPlanned}
            </span>
          )}
        </div>
      </section>

      <WaterCard water={day.water} consumed={s.waterMl} onAdd={addWater} onRemove={removeLastWater} />

      <div className="section-head">
        <h2>Refeições</h2>
        <button className="link small" onClick={onEditPlan}>
          Editar plano
        </button>
      </div>

      {meals.length === 0 && day.meals.extra.length === 0 ? (
        <div className="empty">
          <p>Você ainda não tem refeições no plano.</p>
          <button className="btn-primary" onClick={onEditPlan}>
            Criar refeições
          </button>
        </div>
      ) : (
        <div className="meal-list">
          {isToday && meals.length > 0 && !nextId && (
            <div className="all-done">
              <SparkIcon size={18} /> Todas as refeições de hoje foram concluídas!
            </div>
          )}
          {meals.map((m, i) => {
            const status = m.log ? 'done' : m.id === nextId ? 'next' : 'later';
            return (
              <RoutineCard
                key={m.id}
                index={i}
                name={m.name}
                time={m.time}
                items={m.log?.items ?? m.items}
                status={status}
                tag={TAGS[status]}
                onCheck={() => toggle(m)}
                onOpen={() => openPlanned(m)}
                checkLabel={m.log ? 'Desmarcar refeição' : `Marcar ${m.name} como consumida`}
              />
            );
          })}
          {day.meals.extra.map((l, i) => (
            <RoutineCard
              key={l.id}
              index={meals.length + i}
              name={l.name}
              time={l.time}
              items={l.items}
              status="done"
              tag={TAGS.extra}
              onCheck={() => openExtra(l)}
              onOpen={() => openExtra(l)}
              checkLabel={`Editar ${l.name}`}
            />
          ))}
        </div>
      )}
      <button className="add-btn compact" onClick={() => openExtra(null)}>
        <PlusIcon size={18} /> Registrar refeição fora do plano
      </button>

      <div className="section-head">
        <h2>Remédios e vitaminas</h2>
        <button className="link small" onClick={onEditMeds}>
          Editar
        </button>
      </div>

      {day.medications.planned.length === 0 && day.medications.extra.length === 0 ? (
        <div className="empty">
          <p>Nenhum remédio ou vitamina cadastrado.</p>
          <button className="btn-primary" onClick={onEditMeds}>
            Cadastrar
          </button>
        </div>
      ) : (
        <div className="meal-list">
          {day.medications.planned.map((m, i) => (
            <RoutineCard
              key={m.id}
              isMed
              index={i}
              name={m.name}
              time={m.time}
              items={m.log?.items ?? m.items}
              status={m.log ? 'done' : 'later'}
              tag={m.log ? TAGS.taken : null}
              onCheck={() => toggle(m)}
              checkLabel={m.log ? `Desmarcar ${m.name}` : `Marcar ${m.name} como tomado`}
            />
          ))}
          {day.medications.extra.map((l, i) => (
            <RoutineCard
              key={l.id}
              isMed
              index={day.medications.planned.length + i}
              name={l.name}
              time={l.time}
              items={l.items}
              status="done"
              tag={TAGS.taken}
              onCheck={() => removeLog(l)}
              checkLabel={`Desmarcar ${l.name}`}
            />
          ))}
        </div>
      )}

      {sheet && <LogSheet {...sheet} onClose={closeSheet} />}
    </>
  );
}
