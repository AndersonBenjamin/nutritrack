import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { describeItem, fmt, sumBy } from '../lib/utils';
import { Field } from '../components/AuthLayout';
import { ChevronLeftIcon, CheckIcon, SparkIcon, FlameIcon, ClockIcon } from '../components/Icons';

const SEXES = [
  ['female', 'Feminino'],
  ['male', 'Masculino'],
];
const ACTIVITIES = [
  ['sedentary', 'Sedentário', 'Pouco ou nenhum exercício'],
  ['light', 'Leve', 'Exercício 1 a 3 dias por semana'],
  ['moderate', 'Moderado', 'Exercício 3 a 5 dias por semana'],
  ['intense', 'Intenso', 'Exercício 6 a 7 dias por semana'],
  ['athlete', 'Atleta', 'Treino pesado diário ou trabalho físico'],
];
const GOALS = [
  ['lose', 'Perder peso'],
  ['maintain', 'Manter o peso'],
  ['gain', 'Ganhar massa'],
];
const MEAL_COUNTS = [3, 4, 5, 6];
const RESTRICTIONS = [
  ['vegetarian', 'Vegetariano'],
  ['vegan', 'Vegano'],
  ['lactose_free', 'Sem lactose'],
  ['gluten_free', 'Sem glúten'],
  ['no_seafood', 'Sem frutos do mar'],
  ['no_pork', 'Sem carne de porco'],
];

const emptyForm = {
  sex: '',
  age: '',
  heightCm: '',
  weightKg: '',
  activity: '',
  goal: '',
  mealsPerDay: 5,
  restrictions: [],
  avoidFoods: '',
  healthCondition: null,
};

/** Soma do dia recalculada na tela depois de uma troca de refeição. */
const totalsOf = (meals) => {
  const items = meals.flatMap((m) => m.items);
  return Object.fromEntries(['kcal', 'proteinG', 'carbsG', 'fatG'].map((k) => [k, Math.round(sumBy(items, k))]));
};

const str = (v) => (v == null ? '' : String(v).replace('.', ','));
const num = (v) => Number(String(v).trim().replace(',', '.'));

/** Respostas salvas da última geração -> estado do formulário. */
const toForm = (input) => ({ ...input, age: str(input.age), heightCm: str(input.heightCm), weightKg: str(input.weightKg) });

function toPayload(f) {
  if (!f.sex) throw new Error('Informe o sexo biológico.');
  const age = num(f.age);
  const heightCm = num(f.heightCm);
  const weightKg = num(f.weightKg);
  if (!Number.isInteger(age) || age < 1) throw new Error('Informe sua idade em anos.');
  if (age < 18) throw new Error('A geração de dieta é apenas para maiores de 18 anos.');
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) throw new Error('Informe a altura em centímetros (ex.: 170).');
  if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 300) throw new Error('Informe o peso em quilos (ex.: 72,5).');
  if (!f.activity) throw new Error('Escolha seu nível de atividade física.');
  if (!f.goal) throw new Error('Escolha o objetivo da dieta.');
  if (f.healthCondition === null) throw new Error('Responda a pergunta sobre saúde.');
  return { ...f, age, heightCm, weightKg, avoidFoods: f.avoidFoods.trim() };
}

function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map(([id, label]) => (
        <button key={id} type="button" className={`chip ${value === id ? 'on' : ''}`} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AiDiet({ onBack, onApplied }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState('form'); // form | generating | preview
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [swap, setSwap] = useState(null); // { index, request, loading } da refeição sendo trocada
  const [swapError, setSwapError] = useState('');

  useEffect(() => {
    api
      .aiDietStatus()
      .then((s) => {
        setStatus(s);
        if (s.lastInput) setForm(toForm(s.lastInput));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRestriction = (id) =>
    setForm((f) => ({ ...f, restrictions: f.restrictions.includes(id) ? f.restrictions.filter((r) => r !== id) : [...f.restrictions, id] }));

  async function generate() {
    setError('');
    let payload;
    try {
      payload = toPayload(form);
    } catch (e) {
      return setError(e.message);
    }
    setStep('generating');
    try {
      const r = await api.generateDiet(payload);
      setResult(r);
      setSwap(null);
      setStatus((s) => ({ ...s, remaining: r.remaining }));
      setStep('preview');
    } catch (e) {
      setError(e.message);
      setStep('form');
    }
  }

  function openSwap(index) {
    setSwapError('');
    setSwap({ index, request: '', loading: false });
  }

  async function doSwap() {
    const { index, request } = swap;
    setSwapError('');
    setSwap((s) => ({ ...s, loading: true }));
    try {
      const r = await api.swapMeal({ generationId: result.generationId, meals: result.meals, index, request: request.trim() });
      setResult((prev) => {
        const meals = prev.meals.map((m, i) => (i === index ? r.meal : m));
        return { ...prev, meals, totals: totalsOf(meals), swapsLeft: r.swapsLeft };
      });
      setSwap(null);
    } catch (e) {
      // 429 = limite de trocas desta dieta atingido
      if (e.status === 429) {
        setResult((prev) => ({ ...prev, swapsLeft: 0 }));
        setSwap(null);
        setError(e.message);
      } else {
        setSwapError(e.message);
        setSwap((s) => s && { ...s, loading: false });
      }
    }
  }

  async function apply() {
    setError('');
    setSaving(true);
    try {
      await api.saveRoutines('meals', result.meals);
      onApplied();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  const header = (title, subtitle, back) => (
    <>
      <header className="topbar">
        <button className="pill-btn ghost" onClick={back}>
          <ChevronLeftIcon size={16} /> Voltar
        </button>
      </header>
      <div className="greeting">
        <h1>{title}</h1>
        <p className="date">{subtitle}</p>
      </div>
    </>
  );

  if (step === 'generating') {
    return (
      <main className="screen ai-diet">
        <div className="ai-loading" role="status">
          <span className="ai-orb">
            <SparkIcon size={28} />
          </span>
          <strong>Montando sua dieta…</strong>
          <p className="muted">Calculando as metas e escolhendo os alimentos. Isso pode levar até um minuto.</p>
        </div>
      </main>
    );
  }

  if (step === 'preview' && result) {
    const { targets, totals, meals, swapsLeft } = result;
    const busy = saving || Boolean(swap?.loading);
    return (
      <main className="screen ai-diet">
        {header('Sua dieta', 'Confira o cardápio antes de usar.', () => setStep('form'))}

        <section className="panel">
          <span className="eyebrow">Total do dia · meta</span>
          <strong className="big">
            {fmt(totals.kcal)} <span className="muted">/ {fmt(targets.kcal)} kcal</span>
          </strong>
          <div className="macro-grid">
            {[
              ['Proteína', totals.proteinG, targets.proteinG],
              ['Carbo', totals.carbsG, targets.carbsG],
              ['Gordura', totals.fatG, targets.fatG],
            ].map(([label, total, target]) => (
              <div key={label}>
                <span className="field-label">{label}</span>
                <strong>{fmt(total)} g</strong>
                <small className="muted">meta {fmt(target)} g</small>
              </div>
            ))}
          </div>
          <p className="water-hint">
            Gasto estimado: <strong>{fmt(targets.tdee)} kcal/dia</strong> (metabolismo basal de {fmt(targets.bmr)} kcal)
          </p>
        </section>

        <div className="section-head">
          <h2>Refeições</h2>
          <span className="muted">{meals.length}</span>
        </div>

        {swapsLeft > 0 ? (
          <p className="ai-note top">
            Não gostou de alguma refeição? Você pode trocar {swapsLeft === 1 ? 'mais 1 vez' : `até ${swapsLeft} vezes`} nesta dieta.
          </p>
        ) : (
          <p className="ai-note top warn">
            Você já usou as 3 trocas desta dieta. Se quiser mudar mais alguma coisa, use a dieta e ajuste as refeições manualmente na tela Plano.
          </p>
        )}

        <div className="edit-list">
          {meals.map((m, idx) => (
            <article key={m.time} className="edit-card ai-meal">
              <div className="ai-meal-head">
                <strong>{m.name}</strong>
                <span className="mini-field readonly">
                  <ClockIcon size={15} /> {m.time}
                </span>
                <span className="mini-field readonly">
                  <FlameIcon size={15} /> {fmt(sumBy(m.items, 'kcal'))} kcal
                </span>
              </div>
              <ul className="ai-items">
                {m.items.map((it, i) => (
                  <li key={i}>
                    <span>{describeItem(it)}</span>
                    <span className="muted">{fmt(it.kcal)} kcal</span>
                  </li>
                ))}
              </ul>

              {swap?.index === idx ? (
                <div className="ai-swap">
                  <Field
                    label="O que você quer mudar? (opcional)"
                    placeholder="Ex.: sem ovo, algo mais rápido"
                    maxLength={120}
                    value={swap.request}
                    disabled={swap.loading}
                    onChange={(e) => setSwap((s) => ({ ...s, request: e.target.value }))}
                  />
                  {swapError && <p className="form-error">{swapError}</p>}
                  <div className="ai-swap-actions">
                    <button className="btn-secondary" onClick={() => setSwap(null)} disabled={swap.loading}>
                      Cancelar
                    </button>
                    <button className="btn-primary compact" onClick={doSwap} disabled={swap.loading}>
                      <SparkIcon size={16} /> {swap.loading ? 'Trocando…' : 'Trocar'}
                    </button>
                  </div>
                </div>
              ) : (
                swapsLeft > 0 && (
                  <button className="link small ai-swap-btn" onClick={() => openSwap(idx)} disabled={busy}>
                    <SparkIcon size={14} /> Trocar refeição
                  </button>
                )
              )}
            </article>
          ))}
        </div>

        <p className="ai-note">
          Ao usar esta dieta, as refeições atuais do seu plano são substituídas. O histórico dos dias anteriores não muda, e você pode
          ajustar qualquer item depois na tela Plano.
        </p>

        {error && <p className="form-error">{error}</p>}

        <div className="save-bar ai-actions">
          <button className="btn-primary" onClick={apply} disabled={busy}>
            <CheckIcon size={18} /> {saving ? 'Salvando…' : 'Usar esta dieta'}
          </button>
          <button className="btn-secondary" onClick={generate} disabled={busy || status?.remaining === 0}>
            <SparkIcon size={18} /> Gerar outra
            {status && <span className="muted"> · restam {status.remaining}</span>}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen ai-diet">
      {header('Dieta com IA', 'Responda algumas perguntas e receba um cardápio pronto para o seu plano.', onBack)}

      {!status ? (
        error ? <p className="form-error">{error}</p> : <div className="loading">Carregando…</div>
      ) : !status.enabled ? (
        <p className="form-error">A geração de dieta com IA ainda não foi configurada neste servidor.</p>
      ) : (
        <>
          <section className="panel">
            <span className="field-label">Sexo biológico (usado no cálculo do gasto calórico)</span>
            <Chips options={SEXES} value={form.sex} onChange={set('sex')} />

            <div className="ai-numbers">
              <Field label="Idade" inputMode="numeric" placeholder="anos" value={form.age} onChange={(e) => set('age')(e.target.value)} />
              <Field label="Altura" inputMode="decimal" placeholder="cm" value={form.heightCm} onChange={(e) => set('heightCm')(e.target.value)} />
              <Field label="Peso" inputMode="decimal" placeholder="kg" value={form.weightKg} onChange={(e) => set('weightKg')(e.target.value)} />
            </div>

            <span className="field-label">Nível de atividade física</span>
            <Chips options={ACTIVITIES} value={form.activity} onChange={set('activity')} />
            {form.activity && <p className="water-hint">{ACTIVITIES.find(([id]) => id === form.activity)[2]}</p>}

            <span className="field-label">Objetivo</span>
            <Chips options={GOALS} value={form.goal} onChange={set('goal')} />

            <span className="field-label">Refeições por dia</span>
            <Chips options={MEAL_COUNTS.map((n) => [n, String(n)])} value={form.mealsPerDay} onChange={set('mealsPerDay')} />
          </section>

          <section className="panel">
            <span className="field-label">Restrições alimentares</span>
            <div className="chips">
              {RESTRICTIONS.map(([id, label]) => (
                <button key={id} type="button" className={`chip ${form.restrictions.includes(id) ? 'on' : ''}`} onClick={() => toggleRestriction(id)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="ai-avoid">
              <Field
                label="Alimentos que você não come (opcional)"
                placeholder="Ex.: fígado, beterraba, pimentão"
                maxLength={200}
                value={form.avoidFoods}
                onChange={(e) => set('avoidFoods')(e.target.value)}
              />
            </div>

            <span className="field-label">Você está gestante ou amamentando, ou tem alguma condição de saúde que exige dieta específica (ex.: diabetes, doença renal)?</span>
            <Chips
              options={[
                [false, 'Não'],
                [true, 'Sim'],
              ]}
              value={form.healthCondition}
              onChange={set('healthCondition')}
            />
            {form.healthCondition && (
              <p className="water-hint">Nesses casos, o plano precisa ser feito por um nutricionista ou médico. A IA não vai gerar a dieta.</p>
            )}
          </section>

          <p className="ai-note">
            O cardápio é uma sugestão gerada por inteligência artificial a partir das metas calculadas pelo app. Ele não substitui a
            orientação de um nutricionista.
          </p>

          {error && <p className="form-error">{error}</p>}

          <div className="save-bar">
            <button className="btn-primary" onClick={generate} disabled={status.remaining === 0 || form.healthCondition === true}>
              <SparkIcon size={18} /> Gerar dieta
            </button>
            <p className="water-hint center">
              {status.remaining === 0
                ? `Você usou as ${status.dailyLimit} gerações das últimas 24 horas.`
                : `Restam ${status.remaining} de ${status.dailyLimit} gerações nas últimas 24 horas.`}
            </p>
          </div>
        </>
      )}
    </main>
  );
}
