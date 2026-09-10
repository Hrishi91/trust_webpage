import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, DEFAULT_THEME, THEME_META, resolveTheme, isPreview, applyTheme } from '../../js/theme.js';

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
