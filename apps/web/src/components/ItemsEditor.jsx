import { uid } from '../lib/utils';
import { PlusIcon, TrashIcon } from './Icons';

const UNITS = {
  meal: ['g', 'ml', 'un', 'fatia', 'colher', 'xícara', 'copo', 'porção', 'prato'],
  med: ['cápsula', 'comprimido', 'gota', 'ml', 'mg', 'sachê', 'colher'],
};
const MACROS = [
  ['proteinG', 'Proteína', 'g prot.'],
  ['carbsG', 'Carbo', 'g carb.'],
  ['fatG', 'Gordura', 'g gord.'],
];
const NUMERIC = ['quantity', 'kcal', 'proteinG', 'carbsG', 'fatG'];

const str = (v) => (v == null ? '' : String(v).replace('.', ','));
const num = (v) => {
  const n = Number(String(v).trim().replace(',', '.'));
  return String(v).trim() === '' || !Number.isFinite(n) ? null : n;
};

/** Itens da API -> estado editável (números viram texto para os inputs). */
export const toEditItems = (items = []) =>
  items.map((i) => ({
    key: uid(),
    name: i.name,
    unit: i.unit || '',
    ...Object.fromEntries(NUMERIC.map((k) => [k, str(i[k])])),
    showMacros: MACROS.some(([k]) => i[k] != null),
  }));

export const emptyItem = () => ({ key: uid(), name: '', quantity: '', unit: '', kcal: '', proteinG: '', carbsG: '', fatG: '', showMacros: false });

const hasValues = (i) => i.unit.trim() !== '' || NUMERIC.some((k) => i[k].trim() !== '');
/** Linha com quantidade/unidade/kcal preenchidos, mas sem o nome do item. */
export const needsName = (i) => !i.name.trim() && hasValues(i);

/** Estado editável -> payload da API. Linhas totalmente vazias são descartadas. */
export function fromEditItems(items, { where, variant = 'meal' } = {}) {
  const filled = items.filter((i) => i.name.trim() || hasValues(i));
  if (filled.some(needsName)) {
    const what = variant === 'med' ? 'o nome do remédio ou vitamina' : 'o nome do alimento';
    throw new Error(`${where ? `Em "${where}", preencha` : 'Preencha'} ${what} no campo destacado.`);
  }
  if (filled.some((i) => NUMERIC.some((k) => i[k] !== '' && (num(i[k]) === null || num(i[k]) < 0)))) {
    throw new Error('Confira os números: use apenas valores positivos.');
  }
  return filled.map((i) => ({
    name: i.name.trim(),
    unit: i.unit.trim() || null,
    ...Object.fromEntries(NUMERIC.map((k) => [k, num(i[k])])),
  }));
}

/** Campo numérico com a unidade visível depois do valor (ex.: 150 kcal). */
function NumField({ suffix, label, value, onChange }) {
  return (
    <label className={`num-field ${value !== '' ? 'filled' : ''}`}>
      <input inputMode="decimal" placeholder={label} value={value} onChange={onChange} aria-label={label} />
      {value !== '' && <span>{suffix}</span>}
    </label>
  );
}

export default function ItemsEditor({ items, onChange, variant = 'meal', showErrors = false }) {
  const isMeal = variant === 'meal';
  const update = (key, field, value) => onChange(items.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  const listId = `units-${variant}`;

  return (
    <div className="items-editor">
      <datalist id={listId}>
        {UNITS[variant].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {items.map((it) => (
        <div className="item-row" key={it.key}>
          <div className="item-line">
            <input
              className={`item-name ${showErrors && needsName(it) ? 'invalid' : ''}`}
              placeholder={isMeal ? 'Alimento' : 'Remédio ou vitamina'}
              value={it.name}
              onChange={(e) => update(it.key, 'name', e.target.value)}
              aria-label="Nome do item"
            />
            <button
              type="button"
              className="icon-ghost danger"
              onClick={() => onChange(items.filter((i) => i.key !== it.key))}
              aria-label={`Remover ${it.name || 'item'}`}
            >
              <TrashIcon size={16} />
            </button>
          </div>

          <div className={`item-fields ${isMeal ? 'three' : ''}`}>
            <input
              inputMode="decimal"
              placeholder="Qtd"
              value={it.quantity}
              onChange={(e) => update(it.key, 'quantity', e.target.value)}
              aria-label="Quantidade"
            />
            <input
              list={listId}
              placeholder="Unidade"
              value={it.unit}
              onChange={(e) => update(it.key, 'unit', e.target.value)}
              aria-label="Unidade"
            />
            {isMeal && (
              <NumField suffix="kcal" label="kcal" value={it.kcal} onChange={(e) => update(it.key, 'kcal', e.target.value)} />
            )}
          </div>

          {isMeal &&
            (it.showMacros ? (
              <div className="item-fields three">
                {MACROS.map(([k, label, suffix]) => (
                  <NumField key={k} suffix={suffix} label={label} value={it[k]} onChange={(e) => update(it.key, k, e.target.value)} />
                ))}
              </div>
            ) : (
              <button type="button" className="link small macro-toggle" onClick={() => update(it.key, 'showMacros', true)}>
                + Proteína, carbo e gordura
              </button>
            ))}
        </div>
      ))}

      <button type="button" className="add-item" onClick={() => onChange([...items, emptyItem()])}>
        <PlusIcon size={16} /> Adicionar item
      </button>
    </div>
  );
}
