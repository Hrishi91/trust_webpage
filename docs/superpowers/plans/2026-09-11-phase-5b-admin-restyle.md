# Phase 5b — Admin panel in the site's design system Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The admin panel (`/admin/`) uses the same theme tokens, fonts and component language as the public site, and follows the theme the admin picked in 🎨 ডিজাইন — with zero change to admin behaviour, markup or e2e selectors.

**Architecture:** Move the default (সিদ্ধি) token block out of `css/site.css` into a new `css/tokens.css` that every HTML page (public + admin) loads before its stylesheet; `css/themes.css` keeps the four overrides. `css/admin.css` is rewritten against the tokens (`--bg` header, `--card`/`--line`/`--r` cards, `--cta` buttons, `--display`/`--body` fonts). `admin/index.html` gets the same head cache script + fonts link as the public pages; `admin/js/admin.js` applies the stored theme at load (public read of `settings/site`) and `design.js` re-applies after Apply. The contrast test parses `tokens.css` for `:root`.

**Tech Stack:** unchanged. Owner request 2026-09-11: "admin page tao same design e restyle koro".

## Global Constraints

- All Phase 5 constraints bind: no build step; no `innerHTML`; bridge/site CSS unchanged except the `:root` move; token names unchanged; contrast floors unchanged (test must keep passing on the moved block); `?theme=` preview never persists; theme names exactly `siddhi|mukha|dhokra|atreyee|bangarh`.
- **Admin behaviour is frozen**: no change to any `admin/js/sections/*` markup, ids, class names, labels or logic beyond the two theme-apply lines in `admin.js`/`design.js`. e2e selectors that must keep working: `.grid .tile` (13), `#adm-login-form`, `input[name=email|password]`, `button[type=submit]`, `#adm-login-err`, `.toast`, `button.danger`, `.theme-tile[data-theme-name]`, `.theme-tile.current`, `button.apply`, `textarea[name="text.bn"]`, `#adm-main`, `.list-item`, `.badge.pub`.
- Touch targets ≥ 44 px for every button/input; body text contrast ≥ 4.5 on `--ivory`/`--card`; no horizontal overflow at 390 px on login, dashboard, settings, design, albums list, transparency form.
- Fonts: the same Google Fonts link as the public pages (Baloo Da 2, Hind Siliguri, Tiro Bangla, Atma), `display=swap`.
- Docs in the same commit (`docs/build-log.md`), admin guide screenshots/wording unchanged unless a label moved (none should).

---

### Task 1: `css/tokens.css` + admin restyle + theme follow

**Files:**
- Create: `css/tokens.css` (the `:root{…}` block cut verbatim from `css/site.css` lines 1–11, including `--focus`, `--hero-accent`, `--ticker-ink`, `color-scheme:light`)
- Modify: `css/site.css` (remove the `:root` block; first line becomes the `/* ===== base ===== */` comment), `tests/unit/contrast.test.js` (read `:root` from `css/tokens.css`), all 8 public `*.html` (add `<link rel="stylesheet" href="css/tokens.css">` immediately before `css/site.css`), `admin/index.html` (head: inline cache script + preconnects + fonts link + `../css/tokens.css` + `../css/themes.css` + `../css/admin.css`, in that order), `css/admin.css` (rewrite), `admin/js/admin.js` (apply theme at load), `admin/js/sections/design.js` (apply after write), `docs/build-log.md`, `docs/user-guide/admin-guide.md` (one line: admin follows the chosen theme), `docs/PROJECT_CONTEXT.md` (§6 one bullet).

**Interfaces:**
- Consumes: `resolveTheme`, `applyTheme` from `js/theme.js`; `getDoc(doc(db,'settings','site'))` (public read).
- Produces: nothing new for others.

- [ ] **Step 1: Failing checks first**
  - `tests/unit/contrast.test.js`: change `site` → read `css/tokens.css` for the `:root` match (keep the themes parse). Run `node --test tests/unit/contrast.test.js` → FAIL (`ENOENT css/tokens.css`).
  - Add to `tests/e2e/admin.spec.js` a test `admin panel follows the stored theme and uses the site fonts`: login, `expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi')`; `expect(await page.locator('.adm-top').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(15, 18, 48)')` (siddhi `--bg`); every `.grid .tile` bounding box height ≥ 44; then `page.goto('/admin/#design')`, dialog handler accepting `password12345`, click `.theme-tile[data-theme-name="atreyee"] button.apply`, `expect(page.locator('html')).toHaveAttribute('data-theme', 'atreyee')` (admin re-applied live), then click `.theme-tile[data-theme-name="siddhi"] button.apply` to restore. Run → FAIL.

- [ ] **Step 2: tokens.css + site.css + public heads**
  Cut lines 1–11 of `css/site.css` into `css/tokens.css` verbatim (prefix with `/* Default (সিদ্ধি) design tokens — shared by the public site and /admin/. Theme overrides: themes.css */`). Add the link in the 8 public pages. `node --test tests/unit/contrast.test.js` → PASS. `grep -c '^:root' css/site.css` → 0.

- [ ] **Step 3: admin head + theme follow**
  `admin/index.html` head (order matters):
  ```html
  <script>try{var d=localStorage.getItem('design');if(/^(siddhi|mukha|dhokra|atreyee|bangarh)$/.test(d))document.documentElement.setAttribute('data-theme',d)}catch(e){}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla&family=Atma:wght@500;700&display=swap">
  <link rel="stylesheet" href="../css/tokens.css">
  <link rel="stylesheet" href="../css/themes.css">
  <link rel="stylesheet" href="../css/admin.css">
  ```
  `admin/js/admin.js`: `import { resolveTheme, applyTheme } from '../../js/theme.js';` and, at module top level after `const $ = …`:
  ```js
  // Admin follows the theme chosen in 🎨 ডিজাইন. settings/site is publicly readable, so this runs before login.
  getDoc(doc(db, 'settings', 'site')).then(s => applyTheme(resolveTheme(s.data()?.design))).catch(err => console.warn('[admin] theme', err));
  ```
  `admin/js/sections/design.js`: after the successful `setDoc`/`logAudit`, `applyTheme(name);` (import `applyTheme` from `../../../js/theme.js`).

- [ ] **Step 4: rewrite `css/admin.css`** against the tokens. Keep every selector that exists today (same names) and add nothing the JS does not use. Design brief:
  - `body{background:var(--ivory);color:var(--ink);font:16px/1.6 var(--body)}`; `h1,h2,h3{font-family:var(--display)}`.
  - `.adm-top{background:var(--bg);color:var(--hero-ink);border-bottom:3px solid var(--pitambar);position:sticky;top:0;min-height:56px}` with `#adm-title` in `var(--display)` 20px; `.btn-sm` in the header transparent with `1px solid var(--hero-muted)` border, `color:var(--hero-ink)`, `min-height:44px`.
  - `main{max-width:760px;padding:1rem}`; `.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1.2rem;margin-bottom:1rem}`.
  - Dashboard `.grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.8rem}`; `.tile{min-height:112px;justify-content:center;gap:.4rem;font:700 15px var(--body);color:var(--ink)}`, `.tile .icon{font-size:2.2rem}`, `.tile:hover,.tile:focus-visible{border-color:var(--pitambar);transform:translateY(-2px)}` with a `transition`.
  - Inputs: `input,textarea,select{font:16px var(--body);padding:.75rem .9rem;border:1px solid var(--line);border-radius:12px;background:var(--ivory2);color:var(--ink);min-height:44px}`; `label span{font-size:13px;letter-spacing:.04em;color:var(--muted);font-weight:600}`.
  - Buttons: `.btn{background:var(--cta);color:var(--cta-ink);border-radius:999px;padding:.7rem 1.2rem;font:700 15px var(--body);min-height:44px}`, `.btn.secondary{background:var(--ivory2);color:var(--ink);border:1px solid var(--line)}`, `.btn.danger{background:var(--sindoor);color:var(--ticker-ink)}`, `.btn-sm{…min-height:44px;padding:.5rem .9rem;font-size:14px}`.
  - `.badge{background:var(--ivory2);color:var(--muted)}` `.badge.pub{background:var(--durva);color:#fff}`; `.list-item{border-bottom:1px solid var(--line);padding:.7rem 0}`; `.err{color:var(--sindoor)}`; `.toast{background:var(--ink);color:var(--ivory);border-radius:999px}`, `.toast-err{background:var(--sindoor);color:var(--ticker-ink)}`; `.back{color:var(--sindoor);font-weight:600}`; `.thumb{border-radius:12px}`; focus rings `outline:3px solid var(--focus);outline-offset:2px`.
  - Theme card: keep `.theme-grid/.swatch/.s1–.s4`, `.theme-tile.current{outline:3px solid var(--pitambar)}`; delete the `.swatch[data-theme="siddhi"]` duplicate block (tokens.css now provides siddhi; the swatch for siddhi must still read siddhi colours when the page theme is another — so keep a `.swatch[data-theme="siddhi"]` block but copy ONLY `--bg --sindoor --pitambar --ivory` from tokens.css and comment why).
  - Dark theme (dhokra): `color-scheme:dark` comes from themes.css; verify inputs stay readable (background `--ivory2`, text `--ink`).
  - Login page: `.adm-top` + centred `#adm-login .card{max-width:420px;margin:2rem auto}`.

- [ ] **Step 5: verify**
  `npm run test:unit`; emulators + `npm run seed`; `npx playwright test --project=admin` (new test green, others green); `npx playwright test --project=public` (tokens move must not break the public pages: theme.spec, contrast in shots). Screenshots (scratch outside repo) of `/admin/` login, dashboard, `#settings`, `#design`, `#albums`, `#transparency` at 390 and 1366 for `siddhi` and `dhokra` (apply via the card, restore after) — LOOK at them; no overflow, 44 px targets, readable dark inputs. `node scripts/shots.mjs` exit 0.

- [ ] **Step 6: docs + commit + push + live**
  build-log heading `## 2026-09-11 — Phase 5b — admin panel restyled in the design system`; admin-guide one line under ডিজাইন বদলানো ("admin panel-ও বাছা theme-এ দেখায়"); PROJECT_CONTEXT §6 bullet. Commit `feat(admin): restyle the panel in the site's design tokens and follow the chosen theme` (tokens move may be its own commit `refactor(css): move default tokens to css/tokens.css`). Push; wait for Pages; live-check `/admin/` (login form visible, `.adm-top` background rgb(15,18,48) for siddhi, fonts loaded, zero console errors) and `/index.html` still fine (`data-theme`, hero art).
