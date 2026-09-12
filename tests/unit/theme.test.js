import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  THEMES, DEFAULT_THEME, THEME_META, resolveTheme, isPreview, applyTheme,
  OVERRIDE_KEYS, FONTS, applyOverrides, clearOverrides,
} from '../../js/theme.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const HTML_FILES = [
  'about.html', 'committee.html', 'donate.html', 'events.html', 'gallery.html',
  'index.html', 'members.html', 'transparency.html', 'admin/index.html',
  // Phase 7 Task 1
  '404.html', 'privacy.html', 'trust.html', 'contact.html', 'faq.html', 'news.html', 'downloads.html',
];
// Fix round 1, finding 1: the inline head-cache script (identical in all 9 HTML files) must
// gate a cached designOverrides key on the same shape OVERRIDE_KEYS itself satisfies — the old
// /^[a-zA-Z]+$/ silently dropped any key with a digit in it (bg2, ivory2), so those two colours
// never re-applied before Firestore answered on the next page load.
const HEAD_CACHE_KEY_REGEX_SRC = '/^[a-zA-Z][a-zA-Z0-9]*$/';

test('OVERRIDE_KEYS all satisfy the inline head-cache script\'s key regex, and every HTML file uses that exact regex source', () => {
  for (const key of OVERRIDE_KEYS) {
    assert.match(key, /^[a-zA-Z][a-zA-Z0-9]*$/, `${key} must satisfy the head-cache key regex`);
  }
  for (const file of HTML_FILES) {
    const html = readFileSync(root + file, 'utf8');
    assert.ok(html.includes(HEAD_CACHE_KEY_REGEX_SRC), `${file} inline head-cache script must contain ${HEAD_CACHE_KEY_REGEX_SRC}`);
  }
});

test('the inline head-cache script is byte-identical across all 16 HTML files', () => {
  const extract = html => {
    const m = html.match(/<script>try\{var d=localStorage[^<]*<\/script>/);
    assert.ok(m, 'head-cache script not found');
    return m[0];
  };
  const scripts = HTML_FILES.map(file => extract(readFileSync(root + file, 'utf8')));
  for (let i = 1; i < scripts.length; i++) {
    assert.equal(scripts[i], scripts[0], `${HTML_FILES[i]} head-cache script differs from ${HTML_FILES[0]}`);
  }
});

test('five themes, siddhi default, every theme has bn+en meta', () => {
  assert.deepEqual(THEMES, ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh']);
  assert.equal(DEFAULT_THEME, 'siddhi');
  for (const n of THEMES) { assert.ok(THEME_META[n].name.bn && THEME_META[n].name.en && THEME_META[n].desc.bn && THEME_META[n].desc.en, n); }
});
test('resolveTheme: stored value wins when valid', () => assert.equal(resolveTheme('mukha'), 'mukha'));
test('resolveTheme: unknown/absent stored value falls back to siddhi', () => {
  assert.equal(resolveTheme(undefined), 'siddhi');
  assert.equal(resolveTheme('evil'), 'siddhi');
  assert.equal(resolveTheme({ bn: 'x' }), 'siddhi'); // someone passing settings.theme by mistake
});
test('resolveTheme: ?theme= query overrides a valid stored value, but only with a whitelisted name', () => {
  assert.equal(resolveTheme('mukha', '?theme=dhokra'), 'dhokra');
  assert.equal(resolveTheme('mukha', '?theme=<script>'), 'mukha');
  assert.equal(resolveTheme('mukha', '?foo=1'), 'mukha');
});
test('isPreview only for a whitelisted ?theme=', () => {
  assert.equal(isPreview('?theme=bangarh'), true);
  assert.equal(isPreview('?theme=nope'), false);
  assert.equal(isPreview(''), false);
});
// theme.js is imported under `node --test` with no DOM present (applyTheme guards on
// `typeof document === 'undefined'`), so a real run does nothing — a minimal fake document +
// localStorage lets this test exercise the branch that actually stamps/persists/dispatches.
test('applyTheme: stamps dataset.theme, whitelists, persists (or not), dispatches themechange', () => {
  const store = {};
  globalThis.localStorage = { setItem: (k, v) => { store[k] = v; }, getItem: k => store[k] ?? null };
  globalThis.document = { documentElement: { dataset: {} }, dispatchEvent() { this.fired = true; } };
  try {
    applyTheme('mukha');
    assert.equal(globalThis.document.documentElement.dataset.theme, 'mukha');
    assert.equal(store.design, 'mukha');
    assert.equal(globalThis.document.fired, true);

    applyTheme('evil');
    assert.equal(globalThis.document.documentElement.dataset.theme, DEFAULT_THEME);
    assert.equal(store.design, DEFAULT_THEME);

    delete store.design;
    globalThis.document.fired = false;
    applyTheme('dhokra', { persist: false });
    assert.equal(globalThis.document.documentElement.dataset.theme, 'dhokra');
    assert.equal(store.design, undefined); // persist:false must not write localStorage
    assert.equal(globalThis.document.fired, true); // themechange still dispatches either way
  } finally {
    delete globalThis.localStorage;
    delete globalThis.document;
  }
});

// Phase 6 ("nothing static"): colour/font overrides layered on top of the chosen theme.
// theme.js is imported with no DOM under `node --test`; applyOverrides/clearOverrides guard on
// `typeof document === 'undefined'` the same way applyTheme does, so a minimal fake
// document.documentElement.style (setProperty/removeProperty spies) + localStorage exercises them.
test('OVERRIDE_KEYS: 15 whitelisted colour keys (matches firestore.rules); FONTS: the four loaded families', () => {
  assert.equal(OVERRIDE_KEYS.length, 15);
  assert.deepEqual([...OVERRIDE_KEYS].sort(), [
    'bg', 'bg2', 'card', 'cta', 'ctaInk', 'durva', 'gold', 'heroAccent', 'ink', 'ivory', 'ivory2',
    'muted', 'pitambar', 'sindoor', 'tickerInk',
  ].sort());
  assert.deepEqual(FONTS, ['Baloo Da 2', 'Hind Siliguri', 'Tiro Bangla', 'Atma']);
});

function fakeDom() {
  const props = {};
  const store = {};
  globalThis.localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: k => (k in store ? store[k] : null),
    removeItem: k => { delete store[k]; },
  };
  globalThis.document = { documentElement: { style: {
    setProperty: (k, v) => { props[k] = v; },
    removeProperty: k => { delete props[k]; },
  } } };
  return { props, store };
}
function cleanupDom() { delete globalThis.localStorage; delete globalThis.document; }

test('applyOverrides: valid hex colours become kebab custom properties (ctaInk/heroAccent/tickerInk kebab, others unchanged); invalid/unknown keys clear', () => {
  const { props, store } = fakeDom();
  try {
    applyOverrides(
      { sindoor: '#112233', ctaInk: '#aabbcc', heroAccent: '#ffffff', tickerInk: '#000000', evil: '#000000', bg: 'not-a-hex' },
      { display: 'Atma', body: 'nope' },
    );
    assert.equal(props['--sindoor'], '#112233');
    assert.equal(props['--cta-ink'], '#aabbcc');
    assert.equal(props['--hero-accent'], '#ffffff');
    assert.equal(props['--ticker-ink'], '#000000');
    assert.equal(props['--evil'], undefined, 'unknown key never reaches style');
    assert.equal(props['--bg'], undefined, 'invalid hex never reaches style');
    assert.equal(props['--display'], '"Atma", "Hind Siliguri", sans-serif');
    assert.equal(props['--body'], undefined, 'unwhitelisted font never reaches style');
    assert.ok(store.designOverrides, 'persists by default');
    // Fix round 1, finding 10: only the validated subset is persisted, never the raw input —
    // an unknown key or invalid value must not round-trip back in via the head-cache script.
    const persisted = JSON.parse(store.designOverrides);
    assert.deepEqual(persisted.overrides, { sindoor: '#112233', ctaInk: '#aabbcc', heroAccent: '#ffffff', tickerInk: '#000000' });
    assert.deepEqual(persisted.fonts, { display: 'Atma', body: '' });
  } finally { cleanupDom(); }
});

test('applyOverrides: persist:false does not touch localStorage', () => {
  const { store } = fakeDom();
  try {
    applyOverrides({ sindoor: '#112233' }, { display: '', body: '' }, { persist: false });
    assert.equal(store.designOverrides, undefined);
  } finally { cleanupDom(); }
});

test('applyOverrides: absent/empty overrides and fonts clear every property (theme default)', () => {
  const { props } = fakeDom();
  // Pre-populate as if a previous applyOverrides() call had set these, so this assertion actually
  // proves removeProperty() ran for each — an empty `props` from the start would pass trivially
  // even if the clearing branch were silently broken.
  props['--sindoor'] = '#112233';
  props['--display'] = '"Atma", "Hind Siliguri", sans-serif';
  try {
    applyOverrides({}, { display: '', body: '' });
    assert.deepEqual(props, {});
  } finally { cleanupDom(); }
});

test('clearOverrides: removes every colour + font custom property and the localStorage key', () => {
  const { props, store } = fakeDom();
  props['--sindoor'] = '#112233'; props['--display'] = 'x';
  store.designOverrides = '{"overrides":{"sindoor":"#112233"},"fonts":{"display":"Atma","body":""}}';
  try {
    clearOverrides();
    assert.deepEqual(props, {});
    assert.equal(store.designOverrides, undefined);
  } finally { cleanupDom(); }
});
