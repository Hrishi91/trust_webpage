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

// Final-review fix wave I4: also captures rgba(r,g,b,a) tokens (e.g. --glow2), not just
// '#rrggbb' ones, so the hue-drift test below can read them.
function tokensOf(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,[^)]*\))/g)) out[m[1]] = m[2];
  return out;
}
const blocks = { siddhi: tokensOf(tokens.match(/:root\s*\{[^}]*\}/)[0]) };
for (const m of themes.matchAll(/\[data-theme="([a-z]+)"\]\s*\{([^}]*)\}/g)) blocks[m[1]] = tokensOf(m[2]);

// Final-review fix wave I4: the 'r,g,b' triple of either a '#rrggbb' hex colour or an
// 'rgba(r,g,b,a)' token, as a comparable string ('201,54,26') — used to check --glow2 (a glow/
// shadow colour, always rgba() for its alpha) actually tracks its theme's own accent hue instead
// of having drifted to an unrelated colour.
function rgbTriple(value) {
  if (value.startsWith('#')) {
    return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(',');
  }
  const m = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/.exec(value);
  if (!m) throw new Error(`rgbTriple: not a hex or rgba() colour: ${value}`);
  return `${m[1]},${m[2]},${m[3]}`;
}

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
// Final-review fix wave I4: --glow2 (a shadow/glow colour behind CTA buttons, the hero heading,
// the ganesh art, progress bars, the live-pulse badge — css/site.css) is meant to echo each
// theme's own accent hue at reduced opacity, but dhokra's and atreyee's had drifted to an
// unrelated colour (caught by eye during this review, not by any prior test — nothing previously
// checked --glow2 against anything). Every theme's expected source token is asserted explicitly
// per theme (not inferred), so this test fails loudly — not vacuously — the moment any theme's
// --glow2 stops tracking its accent, including a future theme added with no matching assertion.
test('glow2 tracks its theme\'s own accent hue, not a drifted/unrelated colour', () => {
  const glowSource = { siddhi: 'sindoor', mukha: 'sindoor', dhokra: 'sindoor', bangarh: 'sindoor', atreyee: 'durva' };
  assert.deepEqual(Object.keys(glowSource).sort(), Object.keys(blocks).sort(), 'glowSource covers exactly the five themes above');
  for (const [name, t] of Object.entries(blocks)) {
    const sourceKey = glowSource[name];
    assert.ok(t.glow2, `${name} --glow2`);
    assert.ok(t[sourceKey], `${name} --${sourceKey}`);
    assert.equal(rgbTriple(t.glow2), rgbTriple(t[sourceKey]), `${name} --glow2 (${t.glow2}) should track --${sourceKey} (${t[sourceKey]})`);
  }
});
// Phase 7 Task 3 item 23 — css/site.css fixes for the 6 real Lighthouse failures on the live home page:
// The token pairs are gated by the contrast tests above; this test guards that the actual CSS rules
// themselves stayed fixed (not reverted/re-introduced with opacity or hardcoded colours).
//  - ticker `small` (3.09:1 fix): no opacity: inside `.ticker .ann small{…}`
//  - `.pulse` (3.69:1 fix): color: uses var(--ticker-ink), not a hardcoded #fff6e8
//  - brand `.t`/`.s` (2.56:1 / 1.83:1 fix): .brand{color:inherit} present, no opacity: in .brand .s{…}
//  - .chips/.tabs active states: color: uses var(--ticker-ink), not a hardcoded #fff6e8
const site = readFileSync(new URL('../../css/site.css', import.meta.url), 'utf8');
test('CSS rules that fixed the 6 Lighthouse contrast failures guard against regression', () => {
  // Extract rule bodies by name
  const ruleBody = (selector) => {
    const match = site.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 's'));
    return match ? match[1] : '';
  };

  // Item 23: .brand{color:inherit} fixes brand .t/.s sitting on plain --bg (not --sindoor)
  assert.ok(ruleBody('.brand').includes('color:inherit'), '.brand rule includes color:inherit');

  // Final-review fix wave I4: a negative-only assertion here ("no opacity:") passes vacuously if
  // the selector itself stops matching anything (ruleBody() returns '', and ''.includes(...) is
  // always false) — e.g. the rule gets renamed, merged into another selector, or deleted outright.
  // Pairing every such negative with "the rule body is non-empty" makes that a loud failure
  // instead of a silent pass. Item 23: .brand .s no longer has opacity:.7
  const brandSBody = ruleBody('.brand .s');
  assert.notEqual(brandSBody, '', '.brand .s rule exists');
  assert.ok(!brandSBody.includes('opacity:'), '.brand .s rule has no opacity (was .7)');

  // Item 23: .ticker .ann small no longer has opacity:.7
  const tickerSmallBody = ruleBody('.ticker .ann small');
  assert.notEqual(tickerSmallBody, '', '.ticker .ann small rule exists');
  assert.ok(!tickerSmallBody.includes('opacity:'), '.ticker .ann small rule has no opacity (was .7)');

  // Item 23: .pulse uses var(--ticker-ink), not hardcoded #fff6e8
  const pulseBody = ruleBody('.pulse');
  assert.ok(pulseBody.includes('var(--ticker-ink)'), '.pulse uses var(--ticker-ink)');
  assert.ok(!pulseBody.includes('#fff6e8'), '.pulse does not use hardcoded #fff6e8');

  // Item 23: .tabs button.active uses var(--ticker-ink), not hardcoded #fff6e8
  const tabsBody = ruleBody('.tabs button.active');
  assert.ok(tabsBody.includes('var(--ticker-ink)'), '.tabs button.active uses var(--ticker-ink)');
  assert.ok(!tabsBody.includes('#fff6e8'), '.tabs button.active does not use hardcoded #fff6e8');

  // Item 23: .chips i.on uses var(--ticker-ink), not hardcoded #fff6e8
  const chipsBody = ruleBody('.chips i.on');
  assert.ok(chipsBody.includes('var(--ticker-ink)'), '.chips i.on uses var(--ticker-ink)');
  assert.ok(!chipsBody.includes('#fff6e8'), '.chips i.on does not use hardcoded #fff6e8');
});
