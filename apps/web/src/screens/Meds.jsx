import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import RoutineEditor, { fromEditRoutines, toEditRoutines } from '../components/RoutineEditor';
import { CheckIcon } from '../components/Icons';

export default function Meds({ onSaved }) {
  const [meds, setMeds] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    api
      .routines('medications')
      .then((r) => setMeds(toEditRoutines(r.routines)))
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    setError('');
    try {
      const payload = fromEditRoutines(meds, 'horários', 'med');
      setSaving(true);
      await api.saveRoutines('medications', payload);
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
        <h1>Remédios</h1>
        <p className="date">Cadastre seus remédios e vitaminas por horário. No dia, é só marcar quando tomar.</p>
      </div>

      {!meds ? (
        error ? <p className="form-error">{error}</p> : <div className="loading">Carregando…</div>
      ) : (
        <>
          <div className="section-head">
            <h2>Horários</h2>
            <span className="muted">{meds.length}</span>
          </div>

          <RoutineEditor
            routines={meds}
            onChange={setMeds}
            variant="med"
            namePlaceholder="Ex.: Manhã, Após o almoço"
            showErrors={showErrors}
            addLabel="Adicionar horário"
          />

          {error && <p className="form-error">{error}</p>}

          <div className="save-bar">
            <button className="btn-primary" onClick={save} disabled={saving}>
              <CheckIcon size={18} /> {saving ? 'Salvando…' : 'Salvar remédios'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
