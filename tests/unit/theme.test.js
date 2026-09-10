import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, DEFAULT_THEME, THEME_META, resolveTheme, isPreview } from '../../js/theme.js';

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
