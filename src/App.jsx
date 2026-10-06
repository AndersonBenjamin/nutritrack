import { useEffect, useState } from 'react';
import { loadDB, saveDB, hashPassword, todayKey, defaultPlan } from './lib/store';
import Login from './screens/Login';
import Register from './screens/Register';
import Home from './screens/Home';
import Plan from './screens/Plan';
import BottomNav from './components/BottomNav';

const emptyLog = { meals: [], water: 0 };

export default function App() {
  const [db, setDb] = useState(loadDB);
  const [authView, setAuthView] = useState('login');
  const [tab, setTab] = useState('home');

  useEffect(() => saveDB(db), [db]);
  useEffect(() => window.scrollTo(0, 0), [tab, authView, db.session]);

  const user = db.session ? db.users[db.session] : null;

  const updateUser = (fn) =>
    setDb((d) => ({ ...d, users: { ...d.users, [d.session]: fn(d.users[d.session]) } }));

  async function login(email, password) {
    const key = email.trim().toLowerCase();
    const u = db.users[key];
    if (!u) throw new Error('Não encontramos uma conta com esse e-mail.');
    if ((await hashPassword(password)) !== u.password) throw new Error('Senha incorreta.');
    setTab('home');
    setDb((d) => ({ ...d, session: key }));
  }

  async function register({ name, email, password }) {
    const key = email.trim().toLowerCase();
    if (db.users[key]) throw new Error('Já existe uma conta com esse e-mail.');
    const newUser = {
      name: name.trim(),
      email: key,
      password: await hashPassword(password),
      plan: defaultPlan(),
      log: {},
      createdAt: Date.now(),
    };
    setTab('plan'); // primeiro acesso: montar o plano
    setDb((d) => ({ ...d, users: { ...d.users, [key]: newUser }, session: key }));
  }

  function logout() {
    setAuthView('login');
    setDb((d) => ({ ...d, session: null }));
  }

  if (!user) {
    return authView === 'login' ? (
      <Login onLogin={login} onGoRegister={() => setAuthView('register')} />
    ) : (
      <Register onRegister={register} onGoLogin={() => setAuthView('login')} />
    );
  }

  const day = todayKey();
  const log = { ...emptyLog, ...(user.log?.[day] || {}) };
  const setLog = (fn) =>
    updateUser((u) => ({ ...u, log: { ...u.log, [day]: fn({ ...emptyLog, ...(u.log?.[day] || {}) }) } }));

  return (
    <div className="app-shell">
      {tab === 'home' ? (
        <Home
          user={user}
          log={log}
          onToggleMeal={(id) =>
            setLog((l) => ({
              ...l,
              meals: l.meals.includes(id) ? l.meals.filter((x) => x !== id) : [...l.meals, id],
            }))
          }
          onSetWater={(ml) => setLog((l) => ({ ...l, water: Math.max(0, ml) }))}
          onLogout={logout}
          onEditPlan={() => setTab('plan')}
        />
      ) : (
        <Plan
          plan={user.plan}
          onSave={(plan) => {
            updateUser((u) => ({ ...u, plan }));
            setTab('home');
          }}
        />
      )}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
