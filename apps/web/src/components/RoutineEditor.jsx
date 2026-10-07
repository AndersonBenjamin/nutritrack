import { uid, sortByTime, sumBy, fmt } from '../lib/utils';
import ItemsEditor, { emptyItem, fromEditItems, toEditItems } from './ItemsEditor';
import { PlusIcon, TrashIcon, ClockIcon, FlameIcon } from './Icons';

/** Rotinas da API -> estado editável. */
export const toEditRoutines = (routines) => sortByTime(routines).map((r) => ({ ...r, notes: r.notes || '', items: toEditItems(r.items) }));

/** Estado editável -> payload da API (lança erro com mensagem amigável). */
export function fromEditRoutines(routines, noun, variant) {
  if (routines.some((r) => !r.name.trim())) throw new Error(`Dê um nome para todos os ${noun}.`);
  if (routines.some((r) => !r.time)) throw new Error(`Defina o horário de todos os ${noun}.`);
  return sortByTime(routines).map((r) => ({
    ...(r.isNew ? {} : { id: r.id }),
    name: r.name.trim(),
    time: r.time,
    notes: r.notes.trim() || null,
    items: fromEditItems(r.items, { where: r.name.trim(), variant }),
  }));
}

/** Lista editável de refeições (variant meal) ou horários de remédios (variant med). */
export default function RoutineEditor({ routines, onChange, variant, namePlaceholder, addLabel, showErrors }) {
  const isMeal = variant === 'meal';
  const update = (id, k, v) => onChange(routines.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  function add() {
    const last = routines[routines.length - 1]?.time || '07:00';
    const [h, mi] = last.split(':').map(Number);
    const time = `${String(Math.min(23, h + 3)).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    onChange([...routines, { id: uid(), isNew: true, name: '', time, notes: '', items: [emptyItem()] }]);
    setTimeout(() => document.querySelector('.edit-card:last-of-type .edit-name')?.focus(), 50);
  }

  return (
    <div className="edit-list">
      {routines.map((r, i) => {
        const kcal = sumBy(r.items.map((it) => ({ kcal: it.kcal.replace(',', '.') })), 'kcal');
        return (
          <article key={r.id} className="edit-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="edit-row">
              <input className="edit-name" placeholder={namePlaceholder} value={r.name} onChange={(e) => update(r.id, 'name', e.target.value)} />
              <button
                className="icon-ghost danger"
                onClick={() => onChange(routines.filter((x) => x.id !== r.id))}
                aria-label={`Remover ${r.name || 'item'}`}
              >
                <TrashIcon size={18} />
              </button>
            </div>
            <div className="edit-grid">
              <label className="mini-field">
                <ClockIcon size={15} />
                <input type="time" value={r.time} onChange={(e) => update(r.id, 'time', e.target.value)} aria-label="Horário" />
              </label>
              {isMeal ? (
                <span className="mini-field readonly" aria-label="Total de calorias">
                  <FlameIcon size={15} /> {kcal > 0 ? `${fmt(kcal)} kcal` : '— kcal'}
                </span>
              ) : (
                <input className="mini-input" placeholder="Observação" value={r.notes} onChange={(e) => update(r.id, 'notes', e.target.value)} aria-label="Observação" />
              )}
            </div>
            <ItemsEditor items={r.items} onChange={(items) => update(r.id, 'items', items)} variant={variant} showErrors={showErrors} />
          </article>
        );
      })}
      <button className="add-btn" onClick={add}>
        <PlusIcon size={18} /> {addLabel}
      </button>
    </div>
  );
}
