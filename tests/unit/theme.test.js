import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, DEFAULT_THEME, THEME_META, resolveTheme, isPreview, applyTheme,
  OVERRIDE_KEYS, FONTS, applyOverrides, clearOverrides,
} from '../../js/theme.js';

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
