import { useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from './lib/api';
import Login from './screens/Login';
import Register from './screens/Register';
import Home from './screens/Home';
import Plan from './screens/Plan';
import Meds from './screens/Meds';
import History from './screens/History';
import BottomNav from './components/BottomNav';

export default function App() {
  // undefined = verificando a sessão; null = deslogado
  const [user, setUser] = useState(undefined);
  const [authView, setAuthView] = useState('login');
  const [tab, setTab] = useState('home');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthView('login');
      setUser(null);
    });
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, authView, user]);

  async function login(email, password) {
    const r = await api.login(email.trim(), password);
    setTab('home');
    setUser(r.user);
  }

  async function register(form) {
    const r = await api.register({ ...form, name: form.name.trim(), email: form.email.trim() });
    setTab('plan'); // primeiro acesso: montar o plano
    setUser(r.user);
  }

  async function logout() {
    await api.logout().catch(() => {});
    setAuthView('login');
    setUser(null);
  }

  if (user === undefined) {
    return (
      <div className="splash" aria-label="Carregando">
        <span className="logo-mark">N</span>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <Login onLogin={login} onGoRegister={() => setAuthView('register')} />
    ) : (
      <Register onRegister={register} onGoLogin={() => setAuthView('login')} />
    );
  }

  const goHome = () => setTab('home');
  const nav = { onEditPlan: () => setTab('plan'), onEditMeds: () => setTab('meds') };

  return (
    <div className="app-shell">
      {tab === 'home' && <Home user={user} onLogout={logout} {...nav} />}
      {tab === 'plan' && <Plan onSaved={goHome} />}
      {tab === 'meds' && <Meds onSaved={goHome} />}
      {tab === 'history' && <History {...nav} />}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
