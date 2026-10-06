import { useState } from 'react';
import { uid, sortMeals, fmt } from '../lib/store';
import { PlusIcon, MinusIcon, TrashIcon, DropIcon, ClockIcon, FlameIcon, CheckIcon } from '../components/Icons';

const CUP_SIZES = [200, 250, 300, 500];

export default function Plan({ plan, onSave }) {
  const [meals, setMeals] = useState(() => sortMeals(plan.meals));
  const [water, setWater] = useState(plan.water);
  const [error, setError] = useState('');

  const update = (id, k, v) => setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, [k]: v } : m)));
  const remove = (id) => setMeals((ms) => ms.filter((m) => m.id !== id));
  const add = () => {
    const last = meals[meals.length - 1]?.time || '07:00';
    const [h, mi] = last.split(':').map(Number);
    const time = `${String(Math.min(23, h + 3)).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    setMeals((ms) => [...ms, { id: uid(), name: '', time, items: '', kcal: '' }]);
    setTimeout(() => document.querySelector('.edit-card:last-of-type input')?.focus(), 50);
  };

  function save() {
    setError('');
    if (meals.some((m) => !m.name.trim())) return setError('Dê um nome para todas as refeições.');
    if (meals.some((m) => !m.time)) return setError('Defina o horário de todas as refeições.');
    onSave({
      meals: sortMeals(meals.map((m) => ({ ...m, name: m.name.trim(), kcal: m.kcal === '' ? '' : Number(m.kcal) }))),
      water,
    });
  }

  return (
    <main className="screen plan">
      <div className="greeting">
        <h1>Seu plano</h1>
        <p className="date">Defina as refeições do dia e sua meta de água.</p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <span className="water-icon">
            <DropIcon size={20} />
          </span>
          <div>
            <span className="eyebrow">Meta de água</span>
            <strong className="big">{fmt(water.goal)} ml</strong>
          </div>
          <div className="stepper">
            <button onClick={() => setWater((w) => ({ ...w, goal: Math.max(500, w.goal - 250) }))} aria-label="Diminuir meta">
              <MinusIcon size={18} />
            </button>
            <button className="plus" onClick={() => setWater((w) => ({ ...w, goal: Math.min(6000, w.goal + 250) }))} aria-label="Aumentar meta">
              <PlusIcon size={18} />
            </button>
          </div>
        </div>
        <span className="field-label">Tamanho do copo</span>
        <div className="chips">
          {CUP_SIZES.map((s) => (
            <button key={s} className={`chip ${water.cup === s ? 'on' : ''}`} onClick={() => setWater((w) => ({ ...w, cup: s }))}>
              {s} ml
            </button>
          ))}
        </div>
        <p className="water-hint">≈ {Math.ceil(water.goal / water.cup)} copos por dia</p>
      </section>

      <div className="section-head">
        <h2>Refeições</h2>
        <span className="muted">{meals.length}</span>
      </div>

      <div className="edit-list">
        {meals.map((m, i) => (
          <article key={m.id} className="edit-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="edit-row">
              <input
                className="edit-name"
                placeholder="Nome da refeição"
                value={m.name}
                onChange={(e) => update(m.id, 'name', e.target.value)}
              />
              <button className="icon-ghost danger" onClick={() => remove(m.id)} aria-label={`Remover ${m.name || 'refeição'}`}>
                <TrashIcon size={18} />
              </button>
            </div>
            <div className="edit-grid">
              <label className="mini-field">
                <ClockIcon size={15} />
                <input type="time" value={m.time} onChange={(e) => update(m.id, 'time', e.target.value)} aria-label="Horário" />
              </label>
              <label className="mini-field">
                <FlameIcon size={15} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="kcal"
                  value={m.kcal}
                  onChange={(e) => update(m.id, 'kcal', e.target.value)}
                  aria-label="Calorias"
                />
              </label>
            </div>
            <textarea
              rows={2}
              placeholder="O que vai comer? Ex.: arroz, frango, salada"
              value={m.items}
              onChange={(e) => update(m.id, 'items', e.target.value)}
            />
          </article>
        ))}
        <button className="add-btn" onClick={add}>
          <PlusIcon size={18} /> Adicionar refeição
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="save-bar">
        <button className="btn-primary" onClick={save}>
          <CheckIcon size={18} /> Salvar plano
        </button>
      </div>
    </main>
  );
}
