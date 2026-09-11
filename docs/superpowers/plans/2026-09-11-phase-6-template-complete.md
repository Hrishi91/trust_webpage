# Phase 6 — Nothing Static (template-complete) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every visible string, image, colour, font, section order and link on the public site is editable from `/admin/` on a phone; code keeps layout + the current defaults, so an untouched site renders exactly as today.

**Architecture:** Overrides layered over code defaults. `content/strings` (one doc, `{key:{bn,en}}`) overrides `STRINGS` via `t()`; `content/media` (one doc, `{slot:url}`) fills a fixed slot registry (`js/media-slots.js`) with drawn-art fallbacks; `culture/{id}` collection replaces the static cards; `settings.designOverrides/fonts/homeSections/social/estYear/credItems/metaDescription` extend settings and are validated in rules. `js/shell.js` loads settings + both content docs in one `Promise.all` before first paint and applies string/colour/font overrides. Four admin cards (✏️ লেখা, 🖼️ UI ছবি, 🏺 সংস্কৃতি, 🎨 extended) + ⚙️ additions.

**Tech Stack:** unchanged (Firebase 12.18.0 CDN, rules, Playwright, `node --test`).

Spec: `docs/superpowers/specs/2026-09-11-phase-6-template-complete.md`. Conventions: Phase 5 plan (`2026-09-10-phase-5-design-system.md`) — subagent briefs, bridge CSS may only add, `el()` from `js/ui.js`, admin toolkit in `admin/js/forms.js` + `admin/js/upload.js` (`imageField(ctx,label,url,{folder,max})` → `{node, read(), set()}`), sections self-register via `registerSection(key, def)`.

## Global Constraints

- Everything from Phases 0–5: default-deny rules, no hard deletes (`deleted` boolean via `saveDoc`), `{bn,en}` fields, no `innerHTML` outside `js/rich.js`, bridge CSS only adds, docs in the same commit (`docs/build-log.md`, one heading per task, no sub-headings), `npm test` green before any rules deploy, one subject per commit, English code/commits.
- **Defaults are the current site.** Every override is optional; missing/invalid overrides fall back silently (console.warn at most). No page may render empty because a content doc is absent.
- Theme names `siddhi|mukha|dhokra|atreyee|bangarh` unchanged. Override token keys (camelCase in data → `--kebab` in CSS): `bg, bg2, ivory, ivory2, ink, muted, sindoor, pitambar, durva, gold, cta, ctaInk, card, heroAccent, ticker­Ink` → exactly this list in `js/theme.js` `OVERRIDE_KEYS` and in `firestore.rules`. Values `^#[0-9a-fA-F]{6}$` only. Fonts whitelist exactly `['Baloo Da 2','Hind Siliguri','Tiro Bangla','Atma']`. Home section keys exactly `['hero','cred','glance','story','culture','gallery','schedule','ledger','donate','committee','members']`.
- Media slot ids exactly: `hero, brandMark, favicon, og, garland, header.about, header.committee, header.gallery, header.events, header.donate, header.transparency, header.members, donateBand, membersTeaser`. Uploads go to Storage `public/ui/`.
- Security: public code sets media URLs only as `src`/`href` attributes; string overrides only via `textContent`; colour overrides re-validated client-side before `style.setProperty`; admin writes re-auth + audit as today.
- e2e selectors from Phases 0–5 keep working (`.brand`, `.countdown b`, `.hero svg.ganesh`, `.bento .tile b`, `.grid .tile` count → **17** after this phase: +✏️ লেখা, +🖼️ UI ছবি, +🏺 সংস্কৃতি (design card already counted) — update `admin.spec.js`, `live.spec.js`, `transparency.spec.js`, `theme.spec.js`), `.live-strip .pulse`, `.donor`, `.tabs button.active`, `.summary`, `.stats .stat b`, `.card h2`, `.ph h1`.
- Run order for e2e unchanged (`npm run emu` → `npm run seed` → `npm run e2e`); `npm test` needs the dev emulator stopped.

---

## File structure

```
js/i18n.js                 MODIFY — STRINGS gains every inline literal as a key; setOverrides(map); t() = override ?? default
js/theme.js                MODIFY — OVERRIDE_KEYS, FONTS, applyOverrides(overrides, fonts), clearOverrides()
js/media-slots.js          NEW pure — SLOTS registry [{id, label:{bn,en}, where:{bn,en}, folder}] ; mediaUrl(media, id)
js/sections.js             NEW pure — HOME_SECTIONS, orderSections(list) → [{key,on}] (validated, missing keys appended on)
js/content.js              MODIFY — getContent() (strings+media), listCulture(); DEFAULT_SETTINGS additions
js/shell.js                MODIFY — loads content, applies overrides before render; social links + credItems in footer; document.title/description
js/pages/home.js           MODIFY — section order from settings; hero photo mode; culture from collection; cred items; media slots
js/pages/{about,…,members}.js MODIFY — header image slot; all inline literals → t(key)
js/culture.js              KEEP — becomes the default/fallback list (+ used to seed)
css/site.css               APPEND — .hero.photo, .ph.photo, .ccard img, .donate img etc. (bridge, add-only)
firestore.rules            MODIFY — content/{doc}, culture/{id}, validOverrides()/validFonts()/validHomeSections() on settings
firestore.indexes.json     MODIFY — culture published+deleted+order
admin/js/sections/strings.js  NEW — ✏️ লেখা
admin/js/sections/media.js    NEW — 🖼️ UI ছবি
admin/js/sections/culture.js  NEW — 🏺 সংস্কৃতি
admin/js/sections/design.js   MODIFY — colours/fonts/home sections
admin/js/sections/settings.js MODIFY — social, estYear, credItems, metaDescription
admin/js/admin.js          MODIFY — imports (order: announcements, settings, design, strings, media, culture, history, …)
tests/unit/{i18n,theme,sections,media-slots}.test.js · tests/rules/firestore.test.js · tests/e2e/content.spec.js (new) + count updates
tests/seed/seed.js         MODIFY — content docs + culture rows
docs: build-log, admin-guide (17 cards + four sections), PROJECT_CONTEXT §7, pending
```

---

### Task 1: i18n overrides + every inline literal becomes a key

**Files:** Modify `js/i18n.js`, `js/shell.js`, `js/pages/*.js`, `admin/js/admin.js` (the `ড্যাশবোর্ড` back label), `admin/js/sections/*.js` (inline `pick({bn,en})` labels → keys under `admin.*`) · Test `tests/unit/i18n.test.js`.

**Interfaces:** `setOverrides(map: {[key]:{bn?,en?}}|null)`; `getOverrides()`; `t(key, lang?)` = `overrides[key]?.[lang]` (non-empty string) ?? `STRINGS[key]` pick ?? key; `STRING_GROUPS = { nav:[keys], buttons:[…], home:[…], about:[…], committee:[…], gallery:[…], events:[…], donate:[…], transparency:[…], members:[…], footer:[…], live:[…], countdown:[…], admin:[…], common:[…] }` (every key in exactly one group); `defaultString(key)`.

- [ ] **Step 1: failing tests** (append to `tests/unit/i18n.test.js`):
```js
import { t, setOverrides, getOverrides, STRINGS, STRING_GROUPS, defaultString } from '../../js/i18n.js';
test('override wins over default; empty/missing override falls back', () => {
  setOverrides({ 'nav.home': { bn: 'শুরু', en: '' } });
  assert.equal(t('nav.home', 'bn'), 'শুরু'); assert.equal(t('nav.home', 'en'), 'Home');
  setOverrides(null); assert.equal(t('nav.home', 'bn'), 'হোম');
});
test('setOverrides ignores non-object and non-string values', () => {
  setOverrides({ 'nav.home': 'x', 'nav.about': { bn: 7 } }); assert.deepEqual(getOverrides(), {}); setOverrides(null);
});
test('every STRINGS key is in exactly one group', () => {
  const all = Object.values(STRING_GROUPS).flat();
  assert.deepEqual([...all].sort(), Object.keys(STRINGS).sort());
  assert.equal(new Set(all).size, all.length);
});
test('defaultString returns the untouched default even when overridden', () => {
  setOverrides({ 'nav.home': { bn: 'x' } }); assert.equal(defaultString('nav.home', 'bn'), 'হোম'); setOverrides(null);
});
```
- [ ] **Step 2:** run → FAIL. **Step 3:** implement in `js/i18n.js`; add keys for every inline literal found by `grep -n "pick({ bn:" js/pages/*.js js/shell.js js/pages/home.js` and single-language literals (`'Registered Trust'`, `'80G'`, `'WhatsApp'`, `'PDF'`, `'+91'`, `'Menu'`, `'‹ '` prefix stays code) — name them by page: `home.glance`, `home.pujaStarts`, `home.nextEvent`, `home.thisTheme`, `home.ledgerPublished`, `home.donateLead`, `home.donateHeading`, `home.donateHeadingEm`, `home.membersHeading`, `home.membersLead`, `home.cultureHeading`, `home.culturePill`, `home.allMembers`, `about.title`, `about.crumb`, `committee.title`, `committee.members`, `gallery.best`, `donate.purposeHeading`, `donate.afterDonating`, `donate.wallNote`, `tr.download`, `tr.legal`, `tr.inProgress`, `tr.afterReg`, `tr.address`, `footer.contact`, `footer.pages`, `footer.trust`, `footer.map`, `footer.whatsapp`, `nav.menu`, `cred.registered`, `cred.80g`, `admin.dashboard`, … (list every key you add in the report). Replace each literal with `t(key)`. Keep `pick()` for data fields. **Step 4:** `npm run test:unit` green; e2e `--project=public` green (texts unchanged). **Step 5:** commit `feat(i18n): string overrides layer; every UI literal is a keyed default`.

### Task 2: Rules + content reads + seed

**Files:** `firestore.rules`, `firestore.indexes.json`, `tests/rules/firestore.test.js`, `js/content.js`, `tests/seed/seed.js`.

**Interfaces:** `getContent() → Promise<{strings:{}, media:{}}>` (memoised like `getSettings`, each doc failing independently → `{}`); `listCulture() → rows` (published+!deleted, orderBy order; permission/other errors → throw like `listPublished`); `DEFAULT_SETTINGS` += `designOverrides:{}, fonts:{display:'',body:''}, homeSections:[], social:{facebook:'',youtube:'',instagram:'',whatsappGroup:''}, estYear:'', credItems:'', metaDescription:{bn:'',en:''}`.

- [ ] Rules tests first (append): `content/strings` + `content/media` anon read ok / anon write fails / admin set ok / `content/other` admin write fails / delete fails; `culture` read gate like committee (published+!deleted public; draft only admin) and write needs `deleted` bool; settings: `designOverrides:{sindoor:'#c9361a'}` ok, `{sindoor:'red'}` fails, `{evil:'#000000'}` fails, `fonts:{display:'Atma'}` ok, `{display:'Comic Sans'}` fails, `homeSections:[{key:'hero',on:true}]` ok, `[{key:'x',on:true}]` fails, `'nope'` fails. Run → FAIL.
- [ ] Rules:
```
    function hexColor(v) { return v is string && v.matches('^#[0-9a-fA-F]{6}$'); }
    function validOverrides() {
      return !('designOverrides' in request.resource.data) || (
        request.resource.data.designOverrides is map
        && request.resource.data.designOverrides.keys().hasOnly(['bg','bg2','ivory','ivory2','ink','muted','sindoor','pitambar','durva','gold','cta','ctaInk','card','heroAccent','tickerInk'])
        && request.resource.data.designOverrides.values().toSet().size() == request.resource.data.designOverrides.values().toSet().size()   // placeholder removed below
      );
    }
```
  Rules cannot iterate values; validate each whitelisted key individually: `(!('bg' in o) || hexColor(o.bg)) && (!('bg2' in o) || hexColor(o.bg2)) && …` for all 15 keys (write them out). `validFonts()`: map, `keys().hasOnly(['display','body'])`, each present value `in ['Baloo Da 2','Hind Siliguri','Tiro Bangla','Atma']`. `validHomeSections()`: `is list && size() <= 11`; per-element validation is not expressible in rules → validate on read in `js/sections.js` (documented); rules only check list type/size. `settings/site` write: `isAdmin() && validDesign() && validOverrides() && validFonts() && validHomeSections()`. Add `match /content/{doc} { allow read: if true; allow create, update: if isAdmin() && doc in ['strings','media']; allow delete: if false; }` and `match /culture/{id}` = committee pattern with `isLive()`.
- [ ] Index: `culture` `published ASC, deleted ASC, order ASC`. `content.js` functions. Seed: `content/strings` `{}`, `content/media` `{}`, `culture/cu1..cu3` from `js/culture.js` (import it) with `published:true, order:1..3, imageUrl:''`, plus `cu4` draft. Run `npm run test:rules` → green (count +8ish). Commit `feat(rules,content): content docs, culture collection, settings override validation`.

### Task 3: Media slots + public rendering of overrides (strings, media, colours, fonts, culture, sections, social, cred, meta)

**Files:** `js/media-slots.js` (new), `js/sections.js` (new), `js/theme.js`, `js/shell.js`, `js/pages/*.js`, `css/site.css` (append), tests `tests/unit/{media-slots,sections,theme}.test.js`, `tests/e2e/content.spec.js` (new; register in playwright `public` project).

**Interfaces:**
- `js/media-slots.js`: `export const SLOTS = [{ id:'hero', label:{bn:'হিরো ছবি (প্রতিমা/ব্যানার)',en:'Hero image'}, where:{bn:'হোম-এর ওপরে, আঁকা গণেশের বদলে',en:'Home top, replaces the drawn Ganesh'}, folder:'public/ui/hero', max:1600 }, … all 14]`; `export function mediaUrl(media, id) → string` (`''` unless a `https://` string).
- `js/sections.js`: `HOME_SECTIONS` (11 keys in default order); `orderSections(list) → [{key,on}]`: keeps valid keys in given order (dedup), appends missing keys with `on:true`; non-list → default.
- `js/theme.js`: `OVERRIDE_KEYS` (15), `FONTS` (4), `applyOverrides(overrides, fonts)` sets `--<kebab>` on `document.documentElement.style` for valid entries and `--display`/`--body` to `"<font>", …fallback` for whitelisted fonts, clears the rest (`clearOverrides()`); persists JSON to `localStorage('designOverrides')`; head cache script in all 9 HTML files extended to re-apply cached overrides (`try{…JSON.parse… for each key if /^#[0-9a-fA-F]{6}$/ …setProperty}catch{}`).
- `js/shell.js`: `mountShell` does `const [s, c] = await Promise.all([getSettings(), getContent()])`; `setOverrides(c.strings)`; `applyTheme(...)`, `applyOverrides(s.designOverrides, s.fonts)`; returns `s` with `s.media = c.media` attached; `pageHeader({crumb,title,lead,image})` — when `image` set: `.ph.photo` with `<img class="ph-img" src alt="">` instead of the canvas; brand mark uses `mediaUrl(media,'brandMark')` else logo else ॐ; favicon: if `mediaUrl(media,'favicon')` set `<link rel=icon>` href at runtime; footer: social links row (only non-empty), `credItems` unaffected here; `document.title` + `<meta name=description>` from `metaDescription` when set.
- Home: sections rendered via `orderSections(s.homeSections)` map `{hero, cred, glance:bento, story, culture, gallery, schedule, ledger, donate:donateBand, committee, members:membersTeaser}` honouring `on` AND the existing `sectionVisibility` gates; hero: if `mediaUrl(media,'hero')` → `.hero.photo` with `<img>` in `.art` instead of `ganeshSvg()`/diyas (garland canvas replaced by `<img class="garland">` if slot `garland` set); cred: `estYear` → "Est. ২০২১"; `credItems` (parsed `bn | en` per line via `parseCredItems` in `js/sections.js`, unit-tested) appended; culture: `listCulture()` rows (fallback `CULTURE` when empty) with `<img>` when `imageUrl`; donate band + members teaser images from slots. Other pages: `pageHeader({…, image: mediaUrl(s.media,'header.<page>')})`.
- CSS (bridge, add-only): `.hero.photo .art img{width:min(100%,520px);border-radius:var(--r);box-shadow:…}`, `.ph.photo .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}`, `.ccard img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px}`, `.social{display:flex;gap:.6rem;flex-wrap:wrap}` etc.
- e2e `content.spec.js` (seed writes `content/strings` `{ 'nav.home': {bn:'শুরু',en:'Start'} }`? No — seed keeps `{}`; the test writes via emulator REST as owner, reloads, asserts nav text 'শুরু', then restores `{}`): string override; media hero slot (REST set `content/media` `{hero:'https://placehold.co/600x600'}` → `.hero.photo img` visible, no `svg.ganesh`; restore); `settings.homeSections` with `culture` off → no `.culture` section; `designOverrides:{sindoor:'#112233'}` → `getComputedStyle(html).getPropertyValue('--sindoor')` = `#112233`; culture card from seed visible (`.ccard` count 3, first title from cu1).
- Unit tests for `orderSections`, `parseCredItems`, `mediaUrl`, `applyOverrides` (fake document with `style.setProperty` spy), `SLOTS` ids unique and equal to the spec list.
- Commit(s): `feat(content): media slots, section order, colour/font overrides applied on the public site` (+ `feat(home): …` if split).

### Task 4: Admin ✏️ লেখা

**Files:** `admin/js/sections/strings.js` (new), `admin/js/admin.js` (import after design), `css/admin.css` (append), `js/i18n.js` (keys `admin.strings*`), e2e in `tests/e2e/admin.spec.js`.
- Render: search input (filters by key/default text), one `<details>` per `STRING_GROUPS` group (open the first), rows `.str-row` with `<code>key</code>`, bn/en inputs (`name="<key>.bn"`) prefilled `getOverrides()[key]?.bn ?? ''` with `placeholder = defaultString(key, 'bn')`, a `btn-sm` "default-এ ফেরাও" clearing both. Save button: re-auth, compute `next = { [key]: {bn,en} }` for rows whose inputs differ from stored override (empty both → `deleteField()` for that key), `setDoc(content/strings, next, {merge:true})`, audit `update content/strings` with before/after of changed keys, toast, `setOverrides` re-read on the public side happens on next load (admin panel's own labels update after reload — note in hint).
- e2e: login → `#strings` → fill `input[name="nav.home.bn"]` with 'শুরু' → save (dialog) → `/index.html` `.links a` first has text 'শুরু' → reset row → save → 'হোম'. Tile count → 17 in the four specs.
- Commit `feat(admin): ✏️ লেখা — edit every UI string with defaults as placeholders`.

### Task 5: Admin 🖼️ UI ছবি + 🏺 সংস্কৃতি

**Files:** `admin/js/sections/media.js`, `admin/js/sections/culture.js` (new), `admin/js/admin.js`, i18n keys, e2e.
- media.js: one `.card` per `SLOTS` entry: label, `where`, `imageField(ctx, …, current, {folder: slot.folder, max: slot.max})` (favicon/og: `max` 512/1200), "সরাও" button (sets `''`); Save: re-auth, `setDoc(content/media, {[id]: url…}, {merge:true})` writing only changed slots (removed → `deleteField()`), audit, toast.
- culture.js: `listView` + form (`title`, `tag`, `text` bi-fields; `imageField` folder `public/culture`; publish/draft like events) via `saveDoc`; reorder ↑↓ from `listView`.
- e2e: `#culture` create a card (publish) → home `.ccard` count 4; media: cannot upload a real file headlessly? Playwright `setInputFiles` with a small PNG generated in the test (`Buffer` of a 1×1 PNG) → upload to the Storage emulator → `content/media.hero` set → home `.hero.photo` — include this (Storage emulator is running in `npm run emu`).
- Commit `feat(admin): 🖼️ UI ছবি slots and 🏺 সংস্কৃতি cards`.

### Task 6: Admin 🎨 extended + ⚙️ additions

**Files:** `admin/js/sections/design.js`, `admin/js/sections/settings.js`, `js/contrast.js` (new pure: `contrast(hexA, hexB)` moved from the test; test imports it), `tests/unit/contrast.test.js`, `css/admin.css`, e2e.
- design.js gains below the theme tiles: **রং** — one row per `OVERRIDE_KEYS`: label, `<input type=color>` + hex text (synced), the theme's current value as placeholder, contrast badge vs its ground (`ink/muted→ivory`, `ctaInk→cta`, `heroAccent/heroInk→bg`, `tickerInk→sindoor`, others "—") ✓ ≥4.5 / ⚠ <4.5 (non-blocking), "থিমের রং-এ ফেরাও" per row; **ফন্ট** — two `<select>` (display/body) from `FONTS` + "থিমের ফন্ট"; **হোম-এর section** — list from `orderSections(cur.homeSections)` with label, on/off checkbox, ↑↓; one Save: re-auth, `setDoc(settings/site, {designOverrides, fonts, homeSections}, {merge:true})`, audit, `applyOverrides` immediately (admin follows). Preview link unchanged.
- settings.js gains `social.*` (4 textFields, url type), `estYear` (number), `credItems` (multiline textField, `bn | en` per line), `metaDescription` (biField multiline).
- e2e: set `sindoor` to `#112233` via the colour text input → save → public `--sindoor`; reset → theme value; move `culture` off → home has no `.culture`; restore.
- Commit `feat(admin): design colours/fonts/home-section order; settings social/estYear/credItems/meta`.

### Task 7: Seed production defaults + docs + deploy + live

**Files:** docs (`admin-guide.md` 17-card table + four sections; `PROJECT_CONTEXT.md` §7; `pending.md`; `README.md`; build-log), `scripts/seed-culture.mjs`? — NO new prod script: write the three culture cards on production with the owner OAuth REST pattern from build-log (dummy-safe: they are the current static defaults) and `content/strings`/`content/media` as `{}`; deploy rules + indexes (`scripts/deploy-rules.sh`); push; live verify (`/index.html` `.ccard` ×3 from collection, `/admin/` 17 tiles after login is owner-only — verify tile count locally; live: `#strings` route renders the login gate without console errors).
- Full gate before deploy: unit, rules (dev emulator stopped), e2e (all projects), `node scripts/shots.mjs` exit 0, admin screenshots of the four cards at 390/1366 inspected.

### Task 8: Final whole-branch review (controller) — fix wave, park, finish.

## Self-review
- Spec §1 rows → Tasks 1 (strings), 3+5 (media, culture), 3+6 (colours/fonts/sections), 3+6 (social/est/cred/meta). §4 security → Task 2 rules + Task 3 client re-validation. §5 admin → Tasks 4–6. §6 verification → each task's tests + Task 7 gate. Placeholders: rules per-key validation is written out in Task 2 (no "…" allowed in the file — the implementer expands all 15). Type consistency: `mediaUrl(media,id)`, `orderSections(list)`, `applyOverrides(overrides, fonts)`, `setOverrides/getOverrides/defaultString/STRING_GROUPS`, `SLOTS`, `OVERRIDE_KEYS`, `FONTS`, `HOME_SECTIONS`, `listCulture`, `getContent` used identically across tasks.
