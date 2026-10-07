import { CheckIcon, DropIcon } from './Icons';

// Moldura das telas de login/cadastro: cartões decorativos empilhados no topo
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="screen auth">
      <div className="auth-hero" aria-hidden="true">
        <div className="hero-card hero-white">
          <span className="hero-dot" />
          <div>
            <div className="hero-line w60" />
            <div className="hero-line w40" />
          </div>
          <span className="hero-check">
            <CheckIcon size={14} />
          </span>
        </div>
        <div className="hero-card hero-orange">
          <div>
            <div className="hero-time">12:30</div>
            <div className="hero-title">Almoço</div>
          </div>
          <span className="hero-btn">
            <CheckIcon size={16} />
          </span>
        </div>
        <div className="hero-water">
          <DropIcon size={16} />
          <span>1.750 ml</span>
        </div>
      </div>

      <div className="auth-body">
        <div className="logo-row">
          <span className="logo-mark">N</span>
          <span className="logo-text">Nutrio</span>
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </main>
  );
}

export function Field({ icon: Icon, label, right, ...input }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-box">
        {Icon && <Icon size={18} />}
        <input {...input} />
        {right}
      </span>
    </label>
  );
}
