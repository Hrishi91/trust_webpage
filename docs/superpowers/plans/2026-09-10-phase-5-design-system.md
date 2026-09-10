# Phase 5 — Design System, All-Page Redesign, Admin Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved full-site design (`docs/design/concept/full-site-concept.html`) on the live site: a five-theme token system the admin switches from a new 🎨 ডিজাইন card, hand-drawn hero/header art, and every public page restructured to the researched page patterns — with the existing 22 e2e, 20 rules and 51 unit tests kept green and extended.

**Architecture:** Unchanged static ES-module site. New pure module `js/theme.js` resolves the theme name (settings → `?theme=` override → whitelist) and `js/shell.js` stamps it on `<html data-theme>`; `css/site.css` holds the default (সিদ্ধি) tokens + all component CSS, `css/themes.css` holds four override blocks. `js/art.js` draws the Ganesh SVG and the canvas backgrounds from the live CSS tokens, so art follows the theme for free. Pages keep their data flow (`mountShell` → `content.js` reads → `render()` on `langchange`); only their markup builders change. Admin gets one new section (`admin/js/sections/design.js`) and three small form fields.

**Tech Stack:** unchanged (Firebase 12.18.0 CDN, Firestore rules, Playwright, `node --test`). Google Fonts (Baloo Da 2, Hind Siliguri, Tiro Bangla, Atma) via one `<link>`.

Spec: `docs/superpowers/specs/2026-09-10-phase-5-design-system.md`. Page anatomy: `docs/design/page-patterns-2026-09-10.md` §2–3. Visual source of truth: `docs/design/concept/full-site-concept.html` (referenced by line below — copy from it, do not re-invent).

## Global Constraints

- All Phase 0–4 constraints still bind: no build step; SDK only through `js/firebase.js`; `{bn,en}` text fields; `deleted` boolean on every content write; no hard deletes; **no raw `innerHTML` except `js/rich.js`** (the one static SVG literal in `js/art.js` goes through `DOMParser` — constant string, no user data, commented as such); relative paths; docs in the same commit (`scripts/pre-commit-docs.sh`); `npm test` green before any rules deploy.
- Theme field is `settings/site.design`. **`settings.theme` stays the bilingual "this year's theme" text** — never overwrite it.
- Theme names, exactly: `siddhi`, `mukha`, `dhokra`, `atreyee`, `bangarh`. Default `siddhi`.
- CSS token names are the concept's: `--bg --bg2 --hero-ink --hero-muted --ivory --ivory2 --ink --muted --sindoor --pitambar --durva --gold --cta --cta-ink --line --card --glow --glow2 --display --serif --body --r`. `--ivory` is the page ground, `--bg` the hero/header ground.
- Contrast floor (unit-tested from the CSS text): `--ink`/`--ivory`, `--muted`/`--ivory`, `--hero-ink`/`--bg` ≥ 4.5; `--cta-ink`/`--cta` ≥ 3.0.
- e2e selectors that other specs rely on and must keep working: `.brand` (contains trust name), `.lang`, `.countdown b`, `a[href^="gallery.html?album=a1"]`, `article` (about), `.person` (committee), `.live-strip .pulse` / `.live-strip .ann`, `.donor`, `.tabs button` + `.active` (transparency), `.summary`, `.stats .stat b`, `.card h2` (members), `input[type=tel]`, `input[inputmode=numeric]`, `#main p.muted` (error/empty states), `.grid .tile` (admin dashboard, count becomes **13**).
- Phone rules (page-patterns §3): hero art scales, never crops a face; bento 2×2 → 1 col; masonry → 2 col; tables scroll in their own container; nav collapses to logo + burger; touch targets ≥ 44 px; no horizontal overflow at 390 px on any page.
- Run order for e2e is unchanged: `npm run emu` (leave running) → `npm run seed` → `npm run e2e`.

---

## File structure

```
css/site.css                 REWRITE — siddhi tokens + every component block (from concept lines 19–297)
css/themes.css               NEW — [data-theme="mukha|dhokra|atreyee|bangarh"] token blocks (concept lines 14–17)
js/theme.js                  NEW pure — THEMES, DEFAULT_THEME, THEME_META, resolveTheme(), applyTheme()
js/art.js                    NEW DOM — ganeshSvg(), diyaSvg(), paintHero(c), paintGarland(c), paintHeader(c), onResize(fn)
js/ledger.js                 NEW pure — barWidths(rows), donutArcs(income, expense), parsePurposes(text)
js/ledger-view.js            NEW DOM — barsView(rows, lang), donutView(income, expense, lang)
js/culture.js                NEW — CULTURE (3 bilingual cards)
js/shell.js                  REWRITE — theme apply, ticker (announcements), sticky nav + burger, 4-col footer, pageHeader()
js/content.js                MODIFY — DEFAULT_SETTINGS gains design/donatePurposes/sectionVisibility.culture
js/pages/{home,about,committee,gallery,events,donate,transparency,members}.js   RESTRUCTURE markup
*.html (8 public)            MODIFY — fonts link, themes.css, inline theme-cache script, main without .container
firestore.rules              MODIFY — validDesign() on settings/site writes
admin/js/sections/design.js  NEW — 🎨 ডিজাইন card
admin/js/sections/{settings,committee,albums}.js   MODIFY — donatePurposes + culture visibility; officer; featured
admin/js/admin.js            MODIFY — import './sections/design.js' after settings
tests/unit/{theme,ledger,contrast}.test.js   NEW
tests/rules/firestore.test.js               MODIFY — design accept/reject
tests/e2e/{public,live,admin,transparency}.spec.js   MODIFY selectors/counts; NEW tests/e2e/theme.spec.js
tests/seed/seed.js           MODIFY — design:'siddhi', officer/featured flags, donatePurposes
scripts/shots.mjs            NEW — screenshot matrix
docs/user-guide/admin-guide.md, docs/PROJECT_CONTEXT.md, docs/pending.md, docs/build-log.md, README.md
```

---

### Task 1: `js/theme.js` — pure theme resolution + head cache script

**Files:**
- Create: `js/theme.js`
- Test: `tests/unit/theme.test.js`
- Modify: `index.html`, `about.html`, `committee.html`, `gallery.html`, `events.html`, `donate.html`, `transparency.html`, `members.html` (head only)

**Interfaces:**
- Produces: `THEMES: string[]`, `DEFAULT_THEME: 'siddhi'`, `THEME_META: {[name]: {name:{bn,en}, desc:{bn,en}}}`, `resolveTheme(design: unknown, search?: string): string`, `isPreview(search?: string): boolean`, `applyTheme(name: string, {persist?: boolean}): void`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/theme.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/theme.test.js`
Expected: FAIL — `Cannot find module '.../js/theme.js'`

- [ ] **Step 3: Write the module**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/theme.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the head lines to all eight public HTML files**

In each of `index.html about.html committee.html gallery.html events.html donate.html transparency.html members.html`, replace

```html
<link rel="preconnect" href="https://www.gstatic.com">
<link rel="stylesheet" href="css/site.css">
```

with

```html
<script>try{var d=localStorage.getItem('design');if(/^(siddhi|mukha|dhokra|atreyee|bangarh)$/.test(d))document.documentElement.setAttribute('data-theme',d)}catch(e){}</script>
<link rel="preconnect" href="https://www.gstatic.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla&family=Atma:wght@500;700&display=swap">
<link rel="stylesheet" href="css/site.css">
<link rel="stylesheet" href="css/themes.css">
```

and change `<main id="main" class="container">` to `<main id="main">` in all eight. (`css/themes.css` is created in Task 3; a 404 until then is harmless.) Verify: `grep -L 'css/themes.css' *.html` prints nothing; `grep -l 'class="container"' *.html` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add js/theme.js tests/unit/theme.test.js *.html docs/build-log.md
git commit -m "feat(theme): pure theme resolver + head cache script and fonts on every public page"
```
(build-log entry: "Phase 5 Task 1 — js/theme.js …" — every task below appends its own line.)

---

### Task 2: Firestore rule — `design` whitelist on `settings/site`

**Files:**
- Modify: `firestore.rules` (the `match /settings/site` block)
- Test: `tests/rules/firestore.test.js`

- [ ] **Step 1: Write the failing rules test** (append after the existing settings test)

```js
test('settings: design must be one of the five theme names when present', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ design: 'mukha' }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ tagline: { bn: 'x', en: 'y' } }, { merge: true })); // design absent is fine
  await assertFails(E.admin.firestore().doc('settings/site').set({ design: 'neon' }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ design: 7 }, { merge: true }));
  await assertFails(E.anon.firestore().doc('settings/site').set({ design: 'mukha' }, { merge: true }));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:rules`
Expected: the new test FAILS on `assertFails(... 'neon' ...)` (currently accepted).

- [ ] **Step 3: Change the rule**

```
    // Theme name (Phase 5). Anything else must never reach <html data-theme>.
    function validDesign() {
      return !('design' in request.resource.data)
        || request.resource.data.design in ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh'];
    }

    match /settings/site {
      allow read: if true;
      allow create, update: if isAdmin() && validDesign();
      allow delete: if false;
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:rules`
Expected: 21 tests pass.

- [ ] **Step 5: Commit** (rules are deployed in Task 13, after everything is green)

```bash
git add firestore.rules tests/rules/firestore.test.js docs/build-log.md
git commit -m "feat(rules): settings.design must be a whitelisted theme name"
```

---

### Task 3: Token CSS + component CSS + contrast test

**Files:**
- Rewrite: `css/site.css`
- Create: `css/themes.css`
- Test: `tests/unit/contrast.test.js`

- [ ] **Step 1: Write the failing contrast test**

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/contrast.test.js`
Expected: FAIL — `ENOENT css/themes.css` (and the current site.css has no `--ivory`).

- [ ] **Step 3: Create `css/themes.css`**

Copy lines 14–17 of `docs/design/concept/full-site-concept.html` verbatim (the four `[data-theme="…"]{…}` blocks), one per line, preceded by the comment
`/* Theme token overrides. Default (siddhi) tokens live in site.css :root. Same property names in every block. */`.

- [ ] **Step 4: Rewrite `css/site.css`**

1. `:root{…}` = concept lines 5–13 verbatim (siddhi tokens), plus these two lines inside it: `--focus:var(--pitambar);` and `color-scheme:light;` (dhokra overrides `color-scheme:dark;` in themes.css — add that to its block).
2. Then copy concept lines 19–297 (base → members page) verbatim **except**: skip line 199 (`.page{display:none}…`) and skip lines 298–302 (switcher). Keep every `@media` line.
3. Append the bridge rules below (existing page/shell class names that survive from Phase 0–4 and the new shared components):

```css
/* ---- bridge: shell + states ---- */
body{background:var(--ivory)}
#main{min-height:40vh}
#main>p.muted,#main>section>.wrap>p.muted{color:var(--muted);padding:1.2rem 0}
.nav .links.open{display:flex;position:absolute;left:0;right:0;top:100%;flex-direction:column;background:var(--bg);padding:.6rem 1rem 1rem;border-bottom:1px solid var(--line)}
.nav .burger{background:none;border:0;color:inherit;cursor:pointer;padding:12px;display:none}
@media (max-width:860px){.nav .burger{display:block}}
.nav .lang{background:transparent;border:1px solid var(--hero-muted);color:var(--hero-ink);border-radius:999px;padding:.35rem .8rem;font:600 13px var(--body);cursor:pointer;min-height:44px}
.live-strip{/* alias for the ticker so live.spec selectors hold */}
.ticker .ann{display:inline-block;padding:0 1.6rem;white-space:nowrap}
.ticker .ann small{opacity:.7;margin-left:.4rem}
.ticker .pulse{display:inline-block;background:var(--sindoor);color:#fff6e8;border-radius:999px;padding:.05rem .55rem;font-weight:700;animation:pulse 1.2s infinite;margin-right:.4rem}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.countdown{display:flex;gap:.6rem;margin-top:1.2rem}
.countdown div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:.5rem .8rem;min-width:64px;text-align:center}
.countdown b{display:block;font:800 26px/1 var(--display);color:var(--pitambar)}
.countdown span{font-size:12px;opacity:.85}
.btn:focus-visible,a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.rich img{max-width:100%;border-radius:calc(var(--r) - 6px)}
.rich p{margin:.4rem 0}
.lightbox{position:fixed;inset:0;background:rgba(10,8,20,.94);display:flex;align-items:center;justify-content:center;z-index:60}
.lightbox img{max-width:96vw;max-height:90vh;border-radius:8px}
.table-wrap{overflow-x:auto}
table.ledger{width:100%;border-collapse:collapse}
table.ledger td{padding:.45rem .3rem;border-bottom:1px solid var(--line)}
table.ledger td.amt{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin:0 0 1rem}
.tabs button{font:700 14px var(--body);border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:.55rem 1rem;cursor:pointer;min-height:44px}
.tabs button.active{background:var(--sindoor);color:#fff6e8;border-color:var(--sindoor)}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin:1rem 0}
.summary>div{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1rem}
.summary small{color:var(--muted);display:block}
.summary b{font:800 26px var(--display)}
.summary .g{color:var(--durva)}.summary .neg{color:var(--sindoor)}
@media (max-width:700px){.summary{grid-template-columns:1fr}}
.donor{display:flex;justify-content:space-between;gap:.5rem;padding:.5rem 0;border-bottom:1px solid var(--line)}
.err{color:var(--sindoor);min-height:1.2em}
.row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
/* bridge rules only ADD properties the concept block lacks — never re-declare a value the concept sets (amended after Task 3 review) */
.otp input,.form input{width:100%;min-height:44px;color:var(--ink)}
.otp input[inputmode=numeric]{letter-spacing:.4em;text-align:center;font-size:22px;font-weight:700}
```

Delete nothing else. Result: no `.container`, `.site-top`, `.site-nav`, `.site-footer`, `.hero{background:linear-gradient…}` rules remain (grep them: `grep -c 'site-top\|site-nav\|\.container' css/site.css` → 0).

- [ ] **Step 5: Run the contrast test**

Run: `node --test tests/unit/contrast.test.js`
Expected: PASS. If a pair fails, adjust **that token in that block only** toward the darker/lighter side until it passes and note it in the build-log (the concept's values were checked by hand: all pass at the floors above).

- [ ] **Step 6: Commit**

```bash
git add css/site.css css/themes.css tests/unit/contrast.test.js docs/build-log.md
git commit -m "feat(css): five-theme token system + component CSS from the approved concept; contrast test"
```

---

### Task 4: `js/art.js` — Ganesh SVG, diyas, hero/garland/header canvases

**Files:**
- Create: `js/art.js`
- Test: smoke via e2e in Task 5 (canvas has non-zero bitmap; SVG present). No unit test — DOM/canvas only.

**Interfaces:**
- Produces: `ganeshSvg(): SVGElement`, `diyaSvg(): SVGElement`, `paintHero(canvas)`, `paintGarland(canvas)`, `paintHeader(canvas)`, `onResize(fn): () => void` (debounced resize + `themechange` custom event listener; returns unsubscribe).

- [ ] **Step 1: Write the module**

```js
// js/art.js — hand-drawn art, coloured from the live CSS tokens so it follows the theme.
// The SVG literals below are CONSTANT strings authored in docs/design/concept/full-site-concept.html;
// they contain no user data. DOMParser (not innerHTML) is used so the "no innerHTML outside rich.js"
// rule keeps its one-file meaning.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const theme = () => document.documentElement.dataset.theme || 'siddhi';
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
function setup(c) {
  const r = c.getBoundingClientRect(), d = dpr();
  c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  return [g, r.width, r.height];
}
const svgFrom = str => new DOMParser().parseFromString(str, 'image/svg+xml').documentElement;

const GANESH = `…`;   // concept lines 338–379: the whole <svg class="ganesh" …>…</svg> element, verbatim
const DIYA = `…`;     // concept line 380: one <svg class="diya" …>…</svg>, verbatim

export function ganeshSvg() { return svgFrom(GANESH); }
export function diyaSvg() { return svgFrom(DIYA); }

export function paintHero(c) { /* concept lines 680–712 body, with `const c=document.getElementById('heroBg')` removed (c is the parameter) and `root.dataset.theme` → theme() */ }
export function paintGarland(c) { /* concept lines 714–721 body, same substitutions */ }
export function paintHeader(c) { /* concept lines 756–758 (phBg) body, same substitutions */ }

/** Re-run fn on resize (debounced) and whenever the theme is swapped (document 'themechange'). */
export function onResize(fn) {
  let t; const h = () => { clearTimeout(t); t = setTimeout(fn, 120); };
  window.addEventListener('resize', h); document.addEventListener('themechange', fn);
  return () => { window.removeEventListener('resize', h); document.removeEventListener('themechange', fn); };
}
```

Fill the three `/* … */` bodies by copying the concept's function bodies exactly (they only use `setup`, `rng`, `css`, `theme()` and canvas 2D). Do not port `scene()` (concept 723–755) — production uses real photos.

- [ ] **Step 2: Manual check in the browser**

Create `scratch/art-check.html` **outside the repo** (scratchpad) that imports `../js/art.js` via a served copy — or simpler: after Task 5 wires the home page, `npm run serve` and open `http://127.0.0.1:5500/index.html`; the hero shows the Ganesh line art, garland strip and mandala/bokeh background; switch `?theme=mukha` → tessellated mask background. Record what you saw in the build-log line.

- [ ] **Step 3: Commit**

```bash
git add js/art.js docs/build-log.md
git commit -m "feat(art): Ganesh line-art SVG, diyas, theme-aware hero/garland/header canvases"
```

---

### Task 5: Shell — theme apply, ticker, sticky nav + burger, footer, `pageHeader()`

**Files:**
- Rewrite: `js/shell.js`
- Modify: `js/content.js` (DEFAULT_SETTINGS), `tests/e2e/live.spec.js` (selectors unchanged; only the "12 tiles" count → 13 in Task 12), `tests/e2e/theme.spec.js` (new)

**Interfaces:**
- Consumes: `resolveTheme/applyTheme/isPreview` (Task 1), `paintHeader/onResize` (Task 4), `onAnnouncements/getSettings` (content.js).
- Produces: `mountShell(active, pageTitle) → settings|null` (unchanged contract); `pageHeader({ crumb, title, lead }) → HTMLElement` (`.ph` with painted canvas); `section(...children) → HTMLElement` (`<section><div class="wrap">…</div></section>`); `sectionHead(title, aside?) → HTMLElement` (`.sh`).

- [ ] **Step 1: Write the failing e2e**

```js
// tests/e2e/theme.spec.js
import { test, expect } from '@playwright/test';
test('stored design reaches <html data-theme> and the ?theme= override wins without persisting', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi'); // seed: design 'siddhi'
  await page.goto('/index.html?theme=mukha');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mukha');
  await page.goto('/about.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi'); // preview did not persist
});
test('shell: sticky nav with brand, ticker with the seeded live announcement, 4-column footer', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('.nav .brand')).toContainText('গণেশ পুজো ট্রাস্ট');
  await expect(page.locator('.live-strip .pulse')).toHaveText('🔴 লাইভ');
  await expect(page.locator('footer .wrap > div')).toHaveCount(4);
  await expect(page.locator('.ph h1')).toHaveText('ইতিহাস');
});
```
Add `theme` to the public project in `playwright.config.js`: `testMatch: /(public|donate|transparency|live|theme)\.spec\.js/`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run seed && npx playwright test tests/e2e/theme.spec.js`
Expected: FAIL — no `data-theme`, no `.nav .brand`.

- [ ] **Step 3: DEFAULT_SETTINGS in `js/content.js`**

Add to `DEFAULT_SETTINGS`: `design: 'siddhi', donatePurposes: ''`, and `culture: true` inside `sectionVisibility`.

- [ ] **Step 4: Rewrite `js/shell.js`**

```js
import { getSettings, onAnnouncements } from './content.js';
import { getLang, setLang, onLangChange, pick, t } from './i18n.js';
import { el, digits, fmtDate } from './ui.js';
import { resolveTheme, applyTheme, isPreview } from './theme.js';
import { paintHeader, onResize } from './art.js';

const NAV = [ /* unchanged from the current file */ ];

const OM_MARK = 'ॐ';
function brandMark(s) {
  return s.logoUrl ? el('img', { src: s.logoUrl, alt: '', class: 'mark' }) : el('span', { class: 'mark om', text: OM_MARK, 'aria-hidden': 'true' });
}

export function section(...children) { return el('section', {}, el('div', { class: 'wrap' }, ...children)); }
export function sectionHead(title, aside) { return el('div', { class: 'sh' }, el('h2', { text: title }), aside ?? null); }
export function pageHeader({ crumb, title, lead }) {
  const c = el('canvas', { class: 'ph-bg', 'aria-hidden': 'true' });
  const ph = el('div', { class: 'ph' }, c, el('div', { class: 'wrap' },
    crumb ? el('span', { class: 'crumb', text: crumb }) : null, el('h1', { text: title }), lead ? el('p', { text: lead }) : null));
  requestAnimationFrame(() => paintHeader(c)); onResize(() => paintHeader(c));
  return ph;
}

export async function mountShell(active, pageTitle) {
  const s = await getSettings();
  applyTheme(resolveTheme(s.design, location.search), { persist: !isPreview(location.search) });
  document.documentElement.lang = getLang();
  let ann = [], live = false;
  const ticker = () => ann.length ? el('div', { class: 'ticker live-strip', 'aria-label': t('live.announcements') },
    el('div', { class: 'in' }, ...[0, 1].flatMap(() => ann.slice(0, 5).map(a => {   // duplicated once for the seamless marquee
      const created = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
      return el('span', { class: 'ann' }, live && a.isLive ? el('span', { class: 'pulse', text: t('live.badge') }) : null,
        `${a.pinned ? '📌 ' : ''}${pick(a.text)}`, created ? el('small', { text: fmtDate(created, getLang()) }) : null);
    })))) : null;
  const render = () => {
    document.documentElement.lang = getLang();
    document.title = pageTitle ? `${pageTitle} · ${pick(s.name)}` : pick(s.name);
    const links = el('div', { class: 'links' },
      ...NAV.filter(([, , , vis]) => !vis || s.sectionVisibility[vis] !== false)
            .map(([key, href, tkey]) => el('a', { href, class: key === active ? 'on' : '', text: t(tkey) })));
    document.getElementById('site-header').replaceChildren(...[
      ticker(),
      el('nav', { class: 'nav' }, el('div', { class: 'wrap' },
        el('a', { href: 'index.html', class: 'brand', 'aria-label': pick(s.name) }, brandMark(s),
          el('span', {}, el('span', { class: 't', text: pick(s.name) }), pick(s.tagline) ? el('span', { class: 's', text: pick(s.tagline) }) : null)),
        links,
        el('button', { class: 'lang', type: 'button', text: getLang() === 'bn' ? 'EN' : 'বাং', onclick: () => setLang(getLang() === 'bn' ? 'en' : 'bn') }),
        el('button', { class: 'burger', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false',
          onclick: e => { const open = links.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); } },
          el('span', { class: 'bars', 'aria-hidden': 'true' })))),
    ].filter(Boolean));
    const wa = digits(s.contacts.whatsapp);
    document.getElementById('site-footer').replaceChildren(el('footer', {}, el('div', { class: 'wrap' },
      el('div', {}, el('b', { text: pick(s.name) }), pick(s.address), s.regNo ? el('span', { class: 'muted', text: `Reg. no. ${s.regNo}` }) : null),
      el('div', {}, el('b', { text: pick({ bn: 'যোগাযোগ', en: 'Contact' }) }),
        s.contacts.phone ? el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone }) : null,
        wa ? el('a', { href: `https://wa.me/${wa}`, text: 'WhatsApp' }) : null,
        s.mapUrl ? el('a', { href: s.mapUrl, target: '_blank', rel: 'noopener', text: pick({ bn: 'মানচিত্রে দেখুন', en: 'View on map' }) }) : null,
        s.contacts.email ? el('a', { href: `mailto:${s.contacts.email}`, text: s.contacts.email }) : null),
      el('div', {}, el('b', { text: pick({ bn: 'পাতা', en: 'Pages' }) }),
        ...NAV.slice(1).filter(([, , , vis]) => s.sectionVisibility[vis] !== false).map(([, href, tkey]) => el('a', { href, text: t(tkey) }))),
      el('div', {}, el('b', { text: pick({ bn: 'ট্রাস্ট', en: 'Trust' }) }),
        el('a', { href: 'transparency.html', text: t('tr.docs') }), el('a', { href: 'committee.html', text: t('nav.committee') }),
        el('span', { class: 'muted', text: `© ${new Date().getFullYear()} ${pick(s.name)}` }))),
    ));
  };
  render();
  onLangChange(() => { render(); document.dispatchEvent(new CustomEvent('langchange')); });
  const unsub = onAnnouncements((list, meta) => { ann = list; live = meta.live; render(); });
  window.addEventListener('pagehide', unsub);
  if (s.maintenance && !location.pathname.includes('/admin/')) {
    document.getElementById('main').replaceChildren(el('p', { class: 'notice', text: t('footer.maintenance') }));
    return null;
  }
  return s;
}
```

Also in `css/site.css` add: `.brand .om{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--bg2);color:var(--pitambar);font:700 24px serif}` and `.burger .bars{display:block;width:24px;height:2px;background:currentColor;box-shadow:0 -7px 0 currentColor,0 7px 0 currentColor}`.

- [ ] **Step 5: Run the theme spec + the live spec**

Run: `npx playwright test tests/e2e/theme.spec.js tests/e2e/live.spec.js`
Expected: theme.spec PASS; live.spec's first test PASS (`.live-strip .pulse`, `.live-strip .ann` first contains 'স্বাগতম'); its second test still needs the home page (Task 6) — if it fails only on `.grid .tile` count, that is Task 12's change; note it.

- [ ] **Step 6: Commit**

```bash
git add js/shell.js js/content.js css/site.css tests/e2e/theme.spec.js playwright.config.js docs/build-log.md
git commit -m "feat(shell): theme apply, announcement ticker on every page, sticky nav with burger, four-column footer"
```

---

### Task 6: Home page — hero, credibility, bento, donate band, members teaser

**Files:**
- Rewrite: `js/pages/home.js` (part 1 — Task 7 adds the middle sections)
- Modify: `tests/e2e/public.spec.js` (first test)

- [ ] **Step 1: Update the failing e2e** (first test in `public.spec.js`)

```js
test('home shows name, countdown, hero art, next event tile, latest album', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.brand')).toContainText('গণেশ পুজো ট্রাস্ট');
  await expect(page.locator('.countdown b').first()).toHaveText(/[০-৯]+/);
  await expect(page.locator('.hero svg.ganesh')).toBeVisible();
  const painted = await page.locator('canvas#heroBg').evaluate(c => c.width > 0 && c.height > 0);
  expect(painted).toBe(true);
  await expect(page.locator('.bento .tile b').nth(1)).toHaveText('আগামী');       // next event
  await expect(page.locator('a[href^="gallery.html?album=a1"]')).toBeVisible();
  await expect(page.locator('.donate .upi code')).toHaveText('trust@upi');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/public.spec.js -g "home shows"`
Expected: FAIL — no `.hero svg.ganesh`.

- [ ] **Step 3: Write `js/pages/home.js`**

```js
import { mountShell, section, sectionHead } from '../shell.js';
import { listPublished, listCommittee, listTransparencyYears } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, countdown, fmtDate, bnDigits, digits } from '../ui.js';
import { inr, sum } from '../money.js';
import { ganeshSvg, diyaSvg, paintHero, paintGarland, onResize } from '../art.js';
import { CULTURE } from '../culture.js';
import { barsView, donutView } from '../ledger-view.js';

const main = document.getElementById('main');
const s = await mountShell('home');
if (s) {
  let events, albums, history, people, years;
  try {
    [events, albums, history, people, years] = await Promise.all([
      listPublished('events'), listPublished('albums'), listPublished('history'), listCommittee(), listTransparencyYears()]);
  } catch (err) { console.error(err); main.replaceChildren(el('p', { class: 'muted', text: t('common.error') })); events = null; }
  if (events !== null) {
    const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
    let unsubHero = null;
    const hero = () => {
      const now = new Date(), cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const bg = el('canvas', { class: 'bg', id: 'heroBg', 'aria-hidden': 'true' });
      const garland = el('canvas', { class: 'garland', id: 'garland', 'aria-hidden': 'true' });
      const h = el('header', { class: 'hero' }, bg, el('div', { class: 'wrap' },
        el('div', { class: 'copy' },
          s.pujaDate ? el('span', { class: 'eyebrow', text: fmtDate(s.pujaDate, getLang()) }) : null,
          el('h1', {}, pick(s.name)),
          pick(s.tagline) ? el('p', { text: pick(s.tagline) }) : null,
          el('div', { class: 'ctas' },
            s.sectionVisibility.donate !== false ? el('a', { class: 'btn', href: 'donate.html', text: t('nav.donate') }) : null,
            el('a', { class: 'btn ghost', href: 'events.html', text: t('nav.events') })),
          cd ? (cd.past ? el('p', { class: 'countdown-today', text: t('countdown.today') })
            : el('div', { class: 'countdown', 'aria-label': t('countdown.days') },
                el('div', {}, el('b', { text: num(cd.days) }), el('span', { text: t('countdown.days') })),
                el('div', {}, el('b', { text: num(cd.hours) }), el('span', { text: t('countdown.hours') })),
                el('div', {}, el('b', { text: num(cd.minutes) }), el('span', { text: t('countdown.minutes') })))) : null),
        el('div', { class: 'art' }, ganeshSvg(), el('div', { class: 'diyas' }, ...[0, 1, 2, 3, 4].map(() => diyaSvg())))),
        garland);
      requestAnimationFrame(() => { paintHero(bg); paintGarland(garland); });
      unsubHero?.(); unsubHero = onResize(() => { paintHero(bg); paintGarland(garland); });   // render() runs every 60 s — never stack listeners
      return h;
    };
    const cred = () => {
      const items = [];
      if (s.regNo) items.push(el('span', {}, el('b', { text: 'Registered Trust' }), ` ${t('tr.regNo')} ${s.regNo}`));
      if (s.has80G) items.push(el('span', {}, el('b', { text: '80G' }), ` ${t('donate.tax80g')}`));
      if (years.length) items.push(el('span', {}, el('b', { text: t('tr.title') }), ` ${pick({ bn: 'প্রতি বছর প্রকাশিত', en: 'published every year' })}`));
      return items.length ? el('div', { class: 'cred' }, el('div', { class: 'wrap' }, ...items)) : null;
    };
    const bento = () => {
      const now = new Date(), cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const next = events.filter(e => new Date(e.end || e.start) >= now)[0];
      const latest = years[0];
      const tile = (small, big, span) => el('div', { class: 'tile' }, el('small', { text: small }), el('b', { text: big }), el('span', { text: span }));
      return section(sectionHead(pick({ bn: 'এক নজরে', en: 'At a glance' }), el('a', { href: 'events.html', text: t('events.upcoming') + ' →' })),
        el('div', { class: 'bento' },
          tile(pick({ bn: 'পুজো শুরু', en: 'Puja starts' }), cd && !cd.past ? `${num(cd.days)} ${t('countdown.days')}` : t('countdown.today'), s.pujaDate ? fmtDate(s.pujaDate, getLang()) : ''),
          tile(pick({ bn: 'পরের অনুষ্ঠান', en: 'Next event' }), next ? pick(next.title) : t('common.empty'), next ? `${fmtDate(next.start, getLang())}${pick(next.venue) ? ' · ' + pick(next.venue) : ''}` : ''),
          tile(pick({ bn: 'এই বছরের থিম', en: "This year's theme" }), pick(s.theme) || '—', ''),
          tile(latest ? `${num(latest.year)} ${t('tr.title')}` : t('tr.title'),
            latest ? `${inr(sum(latest.income ?? []) - sum(latest.expense ?? []), getLang())} ${t('tr.balance')}` : t('common.empty'),
            latest ? `${t('tr.income')} ${inr(sum(latest.income ?? []), getLang())} · ${t('tr.expense')} ${inr(sum(latest.expense ?? []), getLang())}` : '')));
    };
    const donateBand = () => {
      if (s.sectionVisibility.donate === false || !s.upiId) return null;
      const wa = digits(s.contacts.whatsapp);
      return el('section', { class: 'donate' }, el('div', { class: 'wrap' },
        el('div', {}, el('span', { class: 'eyebrow', text: t('nav.donate') }), el('h2', {}, pick({ bn: 'এক টাকাও ', en: 'Not one rupee ' }), el('em', { text: pick({ bn: 'হিসাবের বাইরে নয়', en: 'outside the ledger' }) })),
          el('p', { text: pick({ bn: 'UPI-তে দিন, WhatsApp-এ জানান। দাতাদের তালিকায় নাম উঠবে (চাইলে গোপন)।', en: 'Pay by UPI, confirm on WhatsApp. Your name joins the donor wall (or stays anonymous).' }) }),
          el('div', { class: 'ctas' }, el('a', { class: 'btn', href: 'donate.html', text: t('donate.upi') }), wa ? el('a', { class: 'btn ghost', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null)),
        el('div', { class: 'upi' }, s.upiQrUrl ? el('img', { src: s.upiQrUrl, alt: t('donate.scan'), width: 112, height: 112 }) : null,
          el('div', {}, el('code', { text: s.upiId }), el('p', { text: t('donate.scan') })))));
    };
    const membersTeaser = () => s.sectionVisibility.members === false ? null : el('section', {}, el('div', { class: 'wrap members' },
      el('div', {}, el('span', { class: 'eyebrow', text: t('mem.title') }), el('h2', { text: pick({ bn: 'নিজের চাঁদা, নোটিশ, দায়িত্ব — এক জায়গায়', en: 'Your pledge, notices, duties — in one place' }) }),
        el('p', { class: 'muted', text: pick({ bn: 'কমিটির সদস্যরা মোবাইল নম্বর দিয়ে OTP-তে ঢুকুন।', en: 'Committee members sign in with a phone OTP.' }) })),
      el('form', { class: 'form', action: 'members.html', method: 'get' }, el('input', { type: 'tel', name: 'phone', placeholder: '+91', 'aria-label': t('mem.phone') }), el('button', { class: 'btn', type: 'submit', text: t('mem.sendOtp') }))));

    // Task 7 fills these four in; keep the names.
    let story = () => null, culture = () => null, gallery = () => null, schedule = () => null, ledger = () => null, committee = () => null;
    const render = () => main.replaceChildren(...[hero(), cred(), bento(), story(), culture(), gallery(), schedule(), ledger(), donateBand(), committee(), membersTeaser()].filter(Boolean));
    render();
    document.addEventListener('langchange', render);
    setInterval(render, 60000);
  }
}
```

Create `js/culture.js` now (used in Task 7) so the import resolves:

```js
// js/culture.js — district facts shown on the home page; static because they do not change yearly.
export const CULTURE = [
  { icon: 'mask', tag: { bn: 'কুশমণ্ডি · GI TAG ২০১৮', en: 'Kushmandi · GI tag 2018' }, title: { bn: 'কাঠের মুখা', en: 'Wooden mukha' },
    text: { bn: 'একটাই কাঠের খণ্ড থেকে খোদাই — গোমিরা নাচের মুখোশ। এবারের মণ্ডপের প্রবেশপথে ১২টি মুখা।', en: 'Carved from a single block for the Gomira dance. Twelve masks frame this year’s gate.' } },
  { icon: 'coil', tag: { bn: 'জেলায় ২৬০০+ শিল্পী', en: '2,600+ artisans in the district' }, title: { bn: 'ঢোকরা', en: 'Dhokra' },
    text: { bn: 'হারানো-মোমের পিতল — ঘণ্টা, প্রদীপ, গণেশ। মণ্ডপের প্রদীপ ও ঘণ্টা এবার ঢোকরার।', en: 'Lost-wax brass — bells, lamps, Ganesh. This year’s lamps and bells are Dhokra.' } },
  { icon: 'river', tag: { bn: 'আত্রেয়ী · বাণগড়', en: 'Atreyee · Bangarh' }, title: { bn: 'আত্রেয়ী ও কোটিবর্ষ', en: 'Atreyee and Kotivarsha' },
    text: { bn: 'নদীর তীরে পাল-সেন যুগের পোড়ামাটি; বিসর্জন আত্রেয়ীর ঘাটে, ২০২৪-এ হাজারের শোভাযাত্রা।', en: 'Pala-Sena terracotta on the riverbank; immersion at the Atreyee ghat, a thousand-strong procession in 2024.' } },
];
```

And a minimal `js/ledger-view.js` stub so the import resolves (filled in Task 8): `export const barsView = () => null; export const donutView = () => null;`.

- [ ] **Step 4: Run the home e2e**

Run: `npx playwright test tests/e2e/public.spec.js -g "home shows"`
Expected: PASS. Also open `http://127.0.0.1:5500/index.html` at 390 px width (Playwright default in config) and confirm `document.documentElement.scrollWidth <= clientWidth` (the "no horizontal overflow" test covers it).

- [ ] **Step 5: Commit**

```bash
git add js/pages/home.js js/culture.js js/ledger-view.js tests/e2e/public.spec.js docs/build-log.md
git commit -m "feat(home): hero with Ganesh art and countdown, credibility strip, at-a-glance bento, donate band, members teaser"
```

---

### Task 7: Home page — theme story, culture cards, gallery masonry, schedule, ledger summary, committee row

**Files:**
- Modify: `js/pages/home.js` (replace the six `() => null` stubs)
- Create: `js/ledger.js`, `tests/unit/ledger.test.js`; fill `js/ledger-view.js`

**Interfaces:**
- Produces (`js/ledger.js`, pure): `barWidths(rows: {amount}[]) → number[]` (percent of the max, 0–100, 2 dp); `donutArcs(income: rows, expense: rows) → { pct: number, arcs: [{ key:'idol'|'other', dasharray: string, dashoffset: string }] }` — simpler: `donutArcs(rows, circumference=440) → [{dasharray, dashoffset}]` proportional slices; `parsePurposes(text) → [{ title:{bn,en}, amounts:number[] }]`.
- Produces (`js/ledger-view.js`, DOM): `barsView(rows, lang, {kind:'income'|'expense'}) → .bars`, `donutView(rows, lang, centreLabel) → .donut`.

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/ledger.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barWidths, donutArcs, parsePurposes } from '../../js/ledger.js';

test('barWidths scales to the largest row', () =>
  assert.deepEqual(barWidths([{ amount: 50 }, { amount: 100 }, { amount: 0 }]), [50, 100, 0]));
test('barWidths of empty/zero rows is all zeros', () => { assert.deepEqual(barWidths([]), []); assert.deepEqual(barWidths([{ amount: 0 }]), [0]); });
test('donutArcs: slices sum to the circumference and offsets accumulate', () => {
  const a = donutArcs([{ amount: 1 }, { amount: 3 }], 400);
  assert.deepEqual(a, [{ dasharray: '100 400', dashoffset: '0' }, { dasharray: '300 400', dashoffset: '-100' }]);
});
test('donutArcs with no total returns []', () => assert.deepEqual(donutArcs([{ amount: 0 }], 400), []));
test('parsePurposes: one per line "bn | en | amounts"', () => {
  assert.deepEqual(parsePurposes('প্রতিমা | Idol | 501,1101\nভোগ|Bhog|301\n\nbad line'), [
    { title: { bn: 'প্রতিমা', en: 'Idol' }, amounts: [501, 1101] },
    { title: { bn: 'ভোগ', en: 'Bhog' }, amounts: [301] },
    { title: { bn: 'bad line', en: '' }, amounts: [] },
  ]);
  assert.deepEqual(parsePurposes(''), []); assert.deepEqual(parsePurposes(null), []);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/ledger.test.js` → FAIL (module missing).

- [ ] **Step 3: Write `js/ledger.js`**

```js
// Pure ledger helpers (no DOM). Amounts are numbers in rupees.
const amt = r => Math.max(0, Number(r?.amount) || 0);
export function barWidths(rows) {
  const max = Math.max(0, ...rows.map(amt));
  return rows.map(r => max ? Math.round((amt(r) / max) * 10000) / 100 : 0);
}
export function donutArcs(rows, circumference = 440) {
  const total = rows.reduce((a, r) => a + amt(r), 0);
  if (!total) return [];
  let acc = 0;
  return rows.map(r => { const len = Math.round((amt(r) / total) * circumference * 100) / 100; const out = { dasharray: `${len} ${circumference}`, dashoffset: String(-acc) }; acc += len; return out; });
}
/** "bn | en | 501,1101" per line → [{title:{bn,en}, amounts:number[]}] */
export function parsePurposes(text) {
  return String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [bn = '', en = '', am = ''] = l.split('|').map(x => x.trim());
    return { title: { bn, en }, amounts: am.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0) };
  });
}
```

- [ ] **Step 4: Run unit test → PASS**, then write `js/ledger-view.js`:

```js
import { el } from './ui.js';
import { pick } from './i18n.js';
import { inr } from './money.js';
import { barWidths, donutArcs } from './ledger.js';
const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs) => { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const PALETTE = ['var(--sindoor)', 'var(--pitambar)', 'var(--durva)', 'var(--gold)', 'var(--bg2)'];

export function barsView(rows, lang, { kind = 'income' } = {}) {
  const w = barWidths(rows);
  return el('div', { class: 'bars' }, ...rows.map((r, i) => el('div', { class: 'bar' },
    el('span', { text: pick(r.category, lang) }), el('i', { class: kind === 'expense' ? 'g' : '', style: `width:${w[i]}%` }), el('em', { text: inr(r.amount, lang) }))));
}
export function donutView(rows, lang, centre) {
  const svg = sv('svg', { viewBox: '0 0 200 200', role: 'img' });
  svg.append(sv('circle', { cx: 100, cy: 100, r: 70, fill: 'none', stroke: 'var(--line)', 'stroke-width': 22 }));
  donutArcs(rows).forEach((a, i) => svg.append(sv('circle', { cx: 100, cy: 100, r: 70, fill: 'none', stroke: PALETTE[i % PALETTE.length], 'stroke-width': 22,
    'stroke-dasharray': a.dasharray, 'stroke-dashoffset': a.dashoffset, transform: 'rotate(-90 100 100)' })));
  const big = sv('text', { x: 100, y: 96, 'text-anchor': 'middle', 'font-family': 'Baloo Da 2,Hind Siliguri', 'font-weight': 800, 'font-size': 26, fill: 'var(--ink)' }); big.textContent = centre.big;
  const small = sv('text', { x: 100, y: 118, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }); small.textContent = centre.small;
  svg.append(big, small);
  return el('div', { class: 'donut' }, svg);
}
```

- [ ] **Step 5: Replace the six stubs in `js/pages/home.js`**

```js
    const cultureIcon = kind => { const c = el('div', { class: 'ill' }); c.dataset.kind = kind; return c; }; // CSS draws a token-coloured emblem per kind
    story = () => {
      const h = history.at(-1), cover = albums.at(-1);   // listPublished orders ascending → last = newest
      if (!pick(s.theme) && !h) return null;
      return section(el('div', { class: 'story' },
        cover?.coverUrl ? el('figure', { class: 'scene' }, el('img', { src: cover.coverUrl, alt: pick(cover.title), loading: 'lazy' }), el('figcaption', { text: `${num(cover.year)} · ${pick(cover.title)}` })) : null,
        el('div', { class: 'txt' }, el('span', { class: 'eyebrow', text: pick({ bn: 'এই বছরের থিম', en: "This year's theme" }) }),
          el('h2', {}, el('span', { class: 'stitch', text: pick(s.theme) || (h ? pick(h.title) : '') })),
          h ? el('div', { class: 'rich' }, renderRich(pick(h.body))) : null,
          el('div', { class: 'ctas' }, el('a', { class: 'btn ghost', href: 'about.html', text: t('nav.about') })))));
    };
    culture = () => s.sectionVisibility.culture === false ? null : el('section', { class: 'culture' }, el('div', { class: 'wrap' },
      sectionHead(pick({ bn: 'আমাদের মাটি, আমাদের শিল্প', en: 'Our soil, our craft' }), el('span', { class: 'pill', text: pick({ bn: 'দক্ষিণ দিনাজপুর', en: 'Dakshin Dinajpur' }) })),
      el('div', { class: 'cgrid' }, ...CULTURE.map(c => el('article', { class: 'ccard' }, cultureIcon(c.icon), el('small', { text: pick(c.tag) }), el('h3', { text: pick(c.title) }), el('p', { text: pick(c.text) }))))));
    gallery = () => {
      if (s.sectionVisibility.gallery === false || !albums.length) return null;
      const latest = albums.slice(-5).reverse();
      return section(sectionHead(t('nav.gallery'), el('a', { href: 'gallery.html', text: t('gallery.albums') + ' →' })),
        el('div', { class: 'masonry' }, ...latest.map((a, i) => el('a', { class: i === 0 ? 'big' : '', href: `gallery.html?album=${a.id}` },
          a.coverUrl ? el('img', { src: a.coverUrl, alt: pick(a.title), loading: 'lazy' }) : null, el('span', { class: 'cap', text: `${num(a.year)} · ${pick(a.title)}` })))));
    };
    schedule = () => {
      if (s.sectionVisibility.events === false) return null;
      const now = new Date(), up = events.filter(e => new Date(e.end || e.start) >= now).slice(0, 4);
      if (!up.length) return null;
      const time = iso => new Date(iso).toLocaleTimeString(getLang() === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
      return section(sectionHead(t('events.upcoming'), el('a', { href: 'events.html', text: t('nav.events') + ' →' })),
        el('div', { class: 'timeline' }, ...up.map(e => { const live = new Date(e.start) <= now && now <= new Date(e.end || e.start);
          return el('div', { class: live ? 'ev live' : 'ev' }, el('time', { text: `${fmtDate(e.start, getLang())} · ${time(e.start)}` }),
            el('div', {}, el('b', { text: pick(e.title) }), el('span', { text: pick(e.venue) }), live ? el('span', { class: 'pulse', text: t('live.badge') }) : null)); })));
    };
    ledger = () => {
      if (s.sectionVisibility.transparency === false || !years[0]) return null;
      const y = years[0], inc = y.income ?? [], exp = y.expense ?? [];
      const top = [...inc].sort((a, b) => b.amount - a.amount).slice(0, 3), topE = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 4);
      const pct = sum(exp) ? Math.round((topE[0]?.amount ?? 0) / sum(exp) * 100) : 0;
      return section(sectionHead(`${num(y.year)} · ${t('tr.title')}`, el('a', { href: 'transparency.html', text: t('tr.docs') + ' →' })),
        el('div', { class: 'ledger' }, el('div', {}, barsView(top, getLang()), barsView(topE, getLang(), { kind: 'expense' })),
          donutView(topE, getLang(), { big: `${num(pct)}%`, small: topE[0] ? pick(topE[0].category) : '' })));
    };
    committee = () => {
      if (s.sectionVisibility.committee === false || !people.length) return null;
      const officers = people.filter(p => p.officer).slice(0, 4); const row = officers.length ? officers : people.slice(0, 4);
      return section(sectionHead(t('nav.committee'), el('a', { href: 'committee.html', text: pick({ bn: 'সব সদস্য →', en: 'All members →' }) })),
        el('div', { class: 'people' }, ...row.map(p => el('a', { class: 'person', href: 'committee.html' },
          el('div', { class: 'ring' }, p.photoUrl ? el('img', { src: p.photoUrl, alt: '', loading: 'lazy' }) : el('span', { text: pick(p.name).slice(0, 1) })),
          el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) })))));
    };
```
Add `import { renderRich } from '../rich.js';` at the top (and the DOMPurify `<script>` tag from `about.html` into `index.html` before the module script, since `renderRich` needs it). Add CSS for `.ccard .ill[data-kind]` (a 120 px rounded block with a radial-gradient in `--pitambar`/`--durva`/`--sindoor` per kind) and `.people .ring img{width:100%;height:100%;border-radius:50%;object-fit:cover}`, `.ev.live{border-color:var(--sindoor);box-shadow:inset 0 0 0 2px var(--sindoor)}`.

- [ ] **Step 6: Run** `node --test tests/unit/ledger.test.js` and `npx playwright test tests/e2e/public.spec.js tests/e2e/live.spec.js` → all PASS (live.spec's tile count still 12 until Task 12 — expected to fail only there; note it).

- [ ] **Step 7: Commit**

```bash
git add js/ledger.js js/ledger-view.js js/pages/home.js index.html css/site.css tests/unit/ledger.test.js docs/build-log.md
git commit -m "feat(home): theme story, culture cards, gallery masonry, schedule, ledger summary, committee row"
```

---

### Task 8: About (timeline) + Committee (officers + grid) + Gallery (best strip + albums)

**Files:**
- Rewrite render blocks in: `js/pages/about.js`, `js/pages/committee.js`, `js/pages/gallery.js`
- Modify: `tests/e2e/public.spec.js` ("drafts and hidden rows" test: gallery selector `.grid a` → `.albums a`)

- [ ] **Step 1: Update the e2e line** in `public.spec.js`: `await page.goto('/gallery.html'); await expect(page.locator('.albums a')).toHaveCount(1);` and add after it `await page.goto('/committee.html'); await expect(page.locator('.officers .officer, .mgrid .mrow')).toHaveCount(1);` (keep the existing `.person` count line too — every card also carries `person`).

- [ ] **Step 2: about.js render**

```js
    const render = () => {
      const lang = getLang(), num = n => lang === 'bn' ? bnDigits(n) : String(n);
      const sorted = [...items].sort((a, b) => b.year - a.year);
      main.replaceChildren(pageHeader({ crumb: t('nav.about'), title: pick(s.name), lead: pick(s.tagline) }),
        section(items.length ? el('div', { class: 'tl' }, ...sorted.flatMap(h => [
          el('div', { class: 'yr' }, num(h.year), el('small', { text: pick(h.title) })),
          el('article', { class: 'card' }, el('h3', { text: pick(h.title) }), el('div', { class: 'rich' }, renderRich(pick(h.body))),
            (h.images ?? []).length ? el('div', { class: 'pics' }, ...h.images.map(src => el('figure', {}, el('img', { src, alt: '', loading: 'lazy' })))) : null)]))
        : el('p', { class: 'muted', text: t('common.empty') })));
    };
```
Imports: `import { mountShell, pageHeader, section } from '../shell.js';`. Error path unchanged (`#main p.muted`).

- [ ] **Step 3: committee.js render**

```js
    const render = () => {
      const officers = people.filter(p => p.officer), rest = people.filter(p => !p.officer);
      const ring = p => el('div', { class: 'ring' }, p.photoUrl ? el('img', { src: p.photoUrl, alt: '', loading: 'lazy' }) : el('span', { text: pick(p.name).slice(0, 1) }));
      main.replaceChildren(pageHeader({ crumb: t('nav.committee'), title: pick({ bn: 'যাঁরা দায়িত্বে', en: 'Who is responsible' }) }),
        section(...[
          officers.length ? el('div', { class: 'officers' }, ...officers.map(p => el('div', { class: 'officer person' }, ring(p), el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) })))) : null,
          rest.length ? sectionHead(pick({ bn: 'সদস্যরা', en: 'Members' }), el('span', { class: 'pill', text: `${getLang() === 'bn' ? bnDigits(rest.length) : rest.length}` })) : null,
          rest.length ? el('div', { class: 'mgrid' }, ...rest.map(p => el('div', { class: 'mrow person' }, ring(p), el('div', {}, el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) }))))) : null,
          people.length ? null : el('p', { class: 'muted', text: t('common.empty') }),
        ].filter(Boolean)));
    };
```

- [ ] **Step 4: gallery.js** — album list branch:

```js
      const render = () => {
        const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
        const featured = albums.filter(a => a.featured && a.coverUrl).slice(0, 4);
        main.replaceChildren(pageHeader({ crumb: t('nav.gallery'), title: t('gallery.albums') }),
          section(...[
            featured.length ? sectionHead(pick({ bn: 'সেরা মুহূর্ত', en: 'Best moments' })) : null,
            featured.length ? el('div', { class: 'best' }, ...featured.map(a => el('a', { href: `gallery.html?album=${a.id}` }, el('img', { src: a.coverUrl, alt: pick(a.title), loading: 'lazy' })))) : null,
            sectionHead(t('gallery.albums')),
            albums.length ? el('div', { class: 'albums' }, ...albums.map(a => el('a', { class: 'album', href: `gallery.html?album=${a.id}` },
              a.coverUrl ? el('img', { src: a.coverUrl, alt: '', loading: 'lazy' }) : el('div', { class: 'nocover' }),
              el('div', { class: 'cap' }, el('b', { text: num(a.year) }), el('span', { text: pick(a.title) }))))) : el('p', { class: 'muted', text: t('common.empty') }),
          ].filter(Boolean)));
      };
```
Album view branch: wrap in `pageHeader({ crumb: t('gallery.albums'), title: `${num(album.year)} · ${pick(album.title)}` })` + `section(el('a', { href: 'gallery.html', text: '‹ ' + t('gallery.albums') }), el('div', { class: 'masonry' }, ...photos.map(...)))` — lightbox unchanged. Add CSS `.album .nocover{aspect-ratio:4/3;background:linear-gradient(135deg,var(--bg2),var(--bg))}` and `.best a img,.album img{width:100%;height:100%;object-fit:cover;display:block}`.

- [ ] **Step 5: Run** `npx playwright test tests/e2e/public.spec.js` → PASS (all 5).

- [ ] **Step 6: Commit**

```bash
git add js/pages/about.js js/pages/committee.js js/pages/gallery.js css/site.css tests/e2e/public.spec.js docs/build-log.md
git commit -m "feat(pages): history timeline, committee officers+grid, gallery best strip + album tiles"
```

---

### Task 9: Events (day tabs + live row + past accordion) and Donate (UPI card + purpose cards + WhatsApp + wall)

**Files:**
- Rewrite render blocks: `js/pages/events.js`, `js/pages/donate.js`
- Modify: `tests/e2e/public.spec.js` (language test: `h1` → `.ph h1`), `tests/e2e/donate.spec.js` (selectors below), `tests/seed/seed.js` (`donatePurposes`)

- [ ] **Step 1: Tests first**
  - `public.spec.js` language test: `await expect(page.locator('.ph h1')).toHaveText('Upcoming events');`
  - `admin.spec.js` create-event test: `await expect(page.locator('.ev b', { hasText: 'ই২ই অনুষ্ঠান' })).toBeVisible();`
  - seed `settings/site`: add `design: 'siddhi', donatePurposes: 'প্রতিমা | Idol | 501,1101\nভোগ | Bhog | 301,501'`, `sectionVisibility.culture: true`.
  - `donate.spec.js` first test add: `await expect(page.locator('.purpose .pcard')).toHaveCount(2); await expect(page.locator('.pcard .chips i').first()).toHaveText('₹৫০১');`

- [ ] **Step 2: Run** `npm run seed && npx playwright test tests/e2e/donate.spec.js tests/e2e/public.spec.js` → the new assertions FAIL.

- [ ] **Step 3: events.js render**

```js
    let selectedDay = null;
    const render = () => {
      const now = new Date(), lang = getLang(), num = n => lang === 'bn' ? bnDigits(n) : String(n);
      const up = all.filter(e => new Date(e.end || e.start) >= now), past = all.filter(e => new Date(e.end || e.start) < now).reverse();
      const dayKey = e => new Date(e.start).toDateString();
      const days = [...new Set(up.map(dayKey))];
      if (!days.includes(selectedDay)) selectedDay = days[0] ?? null;
      const time = iso => new Date(iso).toLocaleTimeString(lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
      const row = e => { const live = new Date(e.start) <= now && now <= new Date(e.end || e.start);
        return el('div', { class: live ? 'ev live' : 'ev' }, el('time', { text: time(e.start) }),
          el('div', {}, el('b', { text: pick(e.title) }), el('span', { text: [pick(e.venue), pick(e.desc)].filter(Boolean).join(' · ') }), live ? el('span', { class: 'pulse', text: t('live.badge') }) : null)); };
      main.replaceChildren(pageHeader({ crumb: t('nav.events'), title: t('events.upcoming') }),
        section(...[
          days.length ? el('div', { class: 'days tabs', role: 'tablist' }, ...days.map(d => el('button', { type: 'button', class: d === selectedDay ? 'active' : '', 'aria-pressed': String(d === selectedDay),
            text: fmtDate(up.find(e => dayKey(e) === d).start, lang), onclick: () => { selectedDay = d; render(); } }))) : null,
          up.length ? el('div', { class: 'timeline' }, ...up.filter(e => dayKey(e) === selectedDay).map(row)) : el('p', { class: 'muted', text: t('common.empty') }),
          past.length ? el('div', { class: 'acc' }, el('details', {}, el('summary', { text: t('events.past') }), ...past.map(row))) : null,
        ].filter(Boolean)));
    };
```

- [ ] **Step 4: donate.js render** — keep `upiCard`/`confirmCard` logic (copy button, `upi://pay` link, WhatsApp message) and restructure:

```js
    const purposes = parsePurposes(s.donatePurposes);
    const render = () => {
      const lang = getLang(), num = n => lang === 'bn' ? bnDigits(n) : String(n);
      const purposeCards = purposes.length ? el('div', { class: 'purpose' }, ...purposes.map(p => el('div', { class: 'pcard' }, el('b', { text: pick(p.title) }),
        el('div', { class: 'chips' }, ...p.amounts.map(a => el('i', { text: inr(a, lang), onclick: () => { amountField.value = String(a); amountField.focus(); } })))))) : null;
      main.replaceChildren(pageHeader({ crumb: t('nav.donate'), title: t('donate.title'), lead: s.has80G ? t('donate.tax80g') : '' }),
        section(el('div', { class: 'dgrid' },
          el('div', {}, upiCard(), purposeCards ? sectionHead(pick({ bn: 'কোন খাতে', en: 'For what' })) : null, purposeCards),
          el('div', {}, confirmCard(), el('div', { class: 'form wall-card' }, el('span', { class: 'eyebrow', text: t('donate.wall') }),
            errored ? el('p', { class: 'muted', text: t('common.error') }) : wall.length ? el('div', { class: 'wall' }, ...wall.map(d => el('div', { class: 'donor' },
              el('span', { text: d.isAnonymous ? t('donate.anonymous') : d.donorName }), el('span', { text: inr(d.amount, lang) }), el('span', { class: 'muted', text: fmtDate(d.date, lang) })))) : el('p', { class: 'muted', text: t('common.empty') }),
            s.regNo ? el('small', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null)))));
    };
```
`amountField` must be hoisted out of `confirmCard()` (declare the three inputs at module level inside the `if (s)` block so purpose chips can fill the amount). `upiCard()` gets class `upibig` and renders the QR `<img>` (if `upiQrUrl`) + `code.upi-id` + the two buttons; the `donate.soon` notice path is unchanged.

- [ ] **Step 5: Run** `npx playwright test tests/e2e/donate.spec.js tests/e2e/public.spec.js` → PASS.

- [ ] **Step 6: Commit**

```bash
git add js/pages/events.js js/pages/donate.js tests/e2e/public.spec.js tests/e2e/donate.spec.js tests/e2e/admin.spec.js tests/seed/seed.js docs/build-log.md
git commit -m "feat(pages): events day tabs with live row and past accordion; donate purpose cards + restructured UPI/WhatsApp/wall"
```

---

### Task 10: Transparency (summary strip + bars + donut + documents accordion + legal block) and Members (restyle)

**Files:**
- Rewrite render: `js/pages/transparency.js`; restyle only: `js/pages/members.js`
- Modify: `tests/e2e/transparency.spec.js` (document link assertion)

- [ ] **Step 1: Test first** — in `transparency.spec.js` first test replace the `a` locator line with:
`await expect(page.locator('.acc details a', { hasText: 'অডিট ২০২৫' })).toHaveAttribute('href', 'https://example.com/audit-2025.pdf');` and add `await expect(page.locator('.legal')).toContainText('WB/2026/DEMO');`. Keep `.tabs button`, `.tabs button.active`, `.summary` assertions (they still hold).

- [ ] **Step 2: Run** `npx playwright test tests/e2e/transparency.spec.js` → new lines FAIL.

- [ ] **Step 3: transparency.js render** (data/tab logic unchanged; only `body` and the frame change)

```js
      const body = errored ? el('p', { class: 'muted', text: t('common.error') }) : !data ? el('p', { class: 'muted', text: t('common.empty') }) : (() => {
        const inc = data.income ?? [], exp = data.expense ?? [], it = sum(inc), et = sum(exp), bal = it - et, docs = data.documents ?? [];
        const top = [...exp].sort((a, b) => b.amount - a.amount)[0];
        return el('div', {},
          el('div', { class: 'summary sum' }, el('div', {}, el('small', { text: t('tr.income') }), el('b', { text: inr(it, lang) })),
            el('div', {}, el('small', { text: t('tr.expense') }), el('b', { text: inr(et, lang) })),
            el('div', {}, el('small', { text: t('tr.balance') }), el('b', { class: bal < 0 ? 'neg' : 'g', text: inr(bal, lang) }))),
          el('div', { class: 'ledger' }, el('div', {}, el('h2', { text: t('tr.income') }), barsView(inc, lang), el('h2', { text: t('tr.expense') }), barsView(exp, lang, { kind: 'expense' })),
            exp.length ? donutView(exp, lang, { big: `${yearLabel(et ? Math.round((top.amount / et) * 100) : 0)}%`, small: top ? pick(top.category, lang) : '' }) : null),
          el('div', { class: 'card' }, el('h2', { text: t('tr.income') }), ledgerTable(inc, lang)),
          el('div', { class: 'card' }, el('h2', { text: t('tr.expense') }), ledgerTable(exp, lang)),
          docs.length ? el('div', { class: 'acc' }, ...docs.map((d, i) => el('details', i === 0 ? { open: '' } : {}, el('summary', { text: pick(d.title, lang) }),
            el('p', {}, el('a', { href: d.url, target: '_blank', rel: 'noopener', text: pick({ bn: 'ডাউনলোড ↓', en: 'Download ↓' }) }))))) : null,
          el('div', { class: 'legal' }, el('b', { text: pick({ bn: 'আইনি তথ্য', en: 'Legal' }) }),
            el('div', {}, t('tr.regNo'), el('span', { text: s.regNo || pick({ bn: 'প্রক্রিয়াধীন', en: 'in progress' }) })),
            el('div', {}, '80G', el('span', { text: s.has80G ? t('donate.tax80g') : pick({ bn: 'রেজিস্ট্রেশনের পরে', en: 'after registration' }) })),
            el('div', {}, pick({ bn: 'ঠিকানা', en: 'Address' }), el('span', { text: pick(s.address) }))),
          data.notes && pick(data.notes, lang) ? el('p', { class: 'muted', text: pick(data.notes, lang) }) : null);
      })();
      main.replaceChildren(pageHeader({ crumb: t('nav.transparency'), title: t('tr.title'), lead: headerParts.join(' · ') }), section(tabsEl, body));
```
Imports: `pageHeader, section` from shell, `barsView, donutView` from ledger-view.

- [ ] **Step 4: members.js** — wrap: logged-out → `pageHeader({ crumb: t('mem.title'), title: t('mem.phone') })` + `section(el('div', { class: 'mem' }, el('div', { class: 'otp card' }, …existing form nodes…)))`; logged-in → `pageHeader` + `section(el('div', { class: 'dash' }, …existing `.card` blocks…))`. Keep every existing class (`.card h2`, `.stats .stat b`, `.row.otp`, `p.muted` empties) and all logic. Verify with `npx playwright test tests/e2e/members.spec.js` (needs the members project: run `npx playwright test --project=members`).

- [ ] **Step 5: Run** `npx playwright test tests/e2e/transparency.spec.js && npx playwright test --project=members` → PASS.

- [ ] **Step 6: Commit**

```bash
git add js/pages/transparency.js js/pages/members.js tests/e2e/transparency.spec.js docs/build-log.md
git commit -m "feat(pages): transparency summary/bars/donut/documents/legal; members page restyled in the shared frame"
```

---

### Task 11: Admin form fields — `officer`, `featured`, `donatePurposes`, `culture` visibility

**Files:**
- Modify: `admin/js/sections/committee.js`, `admin/js/sections/albums.js`, `admin/js/sections/settings.js`, `tests/seed/seed.js` (c1 `officer: true`, a1 `featured: true`)

- [ ] **Step 1: Test first** — `public.spec.js` "drafts and hidden rows" already asserts `.officers .officer, .mgrid .mrow` count 1; add to the gallery line `await expect(page.locator('.best a')).toHaveCount(1);` (a1 featured with a cover). Run → FAIL (seed lacks the flags; forms can't set them).

- [ ] **Step 2: committee.js** — add `officer: boolField({ bn: 'পদাধিকারী (সামনে দেখাও)', en: 'Office-bearer (show first)' }, 'officer', cur.officer ?? false)` to `f` and `officer: f.officer.read()` to `data`.
- [ ] **Step 3: albums.js** — add `featured: boolField({ bn: 'সেরা মুহূর্ত strip-এ দেখাও', en: 'Show in best-moments strip' }, 'featured', cur.featured ?? false)` to `f` and `data.featured = f.featured.read()` inside `read()`.
- [ ] **Step 4: settings.js** — `SECTIONS` gains `'culture'`; add `donatePurposes: textField({ bn: 'দানের খাত — প্রতি লাইনে: বাংলা | English | 501,1101', en: 'Donation purposes — per line: bn | en | 501,1101' }, 'donatePurposes', cur.donatePurposes ?? '')` but as a **textarea**: `forms.js` `textField` is input-only, so add `{ multiline = false }` to `textField` (`el(multiline ? 'textarea' : 'input', …)`, set `.value` after creation for textarea, `rows = 4`) and pass `{ multiline: true }`. Include `donatePurposes: f.donatePurposes.read()` in `next`. **Do not** touch `design` here — the 🎨 card owns it (a settings save must not clear it: `setDoc(..., { merge: true })` already leaves absent fields alone).
- [ ] **Step 5: seed.js** — `committee/c1` gets `officer: true`, `c2` `officer: false`; `albums/a1` gets `featured: true`, `a2` `featured: false`.
- [ ] **Step 6: Run** `npm run seed && npx playwright test --project=public && npx playwright test --project=admin` → PASS (admin tile count still 12 until Task 12).
- [ ] **Step 7: Commit**

```bash
git add admin/js/sections/committee.js admin/js/sections/albums.js admin/js/sections/settings.js admin/js/forms.js tests/seed/seed.js tests/e2e/public.spec.js docs/build-log.md
git commit -m "feat(admin): officer, featured-album and donation-purpose fields; culture section visibility"
```

---

### Task 12: Admin 🎨 ডিজাইন card

**Files:**
- Create: `admin/js/sections/design.js`
- Modify: `admin/js/admin.js` (import after settings), `css/admin.css` (swatches), `js/i18n.js` (strings), `tests/e2e/admin.spec.js` + `tests/e2e/live.spec.js` (tile count 13), `tests/e2e/theme.spec.js` (apply test)

- [ ] **Step 1: Tests first**
  - Change both `toHaveCount(12)` → `toHaveCount(13)` (admin.spec `login()`, live.spec).
  - Append to `theme.spec.js`:

```js
test('admin applies a theme from the 🎨 card; the public site reflects it; audit row written', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(13);
  await page.goto('/admin/#design');
  await expect(page.locator('.theme-tile')).toHaveCount(5);
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
  page.on('dialog', d => d.accept('password12345'));
  await page.click('.theme-tile[data-theme-name="atreyee"] button.apply');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'atreyee');
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atreyee');
  // restore for the other specs (theme.spec runs inside the 'public' project before 'admin')
  await page.goto('/admin/#design');
  await page.click('.theme-tile[data-theme-name="siddhi"] button.apply');
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/theme.spec.js` → FAIL (no `#design` section).

- [ ] **Step 3: i18n strings** (append to `STRINGS`): `'admin.design': { bn: 'ডিজাইন', en: 'Design' }`, `'admin.designApply': { bn: 'চালু করুন', en: 'Apply' }`, `'admin.designCurrent': { bn: 'চালু আছে', en: 'Current' }`, `'admin.designPreview': { bn: 'প্রিভিউ', en: 'Preview' }`, `'admin.designHint': { bn: 'যেটা বাছবেন সেটাই সবার কাছে দেখাবে। প্রিভিউ শুধু আপনার ট্যাবে।', en: 'The one you apply is what everyone sees. Preview affects only your tab.' }`.

- [ ] **Step 4: `admin/js/sections/design.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { THEMES, THEME_META, resolveTheme } from '../../../js/theme.js';
import { logAudit } from '../audit.js';

registerSection('design', {
  title: { bn: 'ডিজাইন', en: 'Design' }, icon: '🎨',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const current = resolveTheme(cur.design);
    const grid = el('div', { class: 'theme-grid' }, ...THEMES.map(name => {
      const meta = THEME_META[name];
      const applyBtn = el('button', { class: 'btn apply', type: 'button', text: name === current ? t('admin.designCurrent') : t('admin.designApply'), disabled: name === current });
      applyBtn.onclick = async () => {
        if (!(await ctx.reauth())) return;
        try {
          const next = { design: name, updatedAt: serverTimestamp() };
          await setDoc(ref, next, { merge: true });
          await logAudit(ctx, 'update', 'settings/site', { design: cur.design ?? null }, { design: name });
          toast(t('admin.saved'));
          box.replaceChildren(); await this.render(box, ctx);
        } catch (err) {
          console.error(err);
          toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
        }
      };
      return el('div', { class: `card theme-tile${name === current ? ' current' : ''}`, 'data-theme-name': name },
        el('div', { class: 'swatch', 'data-theme': name }, el('i', { class: 's1' }), el('i', { class: 's2' }), el('i', { class: 's3' }), el('i', { class: 's4' })),
        el('h3', { text: pick(meta.name) }), el('p', { class: 'muted', text: pick(meta.desc) }),
        el('div', { class: 'row' }, el('a', { class: 'btn secondary', href: `../index.html?theme=${name}`, target: '_blank', rel: 'noopener', text: t('admin.designPreview') }), applyBtn));
    }));
    box.append(el('p', { class: 'muted', text: t('admin.designHint') }), grid);
  },
});
```
`admin.js`: add `import './sections/design.js'; // Phase 5` right after the settings import. `admin/index.html`: add `<link rel="stylesheet" href="../css/themes.css">` after `admin.css` so `.swatch[data-theme]` resolves each theme's tokens (the swatch reads `--bg`, `--sindoor`, `--pitambar`, `--ivory` from the scoped block — `[data-theme]` selectors match the swatch element itself). `css/admin.css`:

```css
.theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.75rem}
.theme-tile.current{outline:3px solid var(--accent)}
.swatch{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;height:56px;border-radius:8px;overflow:hidden;margin-bottom:.5rem}
.swatch .s1{background:var(--bg)}.swatch .s2{background:var(--sindoor)}.swatch .s3{background:var(--pitambar)}.swatch .s4{background:var(--ivory)}
```
Also copy the siddhi `:root` token lines into a `.swatch[data-theme="siddhi"]{…}` block in `admin.css` (site.css is not loaded in admin).

- [ ] **Step 5: Run** `npm run seed && npm run e2e` → all projects PASS (public incl. theme, members, admin). Also `npm test` (unit + rules) → PASS.

- [ ] **Step 6: Commit**

```bash
git add admin/js/sections/design.js admin/js/admin.js admin/index.html css/admin.css js/i18n.js tests/e2e/admin.spec.js tests/e2e/live.spec.js tests/e2e/theme.spec.js docs/build-log.md
git commit -m "feat(admin): 🎨 ডিজাইন card — preview and apply one of five themes with re-auth and audit"
```

---

### Task 13: Screenshot matrix, docs, rules deploy, production verification

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `.gitignore` (`test-results/`), `docs/user-guide/admin-guide.md` (13 cards + 🎨 section), `docs/PROJECT_CONTEXT.md` (§6 State as of 2026-09-10), `docs/pending.md` (Phase 5 done; owner steps), `README.md` (themes line), `docs/build-log.md`

- [ ] **Step 1: `scripts/shots.mjs`**

```js
// Renders every public page × five themes × three widths against the local server (emulator + seed
// running). Output: test-results/shots/<theme>/<page>-<width>.png. Usage: node scripts/shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const THEMES = ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh'];
const PAGES = ['index', 'about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members'];
const WIDTHS = [390, 768, 1366];
const base = process.env.BASE_URL || 'http://127.0.0.1:5500';
const browser = await chromium.launch();
for (const theme of THEMES) {
  mkdirSync(`test-results/shots/${theme}`, { recursive: true });
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const p of PAGES) {
      await page.goto(`${base}/${p}.html?theme=${theme}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.warn(`OVERFLOW ${theme}/${p}@${w}: ${overflow}px`);
      await page.screenshot({ path: `test-results/shots/${theme}/${p}-${w}.png`, fullPage: true });
    }
    await page.close();
  }
}
await browser.close();
console.log('done → test-results/shots/');
```
Run it (`node scripts/shots.mjs`), open at least `siddhi/index-390.png`, `mukha/donate-1366.png`, `dhokra/transparency-768.png` with the Read tool and fix anything clipped/overlapping in CSS. Zero `OVERFLOW` warnings is the gate.

- [ ] **Step 2: Docs**
  - `admin-guide.md`: dashboard table → 13 rows, new row `| 🎨 ডিজাইন | সাইটের রূপ — পাঁচটার একটা বাছুন (প্রিভিউ → চালু করুন); সেটিংস-এ "এই বছরের থিম" আলাদা জিনিস |`; new section "## ডিজাইন বদলানো" (Preview opens the public site in a new tab with `?theme=`; Apply asks the password; everyone sees the new look on next load; the five names and what each means, from `THEME_META`). Also document the three new form fields.
  - `PROJECT_CONTEXT.md`: add "## 6. State as of 2026-09-10 — Phase 5" with what shipped, decisions (from the spec §2), test counts.
  - `pending.md`: Phase 5 shipped; owner steps: pick the theme in 🎨, mark officers, mark featured albums, fill দানের খাত, upload real photos + logo PNG (`settings.logoUrl`).
  - `README.md`: one line on themes + `node scripts/shots.mjs`.

- [ ] **Step 3: Full local gate**

Run: `npm test && npm run seed && npm run e2e`
Expected: unit ≥ 51 + 11 new, rules 21, e2e 22 + 3 new — all green. Paste the three summary lines into the build-log entry.

- [ ] **Step 4: Deploy rules + push**

```bash
scripts/deploy-rules.sh
git add scripts/shots.mjs .gitignore docs/ README.md
git commit -m "docs(phase-5): screenshot matrix script, admin guide, project context, pending; rules deployed"
git push origin main
```

- [ ] **Step 5: Verify live**

After GitHub Pages rebuilds (~1 min): with Playwright against `https://hrishi91.github.io/trust_webpage/`, load `index.html` (expect `data-theme="siddhi"`, `.hero svg.ganesh` visible, no console errors), `index.html?theme=dhokra` (dark tokens), and every other page once at 390 px (no overflow). Record URLs + results in the build-log. Then tell the owner: open `/admin/` → 🎨 ডিজাইন → প্রিভিউ each → চালু করুন the one he wants.

---

## Self-review

- **Spec coverage:** §1 themes+card (Tasks 1, 3, 12) · page anatomy (Tasks 6–10) · art (Task 4) · §3 data fields (Tasks 5, 11) · §4 rule + whitelist + audit + no-innerHTML (Tasks 1, 2, 4, 12) · §5 admin UX (Tasks 11, 12) · §6 unit/rules/e2e/screenshots (Tasks 1, 2, 3, 5, 7, 9, 10, 12, 13). Gap check: "nav collapses to logo + burger" (Task 5), "one thumb-reachable Donate on every page" — covered by the hero CTA on home and the footer/nav link elsewhere; a fixed bottom-sheet button is **not** built (YAGNI until the owner asks — noted in pending.md by Task 13).
- **Placeholders:** the only "copy from" instructions point at exact lines of a committed file (`docs/design/concept/full-site-concept.html`), which is the approved artwork — not a placeholder.
- **Type consistency:** `resolveTheme(design, search)` / `applyTheme(name, {persist})` / `isPreview(search)` used identically in Tasks 1, 5, 12; `pageHeader({crumb,title,lead})`, `section(...)`, `sectionHead(title, aside)` in Tasks 5, 8, 9, 10; `barsView(rows, lang, {kind})`, `donutView(rows, lang, {big, small})` in Tasks 7, 10; `parsePurposes(text)` in Tasks 7, 9; `paintHero/paintGarland/paintHeader/onResize/ganeshSvg/diyaSvg` in Tasks 4, 5, 6; admin tile count 13 in Tasks 12 (both specs); seed `design/donatePurposes/officer/featured` in Tasks 9, 11.
