import { useEffect, useState } from 'react';
import AuthLayout, { Field } from '../components/AuthLayout';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon } from '../components/Icons';
import { api } from '../lib/api';

// O fluxo começa no servidor (`/api/auth/oidc/start`), não no cliente: é lá que
// ficam o `state` e o PKCE. Aqui é só um link para essa rota.
const ssoHref = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `/api/auth/oidc/start?tz=${encodeURIComponent(tz)}`;
};

const loginError = {
  expirado: 'O login demorou demais. Tente de novo.',
  conflito: 'Já existe uma conta com este e-mail no Nutrio. Entre com ela por senha.',
  falhou: 'Não foi possível entrar pelo app-labs. Tente de novo.',
};

export default function Login({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api
      .config()
      .then(setConfig)
      .catch(() => setConfig({ oidcEnabled: false, localEnabled: true }));

    // Mensagem deixada pelo retorno do provedor (`/?login=...`). Lida uma vez e
    // removida da URL, para não reaparecer ao recarregar.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('login');
    if (code) {
      setError(loginError[code] ?? loginError.falhou);
      params.delete('login');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, []);

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

  const localEnabled = config?.localEnabled ?? true;

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para acompanhar suas refeições e sua hidratação de hoje."
      footer={
        localEnabled && (
          <>
            Ainda não tem conta?{' '}
            <button type="button" className="link" onClick={onGoRegister}>
              Criar conta
            </button>
          </>
        )
      }
    >
      {config?.oidcEnabled && (
        <>
          <a className="btn-primary sso-link" href={ssoHref()}>
            Entrar com app-labs
          </a>
          {localEnabled && <p className="auth-divider">ou</p>}
        </>
      )}

      {localEnabled && (
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
      )}

      {!localEnabled && error && <p className="form-error">{error}</p>}
    </AuthLayout>
  );
}
