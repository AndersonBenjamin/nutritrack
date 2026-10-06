import { HomeIcon, PlanIcon } from './Icons';

export default function BottomNav({ tab, onChange }) {
  const items = [
    { id: 'home', label: 'Hoje', Icon: HomeIcon },
    { id: 'plan', label: 'Plano', Icon: PlanIcon },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-btn ${tab === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={tab === id ? 'page' : undefined}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
