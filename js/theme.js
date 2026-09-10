// js/theme.js — pure (no DOM at import time). Theme = one of five CSS token sets.
export const THEMES = ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh'];
export const DEFAULT_THEME = 'siddhi';
export const THEME_META = {
  siddhi:  { name: { bn: 'সিদ্ধি',   en: 'Siddhi' },  desc: { bn: 'গণেশের নিজের রং — সিঁদুর, পীতাম্বর, দূর্বা, সোনালি', en: "Ganesh's own colours — sindoor, pitambar, durva, gold" } },
  mukha:   { name: { bn: 'মুখা',     en: 'Mukha' },   desc: { bn: 'কুশমণ্ডির কাঠের মুখোশ — হলুদ, লাল, কালো', en: 'Kushmandi wooden mask — yellow, red, black' } },
  dhokra:  { name: { bn: 'ঢোকরা',    en: 'Dhokra' },  desc: { bn: 'পিতলের আলো — গাঢ় bronze, সোনালি রেখা', en: 'Brass light — deep bronze, gold lines' } },
  atreyee: { name: { bn: 'আত্রেয়ী',  en: 'Atreyee' }, desc: { bn: 'নদী ও ধান — শান্ত, হিসাব সামনে', en: 'River and paddy — calm, ledger-first' } },
  bangarh: { name: { bn: 'বাণগড়',   en: 'Bangarh' }, desc: { bn: 'পোড়ামাটির ঐতিহ্য — ইটের লাল, sandstone', en: 'Terracotta heritage — brick red, sandstone' } },
};

const queryTheme = search => {
  try { const q = new URLSearchParams(search || '').get('theme'); return THEMES.includes(q) ? q : null; }
  catch { return null; }
};
export function isPreview(search = '') { return queryTheme(search) !== null; }
/** settings.design + location.search → a whitelisted theme name. Never returns anything else. */
export function resolveTheme(design, search = '') {
  return queryTheme(search) ?? (THEMES.includes(design) ? design : DEFAULT_THEME);
}
/** Stamp <html data-theme>; persist to localStorage so the next page load paints it before Firestore answers. */
export function applyTheme(name, { persist = true } = {}) {
  if (typeof document === 'undefined') return;
  const safe = THEMES.includes(name) ? name : DEFAULT_THEME;
  document.documentElement.dataset.theme = safe;
  if (persist) { try { localStorage.setItem('design', safe); } catch { /* private mode */ } }
}
