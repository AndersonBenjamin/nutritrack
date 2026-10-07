import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ItemsEditor, { emptyItem, fromEditItems, toEditItems } from './ItemsEditor';
import { CheckIcon, ClockIcon, CloseIcon, TrashIcon } from './Icons';

/**
 * Painel inferior para registrar o que foi realmente consumido.
 * - Item do plano: só os itens são editáveis (vêm preenchidos com o planejado).
 * - Refeição fora do plano (freeform): também nome e horário.
 */
export default function LogSheet({ title, subtitle, initial, freeform = false, onSave, onRemove, onClose }) {
  const [name, setName] = useState(initial.name || '');
  const [time, setTime] = useState(initial.time || '');
  const [items, setItems] = useState(() => (initial.items?.length ? toEditItems(initial.items) : [emptyItem()]));
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function save() {
    setError('');
    try {
      if (freeform && !name.trim()) throw new Error('Dê um nome para a refeição.');
      if (freeform && !time) throw new Error('Informe o horário.');
      const payload = fromEditItems(items);
      onSave(freeform ? { name: name.trim(), time, items: payload } : payload);
      onClose();
    } catch (e) {
      setError(e.message);
      setShowErrors(true);
    }
  }

  // Portal no body: a animação das telas usa transform, o que prenderia o position: fixed
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <span className="eyebrow">{subtitle}</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-ghost" onClick={onClose} aria-label="Fechar">
            <CloseIcon size={20} />
          </button>
        </div>

        {freeform && (
          <div className="edit-grid sheet-fields">
            <input className="mini-input" placeholder="Nome (ex.: Pizza)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da refeição" />
            <label className="mini-field">
              <ClockIcon size={15} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Horário" />
            </label>
          </div>
        )}

        <span className="field-label sheet-label">O que você consumiu</span>
        <ItemsEditor items={items} onChange={setItems} showErrors={showErrors} />

        {error && <p className="form-error">{error}</p>}

        <div className="sheet-actions">
          {onRemove && (
            <button
              className="btn-ghost danger"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              <TrashIcon size={18} /> Remover registro
            </button>
          )}
          <button className="btn-primary" onClick={save}>
            <CheckIcon size={18} /> Salvar
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
