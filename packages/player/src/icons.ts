const svg = (paths: string): string =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  check: svg('<path d="M5 12l5 5L20 7"/>'),
  open: svg('<path d="M7 17L17 7M8 7h9v9"/>'),
  expand: svg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  seek: svg('<path d="M5 4l10 8-10 8z"/><path d="M19 5v14"/>'),
  command: svg('<path d="M4 17l6-5-6-5M12 19h8"/>'),
  code: svg('<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  file: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
  text: svg('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  mention: svg('<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.3"/>'),
  hotspot: svg('<path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/><circle cx="12" cy="12" r="2.5"/>'),
  play: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l12 8-12 8z"/></svg>`,
  pause: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  fullscreen: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
} as const;

export type IconName = keyof typeof ICONS;
