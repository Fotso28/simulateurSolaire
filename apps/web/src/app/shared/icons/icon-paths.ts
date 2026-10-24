/**
 * Jeu d'icônes au trait : grille 24 px, trait 1,5 px, couleur `currentColor`.
 * Chaque icône est une liste de tracés `d` (les cercles sont écrits en arcs),
 * rendus par `<app-icon>` sans `innerHTML`.
 */

/** Cercle (cx, cy, r) écrit en tracé SVG. */
function c(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

export const ICON_PATHS = {
  // ——— Interface ———
  sun: [
    c(12, 12, 4),
    'M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  ],
  'arrow-right': ['M5 12h14M13 6l6 6-6 6'],
  'arrow-left': ['M19 12H5M11 6l-6 6 6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-up': ['M6 15l6-6 6 6'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  clock: [c(12, 12, 8.5), 'M12 7.5V12l3 2'],
  info: [c(12, 12, 8.5), 'M12 11v5.5M12 7.8v.2'],
  pin: [
    'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z',
    c(12, 10, 2.3),
  ],
  'alert-triangle': [
    'M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z',
    'M12 9.5v4M12 16.8v.2',
  ],
  'alert-octagon': [
    'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z',
    'M12 8v5M12 16v.2',
  ],
  'check-circle': [c(12, 12, 8.5), 'M8.5 12.3l2.4 2.4 4.6-4.9'],
  reset: ['M4 12a8 8 0 1 0 2.4-5.7', 'M4 4v4.5h4.5'],
  sliders: ['M4 7h9M17 7h3M4 17h3M11 17h9', c(15, 7, 2), c(9, 17, 2)],
  share: [
    c(6, 12, 2.5),
    c(18, 6, 2.5),
    c(18, 18, 2.5),
    'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6',
  ],
  download: ['M12 4v11M7 10.5l5 5 5-5M5 19.5h14'],
  phone: [
    'M5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z',
  ],
  home: ['M4 11l8-6.5 8 6.5', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
  briefcase: [
    'M3.5 8.5h17v11h-17z',
    'M9 8.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2.5',
    'M3.5 13h17',
  ],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  trash: ['M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13'],

  // ——— Catégories ———
  bulb: [
    'M9 17.5h6M10 20.5h4',
    'M8.5 14.5a6 6 0 1 1 7 0c-.6.5-1 1.2-1 2v1h-5v-1c0-.8-.4-1.5-1-2z',
  ],
  snow: [
    'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
    'M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5',
  ],
  fan: [
    c(12, 11, 1.5),
    'M12 9.5C11 6.5 11.5 4 13.5 3.5s2.5 2.5-1.5 6',
    'M13.3 11.8c3 .8 4.8 2.6 4 4.5s-3.4 1-5.3-3',
    'M10.7 11.8c-3.1.7-5.3-.2-5.1-2.3s3.1-2.2 5.1.8',
    'M12 12.5V20M8.5 20.5h7',
  ],
  tv: ['M3 5.5h18v11.5H3z', 'M8 20.5h8M12 17v3.5'],
  laptop: ['M5 6h14v9.5H5z', 'M2.5 18.5h19l-1.5-3h-16z'],
  plug: [
    'M9 3v4.5M15 3v4.5',
    'M6.5 7.5h11v3.5a5.5 5.5 0 0 1-11 0z',
    'M12 16.5V21',
  ],
  drop: [
    'M12 3.5s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z',
    'M9 15a3 3 0 0 0 3 3',
  ],
  scissors: [
    c(6.5, 17.5, 2.5),
    c(17.5, 17.5, 2.5),
    'M8.4 15.8 18 4M15.6 15.8 6 4',
  ],
  other: ['M4 4h16v16H4z', 'M12 8.5v7M8.5 12h7'],

  // ——— Appareils ———
  tube: [
    'M3 10.5h18v3H3z',
    'M5 10.5v-2M19 10.5v-2M8 16.5l-1 2M12 16.5v2.5M16 16.5l1 2',
  ],
  flood: [
    'M4 6.5h10v8H4z',
    'M14 9h2.5M14 12h2.5',
    'M18.5 7.5 21 6M18.5 10.5H21.5M18.5 13.5 21 15',
    'M9 14.5v3.5M6 20.5h6',
  ],
  fridge: ['M6 2.5h12v19H6z', 'M6 9.5h12', 'M9 5.5v2M9 12.5v3'],
  freezer: ['M3 8.5h18v11H3z', 'M3 11.5h18', 'M10 14h4'],
  showcase: [
    'M4 3.5h16v17H4z',
    'M6.5 6h11v9.5h-11z',
    'M6.5 10.5h11',
    'M8 18h2',
  ],
  fountain: [
    'M8 3.5h8l-1 5H9z',
    'M7 8.5h10v12H7z',
    'M10.5 12.5h3M12 12.5v2',
    'M9.5 18h5',
  ],
  ac: [
    'M2.5 6h19v7.5h-19z',
    'M5.5 11h13',
    'M7 16.5l-1 3M12 16.5v3.5M17 16.5l1 3',
  ],
  decoder: [
    'M3 8.5h18v7H3z',
    'M6 12h3',
    c(16, 12, 1.2),
    'M5.5 15.5v2M18.5 15.5v2',
  ],
  hifi: [
    'M3 7h5.5v12H3zM15.5 7H21v12h-5.5z',
    c(5.75, 15, 1.6),
    c(18.25, 15, 1.6),
    'M10 10h4v6h-4z',
  ],
  speaker: ['M6 2.5h12v19H6z', c(12, 15, 3.5), c(12, 7, 1.5)],
  desktop: ['M3 4h18v12H3z', 'M9 20.5h6M12 16v4.5'],
  printer: [
    'M7 3.5h10v5H7z',
    'M4 8.5h16v8H4z',
    'M7 13.5h10v7H7z',
    'M16.5 11h.5',
  ],
  router: [
    'M3.5 13.5h17v5h-17z',
    'M7 16h.5M10 16h.5',
    'M16 13.5V10',
    'M13.3 7.5a4 4 0 0 1 5.4 0M11.4 5.4a7 7 0 0 1 9.2 0',
  ],
  charger: ['M7.5 2.5h9v19h-9z', 'M10.5 18.5h3', 'M12.5 7.5l-2 3.5h3l-2 3.5'],
  camera: [
    'M3.5 7.5h12.5l3 3-3 3H3.5z',
    c(9, 10.5, 1.5),
    'M6 13.5 7.5 17h-4M3.5 15v4',
  ],
  iron: [
    'M3 17.5h16l1-4.5a5 5 0 0 0-5-4H8.5L3 17.5z',
    'M8.5 9 9.5 6H18',
    'M8 13.5h.5M11.5 13.5h.5',
  ],
  washer: [
    'M4.5 2.5h15v19h-15z',
    'M4.5 6.5h15',
    c(12, 13.5, 4),
    'M7.5 4.5h1M15 4.5h1.5',
  ],
  blender: [
    'M8 3.5h8l-1.2 10.5H9.2z',
    'M7 14h10l1 6.5H6z',
    c(12, 17.5, 1),
    'M16 6.5h2.5v4H15.5',
  ],
  microwave: [
    'M2.5 5.5h19v13h-19z',
    'M5.5 8.5h9.5v7H5.5z',
    'M18 8.5v.5M18 11.5v.5M18 14.5v1',
  ],
  kettle: [
    'M7 20.5h10l-.7-10.5H7.7z',
    'M8 10a4 4 0 0 1 8 0',
    'M16.3 12h1.7a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1.5',
    'M7.4 13 4.5 10',
  ],
  heater: [
    'M7 2.5h10v16H7z',
    c(12, 8, 2.5),
    'M10 14h4',
    'M10 18.5v3M14 18.5v3',
  ],
  pump: [
    c(9, 13, 5),
    c(9, 13, 1.5),
    'M14 11h6.5v4H14',
    'M9 8V4.5h4',
    'M4.5 20.5h9',
  ],
  clipper: [
    'M8 2.5h8v4H8z',
    'M8.5 6.5h7l-1 15h-5z',
    'M10 4.5h.5M12 4.5h.5M14 4.5h.5',
    'M11 12h2',
  ],
  hairdryer: [
    'M4 8.5a5 5 0 0 1 5-5h11.5v8H9a5 5 0 0 1-5-3z',
    c(9, 7.5, 1.5),
    'M10 11.5l1.5 9h3l-1.5-9',
    'M20.5 5.5H22M20.5 9.5H22',
  ],

  // ——— Matériel solaire ———
  panel: [
    'M5 4h14l2.5 12h-19z',
    'M3.8 10h16.4M10 4l-.8 12M14 4l.8 12',
    'M12 16v4.5M8.5 20.5h7',
  ],
  battery: [
    'M3 7.5h16.5v10H3z',
    'M19.5 10.5H21v4h-1.5',
    'M6.5 12.5h3M8 11v3M13 12.5h3',
  ],
  inverter: [
    'M4 3.5h16v17H4z',
    'M7 9.5c1-1.5 2-1.5 3 0s2 1.5 3 0',
    'M7 15h6M7 17h6',
    'M16.5 8v.5M16.5 15v2',
  ],
  controller: [
    'M4.5 3.5h15v17h-15z',
    'M7.5 6.5h9v5h-9z',
    'M8 15.5h.5M12 15.5h.5M16 15.5h.5',
    'M9 9.5l1.5-1.5 1.5 1.5L15 7.5',
  ],
  cable: [
    'M5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h7A3.5 3.5 0 0 1 19 15.5v5',
    'M3 3.5h4M17 20.5h4',
  ],
  protection: [
    'M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z',
    'M12.8 7.5 10 12.5h4l-2.8 5',
  ],
  board: ['M4 3.5h16v17H4z', 'M7.5 7h2.5v4H7.5zM14 7h2.5v4H14z', 'M7.5 15.5h9'],
} satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;

/** `iconKey` (appareil ou catégorie du catalogue) → glyphe. */
const ICON_ALIASES: Record<string, IconName> = {
  // catégories
  lighting: 'bulb',
  cooling: 'snow',
  ventilation: 'fan',
  audiovisual: 'tv',
  office: 'laptop',
  appliances: 'plug',
  pumping: 'drop',
  business: 'scissors',
  // appareils
  'led-bulb': 'bulb',
  'cfl-bulb': 'bulb',
  'incandescent-bulb': 'bulb',
  'led-tube': 'tube',
  'neon-tube': 'tube',
  'led-floodlight': 'flood',
  'fridge-freezer': 'fridge',
  'chest-freezer': 'freezer',
  'bar-freezer': 'showcase',
  'water-cooler': 'fountain',
  'ac-1hp': 'ac',
  'ac-1-5hp': 'ac',
  'ac-2hp': 'ac',
  'tv-32': 'tv',
  'tv-43-55': 'tv',
  'tv-decoder': 'decoder',
  'sound-system': 'speaker',
  'desktop-pc': 'desktop',
  'laser-printer': 'printer',
  'wifi-router': 'router',
  'phone-charger': 'charger',
  cctv: 'camera',
  'washing-machine': 'washer',
  'water-heater': 'heater',
  'surface-pump': 'pump',
  'submersible-pump': 'pump',
  'hair-clipper': 'clipper',
  'hair-dryer': 'hairdryer',
};

/** Résout une clé d'icône du catalogue ; repli sur `plug` si inconnue. */
export function resolveIcon(key: string | null | undefined): IconName {
  if (!key) return 'plug';
  if (key in ICON_PATHS) return key as IconName;
  return ICON_ALIASES[key] ?? 'plug';
}
