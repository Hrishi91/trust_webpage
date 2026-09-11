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
  document.dispatchEvent(new CustomEvent('themechange'));
}

// --- Phase 6 ("nothing static"): colour/font overrides layered on top of the chosen theme ---
// settings.designOverrides — the exact 15-key whitelist firestore.rules' validOverrideValues()
// enforces server-side; kept in sync by hand (rules cannot import this file). Most keys map
// straight to their CSS custom property name; the three that don't are spelled out below.
export const OVERRIDE_KEYS = [
  'bg', 'bg2', 'ivory', 'ivory2', 'ink', 'muted', 'sindoor', 'pitambar', 'durva', 'gold',
  'cta', 'ctaInk', 'card', 'heroAccent', 'tickerInk',
];
const KEBAB = { ctaInk: 'cta-ink', heroAccent: 'hero-accent', tickerInk: 'ticker-ink' };
const HEX = /^#[0-9a-fA-F]{6}$/;

// settings.fonts.{display,body} — the only four families the site actually loads (css/tokens.css
// preconnects/links exactly these); loading an admin-chosen arbitrary Google Font would be a new
// external-origin vector, so this list is also enforced server-side (firestore.rules validFontValues()).
export const FONTS = ['Baloo Da 2', 'Hind Siliguri', 'Tiro Bangla', 'Atma'];
const FONT_STACK = {
  display: name => `"${name}", "Hind Siliguri", sans-serif`,
  body: name => `"${name}", "Noto Sans Bengali", system-ui, sans-serif`,
};

/**
 * Apply settings.designOverrides + settings.fonts as inline custom properties on <html>, on top
 * of whichever theme applyTheme() already stamped. Every key/value is re-validated here — even
 * though firestore.rules already enforces the same whitelist/regex on write — because nothing but
 * a validated colour literal may ever reach `style` on <html> (spec §4); an absent/invalid/unknown
 * entry simply clears that property back to the theme's own value, so a partially-filled
 * designOverrides never gets "stuck" showing a stale colour. Persists only the validated subset
 * (never the raw input) to localStorage('designOverrides') (unless persist:false, e.g. an admin
 * ?theme= preview) so the inline head-cache script in every HTML file re-applies exactly what was
 * actually accepted here — an entry that never made it onto <html> can never round-trip back in
 * on the next load either, keeping the cache in parity with this function's own whitelist.
 */
export function applyOverrides(overrides, fonts, { persist = true } = {}) {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  const validOverrides = {};
  for (const key of OVERRIDE_KEYS) {
    const v = overrides?.[key];
    const prop = `--${KEBAB[key] || key}`;
    if (typeof v === 'string' && HEX.test(v)) { style.setProperty(prop, v); validOverrides[key] = v; }
    else style.removeProperty(prop);
  }
  const validFonts = { display: '', body: '' };
  for (const slot of ['display', 'body']) {
    const name = fonts?.[slot];
    if (typeof name === 'string' && FONTS.includes(name)) { style.setProperty(`--${slot}`, FONT_STACK[slot](name)); validFonts[slot] = name; }
    else style.removeProperty(`--${slot}`);
  }
  if (persist) {
    try { localStorage.setItem('designOverrides', JSON.stringify({ overrides: validOverrides, fonts: validFonts })); }
    catch { /* private mode */ }
  }
}

/** Reset every override/font custom property to the theme's own value and drop the cache. */
export function clearOverrides() {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  for (const key of OVERRIDE_KEYS) style.removeProperty(`--${KEBAB[key] || key}`);
  style.removeProperty('--display'); style.removeProperty('--body');
  try { localStorage.removeItem('designOverrides'); } catch { /* private mode */ }
}
