import { useState } from 'react';
import AuthLayout, { Field } from '../components/AuthLayout';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon } from '../components/Icons';

export default function Login({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Preencha e-mail e senha.');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para acompanhar suas refeições e sua hidratação de hoje."
      footer={
        <>
          Ainda não tem conta?{' '}
          <button type="button" className="link" onClick={onGoRegister}>
            Criar conta
          </button>
        </>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        <Field
          icon={MailIcon}
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          icon={LockIcon}
          label="Senha"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          right={
            <button type="button" className="icon-ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
              {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          }
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'} <ArrowIcon size={18} />
        </button>
      </form>
    </AuthLayout>
  );
}
