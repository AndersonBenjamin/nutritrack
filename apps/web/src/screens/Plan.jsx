import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmt } from '../lib/utils';
import RoutineEditor, { fromEditRoutines, toEditRoutines } from '../components/RoutineEditor';
import { PlusIcon, MinusIcon, DropIcon, CheckIcon } from '../components/Icons';

const CUP_SIZES = [200, 250, 300, 500];

export default function Plan({ onSaved }) {
  const [meals, setMeals] = useState(null);
  const [water, setWater] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    Promise.all([api.routines('meals'), api.waterGoal()])
      .then(([r, w]) => {
        setMeals(toEditRoutines(r.routines));
        setWater(w);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    setError('');
    try {
      const payload = fromEditRoutines(meals, 'itens da dieta', 'meal');
      setSaving(true);
      await Promise.all([api.saveRoutines('meals', payload), api.saveWaterGoal(water)]);
      onSaved();
    } catch (e) {
      setError(e.message);
      setShowErrors(true);
      setSaving(false);
    }
  }

  return (
    <main className="screen plan">
      <div className="greeting">
        <h1>Seu plano</h1>
        <p className="date">Defina as refeições da sua dieta e sua meta de água.</p>
      </div>

      {!meals || !water ? (
        error ? <p className="form-error">{error}</p> : <div className="loading">Carregando…</div>
      ) : (
        <>
          <section className="panel">
            <div className="panel-head">
              <span className="water-icon">
                <DropIcon size={20} />
              </span>
              <div>
                <span className="eyebrow">Meta de água</span>
                <strong className="big">{fmt(water.goalMl)} ml</strong>
              </div>
              <div className="stepper">
                <button onClick={() => setWater((w) => ({ ...w, goalMl: Math.max(500, w.goalMl - 250) }))} aria-label="Diminuir meta">
                  <MinusIcon size={18} />
                </button>
                <button className="plus" onClick={() => setWater((w) => ({ ...w, goalMl: Math.min(6000, w.goalMl + 250) }))} aria-label="Aumentar meta">
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>
            <span className="field-label">Tamanho do copo</span>
            <div className="chips">
              {CUP_SIZES.map((s) => (
                <button key={s} className={`chip ${water.cupMl === s ? 'on' : ''}`} onClick={() => setWater((w) => ({ ...w, cupMl: s }))}>
                  {s} ml
                </button>
              ))}
            </div>
            <p className="water-hint">≈ {Math.ceil(water.goalMl / water.cupMl)} copos por dia</p>
          </section>

          <div className="section-head">
            <h2>Refeições</h2>
            <span className="muted">{meals.length}</span>
          </div>

          <RoutineEditor
            routines={meals}
            onChange={setMeals}
            variant="meal"
            namePlaceholder="Nome da refeição"
            showErrors={showErrors}
            addLabel="Adicionar refeição"
          />

          {error && <p className="form-error">{error}</p>}

          <div className="save-bar">
            <button className="btn-primary" onClick={save} disabled={saving}>
              <CheckIcon size={18} /> {saving ? 'Salvando…' : 'Salvar plano'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
