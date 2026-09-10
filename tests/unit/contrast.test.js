// tests/unit/contrast.test.js — CSS is the single source of truth; parse it, don't duplicate tokens in JS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const site = readFileSync(new URL('../../css/site.css', import.meta.url), 'utf8');
const themes = readFileSync(new URL('../../css/themes.css', import.meta.url), 'utf8');

function tokensOf(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
const blocks = { siddhi: tokensOf(site.match(/:root\s*\{[^}]*\}/)[0]) };
for (const m of themes.matchAll(/\[data-theme="([a-z]+)"\]\s*\{([^}]*)\}/g)) blocks[m[1]] = tokensOf(m[2]);

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

test('all five token blocks are present with the required colour tokens', () => {
  assert.deepEqual(Object.keys(blocks).sort(), ['atreyee', 'bangarh', 'dhokra', 'mukha', 'siddhi']);
  for (const [name, t] of Object.entries(blocks)) for (const k of ['bg', 'hero-ink', 'ivory', 'ink', 'muted', 'cta', 'cta-ink', 'card']) assert.ok(t[k], `${name} --${k}`);
});
test('contrast floors per theme', () => {
  for (const [name, t] of Object.entries(blocks)) {
    assert.ok(ratio(t.ink, t.ivory) >= 4.5, `${name} ink/ivory ${ratio(t.ink, t.ivory).toFixed(2)}`);
    assert.ok(ratio(t.muted, t.ivory) >= 4.5, `${name} muted/ivory ${ratio(t.muted, t.ivory).toFixed(2)}`);
    assert.ok(ratio(t['hero-ink'], t.bg) >= 4.5, `${name} hero-ink/bg ${ratio(t['hero-ink'], t.bg).toFixed(2)}`);
    assert.ok(ratio(t['cta-ink'], t.cta) >= 3.0, `${name} cta-ink/cta ${ratio(t['cta-ink'], t.cta).toFixed(2)}`);
    assert.ok(ratio(t.ink, t.card) >= 4.5, `${name} ink/card ${ratio(t.ink, t.card).toFixed(2)}`);
  }
});
