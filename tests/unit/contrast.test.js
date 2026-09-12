// tests/unit/contrast.test.js — CSS is the single source of truth; parse it, don't duplicate tokens in JS.
// The WCAG contrast math itself lives in js/contrast.js (Phase 6 Task 6: shared with the admin's
// 🎨 colour rows) — imported here, not re-implemented, so both call sites can never drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast as ratio, contrast, luminance } from '../../js/contrast.js';

test('contrast() is order-independent and matches the WCAG worked example (black/white = 21)', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#000000'), 21);
  assert.equal(contrast('#abc123', '#abc123'), 1); // identical colours -> minimum ratio
});
test('luminance() ranks black lowest, white highest', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#ffffff'), 1);
  assert.ok(luminance('#808080') > 0 && luminance('#808080') < 1);
});

const tokens = readFileSync(new URL('../../css/tokens.css', import.meta.url), 'utf8');
const themes = readFileSync(new URL('../../css/themes.css', import.meta.url), 'utf8');

function tokensOf(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
const blocks = { siddhi: tokensOf(tokens.match(/:root\s*\{[^}]*\}/)[0]) };
for (const m of themes.matchAll(/\[data-theme="([a-z]+)"\]\s*\{([^}]*)\}/g)) blocks[m[1]] = tokensOf(m[2]);

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
// final-review fix wave item 2: --hero-accent replaces --pitambar for text sitting directly on the
// hero/header ground (.crumb, hero eyebrow/em, .countdown figures) — mukha's --pitambar equals its
// --bg, which made that text invisible; --hero-accent is a distinct per-theme token, checked here.
test('hero-accent/bg contrast floor per theme', () => {
  for (const [name, t] of Object.entries(blocks)) {
    assert.ok(t['hero-accent'], `${name} --hero-accent`);
    assert.ok(ratio(t['hero-accent'], t.bg) >= 4.5, `${name} hero-accent/bg ${ratio(t['hero-accent'], t.bg).toFixed(2)}`);
  }
});
// final-review fix wave item 3: the sindoor accent (ticker background, CTA/link colour, live badges)
// and the durva accent (large bold figures) were never checked against the grounds they actually sit
// on; --ticker-ink replaces the hardcoded #fff6e8 text colour on the sindoor-background .ticker.
test('accent-on-ground contrast floors per theme', () => {
  for (const [name, t] of Object.entries(blocks)) {
    assert.ok(t['ticker-ink'], `${name} --ticker-ink`);
    assert.ok(ratio(t.sindoor, t.ivory) >= 4.5, `${name} sindoor/ivory ${ratio(t.sindoor, t.ivory).toFixed(2)}`);
    assert.ok(ratio(t.sindoor, t.card) >= 4.5, `${name} sindoor/card ${ratio(t.sindoor, t.card).toFixed(2)}`);
    assert.ok(ratio(t.durva, t.card) >= 3.0, `${name} durva/card ${ratio(t.durva, t.card).toFixed(2)}`); // 26px bold figures = large text
    assert.ok(ratio(t['ticker-ink'], t.sindoor) >= 4.5, `${name} ticker-ink/sindoor ${ratio(t['ticker-ink'], t.sindoor).toFixed(2)}`);
  }
});
// Phase 7 Task 3 item 23 — the 6 real Lighthouse failures on the live home page and their fixes:
//  - ticker `small` (3.09:1): css/site.css `.ticker .ann small` no longer dims --ticker-ink with
//    opacity:.7 — the bare ticker-ink/sindoor pair above already gates this.
//  - `.pulse` (3.69:1): color was hardcoded #fff6e8 (dhokra's pending.md:110 gap) — now
//    var(--ticker-ink), same gated pair.
//  - brand `.t`/`.s` (2.56:1 / 1.83:1): `.nav`'s translucent backdrop is now opaque var(--bg), and
//    `.brand .s` no longer dims --hero-ink with opacity:.7 — both now sit on plain --bg, gated by
//    hero-ink/bg below.
//  - `.eyebrow` (3.5:1): `.donate .eyebrow` (the only bare .eyebrow on a --bg ground) now uses
//    var(--hero-accent) instead of var(--sindoor) — gated by the hero-accent/bg floor test above.
test('brand text (.t/.s) and dhokra chip pairs (.tabs/.chips/.days .active) hold their contrast floor', () => {
  for (const [name, t] of Object.entries(blocks)) {
    assert.ok(ratio(t['hero-ink'], t.bg) >= 4.5, `${name} hero-ink/bg (brand .t/.s) ${ratio(t['hero-ink'], t.bg).toFixed(2)}`);
    assert.ok(ratio(t['ticker-ink'], t.sindoor) >= 4.5, `${name} ticker-ink/sindoor (.tabs/.chips/.days .active) ${ratio(t['ticker-ink'], t.sindoor).toFixed(2)}`);
    assert.ok(ratio(t['hero-accent'], t.bg) >= 4.5, `${name} hero-accent/bg (.donate .eyebrow, .upi code) ${ratio(t['hero-accent'], t.bg).toFixed(2)}`);
  }
});
