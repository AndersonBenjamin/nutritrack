const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const make = (paths) =>
  function Icon({ size = 20, ...props }) {
    return (
      <svg {...base} width={size} height={size} aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  };

export const CheckIcon = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = make(<path d="M5 12h14" />);
export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
);
export const FlameIcon = make(
  <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.4-2.4-5.4-3.6-8.3-.4 2-1.5 3.2-2.7 3.6C12.6 7 11.4 4.6 9 3c.2 3.3-3.5 5.6-3.5 11.3C5.5 18.2 8.1 21 12 21z" />
);
export const DropIcon = make(<path d="M12 3.2s6 6.6 6 11.2a6 6 0 0 1-12 0C6 9.8 12 3.2 12 3.2z" />);
export const TrashIcon = make(
  <>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5" />
  </>
);
export const HomeIcon = make(
  <>
    <path d="M4 11l8-6.5 8 6.5" />
    <path d="M6 9.5V19h12V9.5" />
  </>
);
export const PlanIcon = make(
  <>
    <rect x="4.5" y="4" width="15" height="16.5" rx="3" />
    <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
  </>
);
export const LogoutIcon = make(
  <>
    <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
    <path d="M10 8l-4 4 4 4M6 12h9" />
  </>
);
export const MailIcon = make(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
    <path d="M4.5 7.5l7.5 5.5 7.5-5.5" />
  </>
);
export const LockIcon = make(
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </>
);
export const UserIcon = make(
  <>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
  </>
);
export const EyeIcon = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
export const EyeOffIcon = make(
  <>
    <path d="M4 4l16 16" />
    <path d="M9.9 6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 7.7C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
  </>
);
export const ArrowIcon = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const SparkIcon = make(
  <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />
);
