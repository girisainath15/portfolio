// Line icons in the HUD style. All use currentColor and a 24px grid.

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M16 8.6 22.4 12.3v7.4L16 23.4l-6.4-3.7v-7.4Z" fill="#0b3238" />
    <path d="M16 8.6 22.4 12.3 16 16l-6.4-3.7Z" fill="#7ff6ea" />
    <path d="M16 16 22.4 12.3v7.4L16 23.4Z" fill="#2aa79c" />
    <path d="M16 16v7.4l-6.4-3.7v-7.4Z" fill="#17707a" />
  </svg>
);

export const Cube = (p) => (
  <svg {...base} {...p}>
    <path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4Z" />
    <path d="m4 7.4 8 4.6 8-4.6M12 12v9.2" />
  </svg>
);

export const Icosa = (p) => (
  <svg {...base} {...p}>
    <path d="m12 2.5 8.3 4.8v9.4L12 21.5l-8.3-4.8V7.3Z" />
    <path d="m12 2.5-4.6 7.3h9.2Zm-4.6 7.3L3.7 16.7m3.7-6.9L12 21.5l4.6-11.7m0 0 3.7 6.9M7.4 9.8 3.7 7.3m12.9 2.5 3.7-2.5M3.7 16.7h16.6" />
  </svg>
);

export const Menu = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export const Close = (p) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Play = (p) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l10-6.5Z" />
  </svg>
);

export const Gear = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6m0 13.2v2.6M2.8 12h2.6m13.2 0h2.6M5.5 5.5l1.9 1.9m9.2 9.2 1.9 1.9m0-13-1.9 1.9m-9.2 9.2-1.9 1.9" />
  </svg>
);

export const Arrow = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </svg>
);

export const ArrowUpRight = (p) => (
  <svg {...base} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const ArrowDown = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14m-5-5 5 5 5-5" />
  </svg>
);

export const Doc = (p) => (
  <svg {...base} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);

export const Mail = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="m3.5 6 8.5 7 8.5-7" />
  </svg>
);

export const LinkedIn = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M8 10.5V17M8 7.2v.1M12 17v-3.6a2.4 2.4 0 0 1 4.8 0V17M12 10.5V17" />
  </svg>
);

export const GitHub = (p) => (
  <svg {...base} {...p}>
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);

export const Copy = (p) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="1.5" />
    <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
  </svg>
);

export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Pin = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const Send = (p) => (
  <svg {...base} {...p}>
    <path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z" />
  </svg>
);
