import { useState } from 'react';
import AuthLayout, { Field } from '../components/AuthLayout';
import { MailIcon, LockIcon, UserIcon, ArrowIcon } from '../components/Icons';

export default function Register({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Informe um e-mail válido.');
    if (form.password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await onRegister(form);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Monte seu plano alimentar e marque cada refeição ao longo do dia."
      footer={
        <>
          Já tem conta?{' '}
          <button type="button" className="link" onClick={onGoLogin}>
            Entrar
          </button>
        </>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        <Field icon={UserIcon} label="Nome" autoComplete="name" placeholder="Seu nome" value={form.name} onChange={set('name')} />
        <Field icon={MailIcon} label="E-mail" type="email" autoComplete="email" placeholder="voce@email.com" value={form.email} onChange={set('email')} />
        <Field icon={LockIcon} label="Senha" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} />
        <Field icon={LockIcon} label="Confirmar senha" type="password" autoComplete="new-password" placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')} />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Criando…' : 'Criar conta'} <ArrowIcon size={18} />
        </button>
      </form>
    </AuthLayout>
  );
}
