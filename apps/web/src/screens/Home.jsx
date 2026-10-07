import DayView from '../components/DayView';
import { LogoutIcon } from '../components/Icons';
import { formatDay, todayKey } from '../lib/utils';

export default function Home({ user, onLogout, onEditPlan, onEditMeds }) {
  const firstName = user.name.split(' ')[0];
  const today = todayKey();

  return (
    <main className="screen home">
      <header className="topbar">
        <span className="avatar">{firstName[0]?.toUpperCase()}</span>
        <button className="pill-btn" onClick={onLogout}>
          <LogoutIcon size={16} /> Sair
        </button>
      </header>

      <div className="greeting">
        <h1>Olá, {firstName}</h1>
        <p className="date">{formatDay(today)}</p>
      </div>

      <DayView date={today} isToday onEditPlan={onEditPlan} onEditMeds={onEditMeds} />
    </main>
  );
}
