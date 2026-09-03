# Phase 0 + 1 — Foundation & Public Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live bilingual public website (home, history, committee, gallery, events) on GitHub Pages + custom domain, backed by Firebase, with a phone-first `/admin/` panel where the single admin edits all of that content — and a tested security-rules suite that gates every deploy.

**Architecture:** Static multi-page site (vanilla HTML/CSS/ES modules, no build step) reads published Firestore documents directly from the browser; `/admin/` is the same static site plus an auth gate, writing to the same Firestore/Storage. Security lives entirely in `firestore.rules` + `storage.rules` + App Check, verified by an emulator-backed rules test matrix. Pure-logic modules (i18n, ui helpers, resize maths) have no Firebase imports so they run under `node --test`.

**Tech Stack:** Firebase JS SDK 12.18.0 (modular, gstatic CDN), Firestore, Auth (email+password), Storage, App Check (reCAPTCHA v3); dev-only Node 24 tooling: `firebase-tools`, `@firebase/rules-unit-testing`, `firebase-admin` (emulator seed), `@playwright/test`. GitHub Pages hosting.

Spec: `docs/superpowers/specs/2026-09-03-trust-website-design.md`

## Global Constraints

- No build step on the site. Browser code imports Firebase from `https://www.gstatic.com/firebasejs/12.18.0/...` — **pin 12.18.0 everywhere**, never `latest`.
- Every visitor-facing text field is a `{bn, en}` object; default language `bn`; fallback to whichever exists.
- `deleted` is **always a boolean** on soft-deletable docs (never absent); public queries add `where('deleted','==',false)` and rules require `resource.data.deleted == false`.
- Rules never deployed with a red test suite: `npm test` must pass before `scripts/deploy-rules.sh` runs `firebase deploy`.
- Secrets never in the repo: no service-account JSON, no `.env`. The Firebase **web config is public by design** and is committed in `js/firebase-config.js`.
- No raw `innerHTML` with user/admin-authored strings; use `escapeHtml()` or DOMPurify 3.x (pinned CDN) for rich text.
- Admin panel is online-only. Delete = soft delete + audit row. `audit` is append-only.
- Docs in English, commit messages in English, one subject per commit, docs updated in the same commit (pre-commit hook enforces `docs/build-log.md` staged whenever code changes).
- Firebase project must be on **Blaze** plan (Storage requires it since 2026-02-03); budget alert ₹100.
- Node ≥ 24 for dev tooling (present: v24.16.0). Java ≥ 11 for emulators (present: 15).

---

## File structure

```
TRUST_webPage/
├── index.html                 home: hero, countdown, upcoming events, latest album
├── about.html                 year-wise history
├── committee.html
├── gallery.html               albums → photos (?album=<id>)
├── events.html
├── admin/
│   ├── index.html             login + dashboard shell (single page, hash router)
│   └── js/
│       ├── admin.js           auth gate, isAdmin check, hash router, dashboard cards
│       ├── forms.js           bilingual field builders, draft/publish save, list views
│       ├── audit.js           logAudit()
│       ├── upload.js          resizeImage() (browser) + uploadPublic()
│       ├── resize.js          fitDims() — pure maths, unit-tested
│       └── sections/
│           ├── settings.js    settings/site form
│           ├── history.js
│           ├── committee.js
│           ├── albums.js      albums + photos
│           ├── events.js
│           └── export.js      Export all JSON
├── css/site.css               public theme
├── css/admin.css
├── js/
│   ├── firebase-config.js     public web config + App Check site key (committed)
│   ├── firebase.js            init app/db/auth/storage/appcheck; emulator wiring on localhost
│   ├── i18n.js                pure: getLang/setLang/pick/t/STRINGS
│   ├── ui.js                  pure: escapeHtml/countdown/fmtDate/el
│   ├── content.js             Firestore reads for public pages (published-only queries)
│   ├── shell.js               header/nav/footer from settings + language toggle
│   └── pages/{home,about,committee,gallery,events}.js
├── firestore.rules
├── storage.rules
├── firebase.json / .firebaserc
├── package.json               dev-only
├── tests/
│   ├── unit/{i18n,ui,resize}.test.js      node --test
│   ├── rules/{firestore,storage}.test.js  node --test inside emulators:exec
│   ├── seed/seed.js                       emulator seed (admin user + sample content)
│   └── e2e/{public,admin}.spec.js         Playwright against emulator
├── scripts/pre-commit-docs.sh
├── scripts/deploy-rules.sh
├── .github/workflows/pages.yml            (optional; Pages can also deploy from branch)
├── docs/PROJECT_CONTEXT.md · pending.md · build-log.md · user-guide/admin-guide.md
├── CLAUDE.md · README.md · .gitignore
```

---

## Phase 0 — Foundation

### Task 1: Repo scaffold, docs discipline, test runner

**Files:**
- Create: `CLAUDE.md`, `README.md`, `docs/PROJECT_CONTEXT.md`, `docs/pending.md`, `docs/build-log.md`, `docs/user-guide/admin-guide.md`, `scripts/pre-commit-docs.sh`, `package.json`, `tests/unit/.gitkeep`
- Modify: `.gitignore` (already exists)

**Interfaces:**
- Produces: `npm run test:unit` = `node --test 'tests/unit/**/*.test.js'`; pre-commit hook installed at `.git/hooks/pre-commit`.

- [ ] **Step 1: Write `package.json` (dev-only)**

```json
{
  "name": "trust-webpage",
  "private": true,
  "type": "module",
  "description": "Ganesh Puja Trust website — static site + Firebase. Dev tooling only; the site has no build step.",
  "scripts": {
    "test": "npm run test:unit && npm run test:rules",
    "test:unit": "node --test 'tests/unit/**/*.test.js'",
    "test:rules": "firebase emulators:exec --only firestore,storage,auth --project demo-trust \"node --test 'tests/rules/**/*.test.js'\"",
    "emu": "firebase emulators:start --only firestore,storage,auth --project demo-trust",
    "seed": "node tests/seed/seed.js",
    "serve": "python3 -m http.server 5500 --bind 127.0.0.1",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^5.0.0",
    "@playwright/test": "^1.50.0",
    "firebase": "^12.18.0",
    "firebase-admin": "^13.0.0",
    "firebase-tools": "^14.0.0"
  }
}
```

- [ ] **Step 2: Install and verify**

Run: `npm install && npx firebase --version && node --test tests/unit/`
Expected: firebase-tools prints a 14.x version; `node --test` reports 0 tests, exit 0. (`@firebase/rules-unit-testing` 5.x is the line whose peer is `firebase@^12`; Node 24's test runner needs a glob, not a directory.)

- [ ] **Step 3: Write `scripts/pre-commit-docs.sh`**

```bash
#!/usr/bin/env bash
# Refuse a commit that changes code without touching docs/build-log.md.
# Install: ln -sf ../../scripts/pre-commit-docs.sh .git/hooks/pre-commit
set -euo pipefail
staged=$(git diff --cached --name-only)
code=$(echo "$staged" | grep -E '^(js|admin|css|tests|scripts|firestore\.rules|storage\.rules|.*\.html)' || true)
if [ -n "$code" ] && ! echo "$staged" | grep -q '^docs/build-log.md$'; then
  echo "pre-commit: code changed but docs/build-log.md is not staged." >&2
  echo "Add a build-log entry (one subject per commit, docs in the same commit)." >&2
  exit 1
fi
if echo "$staged" | grep -qE 'service-?account.*\.json|\.env$'; then
  echo "pre-commit: refusing to commit a secret-looking file." >&2
  exit 1
fi
```

Run: `chmod +x scripts/pre-commit-docs.sh && ln -sf ../../scripts/pre-commit-docs.sh .git/hooks/pre-commit`

- [ ] **Step 4: Write `CLAUDE.md`**

```markdown
# Ganesh Puja Trust Website

Public bilingual (বাংলা/English) website for the Ganesh Puja Trust with a
single-admin content panel at `/admin/`. Static vanilla-JS site on GitHub
Pages, Firebase (Firestore + Auth + Storage) backend.

**Totally separate from the Chanda Collection app. Never link data.**

## Read these first (repo memory)

- `docs/PROJECT_CONTEXT.md` — decisions with their causes
- `docs/pending.md` — THE roadmap
- `docs/build-log.md` — append-only chronology
- `docs/superpowers/specs/` — approved design specs

These files are the only source of truth for decisions and their causes.

## Working rules

- Explain in Bengali (technical terms English); code/docs/commits English.
- One subject per commit, docs in the same commit (hook: `scripts/pre-commit-docs.sh`).
- Verify live before reporting done. `npm test` green before any rules deploy.
- Secrets never in repo. Web config in `js/firebase-config.js` is public by design.
- Security first: every collection default-deny; rules tests are the gate.

## Stack

- No build step. Firebase SDK pinned 12.18.0 from gstatic CDN.
- Pure-logic modules (`js/i18n.js`, `js/ui.js`, `admin/js/resize.js`) have no
  Firebase imports → `node --test tests/unit/`.
- Rules tests: `npm run test:rules` (emulator). Local dev: `npm run emu` +
  `npm run seed` + `npm run serve` → http://127.0.0.1:5500
```

- [ ] **Step 5: Write the docs**

`docs/PROJECT_CONTEXT.md` — copy §1–§3 of the spec (What, Scope, Decisions table) verbatim, add a row:

```
| Blaze plan from day 1 | Storage needs Blaze since 2026-02-03 and phone OTP needs Blaze; free quotas unchanged; ₹100 budget alert set |
```

`docs/pending.md`:

```markdown
# Pending / Roadmap

## Phase 0 — Foundation
- [ ] Task 1 scaffold  - [ ] Task 2 Firebase project  - [ ] Task 3 i18n
- [ ] Task 4 ui helpers  - [ ] Task 5 Firestore rules  - [ ] Task 6 Storage rules
- [ ] Task 7 firebase.js  - [ ] Task 8 admin auth shell  - [ ] Task 9 settings + audit
- [ ] Task 10 export  - [ ] Task 11 deploy + domain

## Phase 1 — Showcase
- [ ] Task 12 content.js  - [ ] Task 13 public shell  - [ ] Task 14 home
- [ ] Task 15 history  - [ ] Task 16 committee  - [ ] Task 17 upload
- [ ] Task 18 gallery  - [ ] Task 19 events  - [ ] Task 20 e2e  - [ ] Task 21 go-live

## Later phases (spec §8): 2 Donation+Transparency · 3 Live hub · 4 Members
```

`docs/build-log.md`:

```markdown
# Build log (append-only, newest at bottom)

## 2026-09-03 — v0.0.1 scaffold
Repo created; design spec approved; docs discipline + pre-commit hook; dev-only
package.json (firebase-tools, rules-unit-testing, playwright). No site code yet.
```

`docs/user-guide/admin-guide.md`: heading only for now — `# অ্যাডমিন গাইড` + one line "Phase 1-এর শেষে সম্পূর্ণ হবে।"

`README.md`: project one-liner, repo map (from File structure above), `npm` scripts list, link to spec.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold repo, docs discipline, dev tooling"
```

---

### Task 2: Firebase project + emulator config (Hrishi does the console steps)

**Files:**
- Create: `firebase.json`, `.firebaserc`, `js/firebase-config.js`, `docs/user-guide/setup-firebase.md`

**Interfaces:**
- Produces: `js/firebase-config.js` exporting `firebaseConfig` (object) and `APPCHECK_SITE_KEY` (string); emulator ports firestore 8080, auth 9099, storage 9199, ui 4000.

- [ ] **Step 1: Write `docs/user-guide/setup-firebase.md` (Bengali, for Hrishi)** — the manual checklist:

```markdown
# Firebase setup (একবারই, Hrishi করবেন)

1. https://console.firebase.google.com → Add project → নাম: `ganesh-puja-trust`
   (Analytics off)।
2. **Upgrade to Blaze** (Storage-এর জন্য বাধ্যতামূলক)। Card add করুন। তারপর
   Google Cloud console → Billing → Budgets → নতুন budget ₹100, email alert 50/90/100%।
3. Build → Firestore Database → Create (production mode, region `asia-south1` Mumbai)।
4. Build → Storage → Get started (production mode, same region)।
5. Build → Authentication → Sign-in method → Email/Password enable।
   Users → Add user: আপনার admin email + ≥12-char password। **UID copy করুন।**
6. Firestore → Data → Start collection `admins` → Document ID = ওই UID →
   field `createdAt` (timestamp, now)। এটাই admin gate।
7. Project settings → General → Your apps → Web app (</>) → নাম `trust-site`,
   Hosting off → **firebaseConfig object copy করে আমাকে দিন** (এটা public,
   secret নয়)।
8. Build → App Check → Apps → Register (reCAPTCHA v3) → site key copy করে দিন।
   Enforcement এখনই ON করবেন না — Task 11-এ live verify-র পরে।
9. Google Cloud console → APIs & Services → Credentials → Browser key
   (auto-created) → Application restrictions: HTTP referrers →
   `https://<domain>/*`, `https://hrishi91.github.io/*`, `http://127.0.0.1:5500/*`।
```

- [ ] **Step 2: Write `firebase.json`**

```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

`.firebaserc` (real project id filled in after Step 1 of the checklist; until then keep the demo id):

```json
{ "projects": { "default": "ganesh-puja-trust" } }
```

- [ ] **Step 3: Write `js/firebase-config.js`** with the values Hrishi pastes (placeholders below are the *shape*; the file committed must hold the real public config):

```js
// Public Firebase web config — NOT a secret (security = rules + App Check + referrer-restricted key).
export const firebaseConfig = {
  apiKey: "PASTE",
  authDomain: "ganesh-puja-trust.firebaseapp.com",
  projectId: "ganesh-puja-trust",
  storageBucket: "ganesh-puja-trust.firebasestorage.app",
  messagingSenderId: "PASTE",
  appId: "PASTE"
};
export const APPCHECK_SITE_KEY = "PASTE";
```

- [ ] **Step 4: Verify emulators boot**

Run: `npx firebase emulators:start --only firestore,storage,auth --project demo-trust` (Ctrl-C after "All emulators ready"). First run downloads the emulator jars.
Expected: Firestore on 8080, Auth on 9099, Storage on 9199, UI on 4000. (Uses empty `firestore.rules`/`storage.rules` — create both as `rules_version = '2';` stubs if the CLI complains; Task 5/6 replace them.)

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc js/firebase-config.js docs/ && git commit -m "chore: firebase project config, emulator ports, setup guide"
```

---

### Task 3: i18n module (pure, TDD)

**Files:**
- Create: `js/i18n.js`, `tests/unit/i18n.test.js`

**Interfaces:**
- Produces: `getLang(): 'bn'|'en'`, `setLang(l)`, `pick(field, lang?) : string`, `t(key, lang?) : string`, `STRINGS` dictionary, `LANGS = ['bn','en']`, `onLangChange(cb)`.
- `pick` accepts `{bn,en}` objects **or** plain strings (legacy-safe); returns `''` when nothing exists.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pick, t, getLang, setLang, LANGS } from '../../js/i18n.js';

test('LANGS is bn then en', () => assert.deepEqual(LANGS, ['bn', 'en']));
test('default lang is bn when no storage', () => assert.equal(getLang(), 'bn'));
test('setLang switches and persists in memory', () => { setLang('en'); assert.equal(getLang(), 'en'); setLang('bn'); });
test('setLang ignores unknown', () => { setLang('fr'); assert.equal(getLang(), 'bn'); });
test('pick returns requested lang', () => assert.equal(pick({ bn: 'নাম', en: 'Name' }, 'en'), 'Name'));
test('pick falls back to other lang', () => assert.equal(pick({ bn: '', en: 'Name' }, 'bn'), 'Name'));
test('pick handles plain string', () => assert.equal(pick('plain', 'bn'), 'plain'));
test('pick handles null', () => assert.equal(pick(null, 'bn'), ''));
test('t returns dictionary string with fallback to en', () => {
  assert.equal(t('nav.home', 'bn'), 'হোম');
  assert.equal(t('nav.home', 'en'), 'Home');
  assert.equal(t('missing.key', 'bn'), 'missing.key');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/i18n.test.js`
Expected: FAIL — cannot find module `js/i18n.js`.

- [ ] **Step 3: Implement `js/i18n.js`**

```js
// Pure i18n: no DOM, no Firebase. Safe under node --test.
export const LANGS = ['bn', 'en'];
let current = 'bn';
const listeners = new Set();
const store = typeof localStorage !== 'undefined' ? localStorage : null;
try { const s = store && store.getItem('lang'); if (LANGS.includes(s)) current = s; } catch { /* private mode */ }

export function getLang() { return current; }
export function setLang(l) {
  if (!LANGS.includes(l) || l === current) return;
  current = l;
  try { store && store.setItem('lang', l); } catch { /* ignore */ }
  listeners.forEach(cb => cb(l));
}
export function onLangChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/** field: {bn,en} | string | null → string (fallback to the other language). */
export function pick(field, lang = current) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const other = lang === 'bn' ? 'en' : 'bn';
  return (field[lang] || field[other] || '').toString();
}

export const STRINGS = {
  'nav.home': { bn: 'হোম', en: 'Home' },
  'nav.about': { bn: 'ইতিহাস', en: 'History' },
  'nav.committee': { bn: 'কমিটি', en: 'Committee' },
  'nav.gallery': { bn: 'গ্যালারি', en: 'Gallery' },
  'nav.events': { bn: 'অনুষ্ঠান', en: 'Events' },
  'countdown.days': { bn: 'দিন', en: 'days' },
  'countdown.hours': { bn: 'ঘণ্টা', en: 'hours' },
  'countdown.minutes': { bn: 'মিনিট', en: 'minutes' },
  'countdown.today': { bn: 'আজই পুজো!', en: "It's puja day!" },
  'events.upcoming': { bn: 'আসন্ন অনুষ্ঠান', en: 'Upcoming events' },
  'events.past': { bn: 'পুরনো অনুষ্ঠান', en: 'Past events' },
  'gallery.albums': { bn: 'অ্যালবাম', en: 'Albums' },
  'common.loading': { bn: 'লোড হচ্ছে…', en: 'Loading…' },
  'common.empty': { bn: 'এখনও কিছু নেই', en: 'Nothing here yet' },
  'common.error': { bn: 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন', en: 'Something went wrong, please retry' },
  'footer.maintenance': { bn: 'সাইটে কাজ চলছে, একটু পরে আসুন', en: 'Site under maintenance, please come back shortly' },
  // admin
  'admin.login': { bn: 'অ্যাডমিন লগইন', en: 'Admin login' },
  'admin.email': { bn: 'ইমেল', en: 'Email' },
  'admin.password': { bn: 'পাসওয়ার্ড', en: 'Password' },
  'admin.notAdmin': { bn: 'এই অ্যাকাউন্ট অ্যাডমিন নয়', en: 'This account is not an admin' },
  'admin.logout': { bn: 'লগআউট', en: 'Logout' },
  'admin.saveDraft': { bn: 'ড্রাফট সেভ', en: 'Save draft' },
  'admin.publish': { bn: 'পাবলিশ', en: 'Publish' },
  'admin.unpublish': { bn: 'আনপাবলিশ', en: 'Unpublish' },
  'admin.delete': { bn: 'মুছুন', en: 'Delete' },
  'admin.confirmDelete': { bn: 'সত্যিই মুছবেন? (পরে ফেরানো যাবে না)', en: 'Really delete? (cannot be undone from here)' },
  'admin.reauth': { bn: 'নিরাপত্তার জন্য পাসওয়ার্ড আবার দিন', en: 'Re-enter password for security' },
  'admin.saved': { bn: 'সেভ হয়েছে', en: 'Saved' },
  'admin.draft': { bn: 'ড্রাফট', en: 'Draft' },
  'admin.published': { bn: 'পাবলিশড', en: 'Published' },
  'admin.new': { bn: '+ নতুন', en: '+ New' },
  'admin.up': { bn: '↑', en: '↑' }, 'admin.down': { bn: '↓', en: '↓' },
  'admin.preview': { bn: 'প্রিভিউ', en: 'Preview' },
  'admin.export': { bn: 'সব ডেটা JSON export', en: 'Export all data as JSON' },
};
export function t(key, lang = current) {
  const e = STRINGS[key];
  return e ? pick(e, lang) : key;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/unit/i18n.test.js`
Expected: 9 passing.

- [ ] **Step 5: Commit** (add a build-log line: "v0.1.0 i18n module, 9 unit tests")

```bash
git add js/i18n.js tests/unit/i18n.test.js docs/build-log.md && git commit -m "feat: i18n module (bn/en pick, dictionary, lang persistence)"
```

---

### Task 4: UI helpers (pure, TDD)

**Files:**
- Create: `js/ui.js`, `tests/unit/ui.test.js`

**Interfaces:**
- Produces: `escapeHtml(s): string`, `countdown(isoDate, now = new Date()): {days,hours,minutes,past}`, `fmtDate(iso, lang): string`, `el(tag, attrs?, ...children): HTMLElement` (browser only; not unit-tested), `toast(msg, kind='ok')` (browser only).

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/ui.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, countdown, fmtDate } from '../../js/ui.js';

test('escapeHtml escapes the five', () =>
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'));
test('escapeHtml tolerates null', () => assert.equal(escapeHtml(null), ''));
test('countdown 2 days 3 hours ahead', () => {
  const r = countdown('2026-09-20T06:00:00+05:30', new Date('2026-09-18T03:00:00+05:30'));
  assert.deepEqual(r, { days: 2, hours: 3, minutes: 0, past: false });
});
test('countdown past date', () => {
  const r = countdown('2026-09-01T00:00:00+05:30', new Date('2026-09-02T00:00:00+05:30'));
  assert.equal(r.past, true); assert.equal(r.days, 0);
});
test('countdown invalid date', () => assert.equal(countdown('nope').past, true));
test('fmtDate bn uses Bengali digits and month', () => assert.equal(fmtDate('2026-09-20', 'bn'), '২০ সেপ্টেম্বর ২০২৬'));
test('fmtDate en', () => assert.equal(fmtDate('2026-09-20', 'en'), '20 September 2026'));
test('fmtDate garbage', () => assert.equal(fmtDate('x', 'en'), ''));
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/ui.test.js` → FAIL (module missing).

- [ ] **Step 3: Implement `js/ui.js`**

```js
// Pure helpers first (unit-tested); DOM helpers below guard on typeof document.
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function countdown(iso, now = new Date()) {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return { days: 0, hours: 0, minutes: 0, past: true };
  let ms = target - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, past: true };
  const days = Math.floor(ms / 86400000); ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000); ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  return { days, hours, minutes, past: false };
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export function bnDigits(s) { return String(s).replace(/\d/g, d => BN_DIGITS[d]); }
const MONTHS = {
  bn: ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
export function fmtDate(iso, lang = 'bn') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const out = `${d.getDate()} ${MONTHS[lang === 'bn' ? 'bn' : 'en'][d.getMonth()]} ${d.getFullYear()}`;
  return lang === 'bn' ? bnDigits(out) : out;
}

// ---- DOM helpers (browser only) ----
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
export function toast(msg, kind = 'ok') {
  const t = el('div', { class: `toast toast-${kind}`, text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 3000);
}
```

Note: `fmtDate` parses `'2026-09-20'` as UTC midnight; the Mac's IST zone yields the 20th. Tests run in the developer's zone (IST). If a CI in UTC is ever added, construct dates with `T00:00:00+05:30` in tests.

- [ ] **Step 4: Run tests** — `node --test tests/unit/ui.test.js` → 8 passing.

- [ ] **Step 5: Commit** (build-log line)

```bash
git add js/ui.js tests/unit/ui.test.js docs/build-log.md && git commit -m "feat: ui helpers (escapeHtml, countdown, fmtDate, el, toast)"
```

---

### Task 5: Firestore security rules + rules test matrix (TDD)

**Files:**
- Create: `firestore.rules`, `tests/rules/_env.js`, `tests/rules/firestore.test.js`

**Interfaces:**
- Consumes: emulator ports from Task 2.
- Produces: `isAdmin()` gate = `exists(/databases/$(db)/documents/admins/$(request.auth.uid))`; helper `tests/rules/_env.js` exporting `setup()` → `{ testEnv, anon, admin, other, seed }` where `seed(fn)` runs `fn(db)` with rules disabled.

- [ ] **Step 1: Write the test helper `tests/rules/_env.js`**

```js
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT = 'demo-trust';
export const ADMIN_UID = 'admin-uid-1';
export const OTHER_UID = 'other-uid-2';

export async function setup() {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
  await testEnv.clearFirestore();
  // The admin gate is a doc, so seed it with rules off.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await ctx.firestore().doc(`admins/${ADMIN_UID}`).set({ createdAt: new Date() });
  });
  return {
    testEnv,
    anon: testEnv.unauthenticatedContext(),
    admin: testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com', email_verified: true }),
    other: testEnv.authenticatedContext(OTHER_UID, { email: 'x@example.com' }),
    seed: fn => testEnv.withSecurityRulesDisabled(ctx => fn(ctx.firestore(), ctx.storage())),
  };
}
```

- [ ] **Step 2: Write the failing Firestore matrix `tests/rules/firestore.test.js`**

```js
import { test, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setup, ADMIN_UID } from './_env.js';

let E;
before(async () => { E = await setup(); });
after(async () => { await E.testEnv.cleanup(); });

const pub = { title: { bn: 'ক', en: 'k' }, published: true, deleted: false, order: 1 };
const draft = { ...pub, published: false };
const gone = { ...pub, deleted: true };

// ---- settings/site ----
test('settings: anyone reads, only admin writes', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.anon.firestore().doc('settings/site').get());
  await assertFails(E.anon.firestore().doc('settings/site').set({ name: 'x' }));
  await assertFails(E.other.firestore().doc('settings/site').set({ name: 'x' }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ name: { bn: 'a', en: 'b' } }));
});

// ---- published-content collections share one shape ----
for (const coll of ['history', 'events', 'albums']) {
  test(`${coll}: public sees published+not-deleted only; admin sees all; no hard delete`, async () => {
    await E.seed(async db => {
      await db.doc(`${coll}/p`).set(pub);
      await db.doc(`${coll}/d`).set(draft);
      await db.doc(`${coll}/g`).set(gone);
    });
    const a = E.anon.firestore();
    await assertSucceeds(a.doc(`${coll}/p`).get());
    await assertFails(a.doc(`${coll}/d`).get());
    await assertFails(a.doc(`${coll}/g`).get());
    // list query must carry the constraints or it is rejected
    await assertSucceeds(a.collection(coll).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(a.collection(coll).get());
    await assertSucceeds(E.admin.firestore().doc(`${coll}/d`).get());
    await assertSucceeds(E.admin.firestore().collection(coll).get());
    await assertFails(a.doc(`${coll}/new`).set(pub));
    await assertFails(E.other.firestore().doc(`${coll}/new`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/new`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/new`).update({ deleted: true }));
    await assertFails(E.admin.firestore().doc(`${coll}/new`).delete());
  });
}

test('committee: isPublic gates read', async () => {
  await E.seed(async db => {
    await db.doc('committee/p').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: true, deleted: false, order: 1 });
    await db.doc('committee/h').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: false, deleted: false, order: 2 });
  });
  await assertSucceeds(E.anon.firestore().doc('committee/p').get());
  await assertFails(E.anon.firestore().doc('committee/h').get());
  await assertSucceeds(E.anon.firestore().collection('committee').where('isPublic', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('committee').get());
  await assertFails(E.other.firestore().doc('committee/p').update({ post: 'hacked' }));
  await assertSucceeds(E.admin.firestore().doc('committee/h').update({ isPublic: true }));
});

test('albums/photos: readable only under a published album', async () => {
  await E.seed(async db => {
    await db.doc('albums/pub').set(pub);
    await db.doc('albums/pub/photos/1').set({ url: 'u', deleted: false, order: 1 });
    await db.doc('albums/drf').set(draft);
    await db.doc('albums/drf/photos/1').set({ url: 'u', deleted: false, order: 1 });
  });
  await assertSucceeds(E.anon.firestore().doc('albums/pub/photos/1').get());
  await assertFails(E.anon.firestore().doc('albums/drf/photos/1').get());
  await assertSucceeds(E.anon.firestore().collection('albums/pub/photos').where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('albums/drf/photos').where('deleted', '==', false).get());
  await assertFails(E.other.firestore().doc('albums/pub/photos/2').set({ url: 'x', deleted: false, order: 2 }));
  await assertSucceeds(E.admin.firestore().doc('albums/pub/photos/2').set({ url: 'x', deleted: false, order: 2 }));
  await assertFails(E.admin.firestore().doc('albums/pub/photos/2').delete());
});

test('admins: only admin reads, nobody writes from client', async () => {
  await assertFails(E.anon.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertFails(E.other.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertSucceeds(E.admin.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertFails(E.other.firestore().doc('admins/other-uid-2').set({ createdAt: new Date() }));
  await assertFails(E.admin.firestore().doc('admins/new').set({ createdAt: new Date() }));
});

test('audit: admin create with own uid only; append-only', async () => {
  const row = { uid: ADMIN_UID, action: 'update', path: 'settings/site', before: {}, after: {}, at: new Date() };
  await assertFails(E.anon.firestore().collection('audit').add(row));
  await assertFails(E.other.firestore().collection('audit').add({ ...row, uid: 'other-uid-2' }));
  await assertFails(E.admin.firestore().collection('audit').add({ ...row, uid: 'spoof' }));
  await assertSucceeds(E.admin.firestore().doc('audit/a1').set(row));
  await assertFails(E.admin.firestore().doc('audit/a1').update({ action: 'x' }));
  await assertFails(E.admin.firestore().doc('audit/a1').delete());
  await assertFails(E.other.firestore().doc('audit/a1').get());
  await assertSucceeds(E.admin.firestore().doc('audit/a1').get());
});

test('unknown collections are denied even to admin', async () => {
  await assertFails(E.admin.firestore().doc('donations/x').set({ amount: 1 }));
  await assertFails(E.anon.firestore().doc('members/x').get());
});
```

- [ ] **Step 3: Write a stub `storage.rules`** (Task 6 replaces it) so `_env.js` can load:

```
rules_version = '2';
service firebase.storage { match /b/{bucket}/o { match /{allPaths=**} { allow read, write: if false; } } }
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm run test:rules`
Expected: emulator boots, tests FAIL (no `firestore.rules` / all denied).

- [ ] **Step 5: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn() { return request.auth != null; }
    function isAdmin() {
      return signedIn() && exists(/databases/$(db)/documents/admins/$(request.auth.uid));
    }
    // Public content: must be explicitly published and explicitly not deleted.
    function isLive() { return resource.data.published == true && resource.data.deleted == false; }
    function hasDeletedFlag() { return request.resource.data.deleted is bool; }

    match /settings/site {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /history/{id} {
      allow read: if isAdmin() || isLive();
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }

    match /events/{id} {
      allow read: if isAdmin() || isLive();
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }

    match /committee/{id} {
      allow read: if isAdmin() || (resource.data.isPublic == true && resource.data.deleted == false);
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }

    match /albums/{albumId} {
      allow read: if isAdmin() || isLive();
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;

      match /photos/{photoId} {
        allow read: if isAdmin() || (
          resource.data.deleted == false &&
          get(/databases/$(db)/documents/albums/$(albumId)).data.published == true &&
          get(/databases/$(db)/documents/albums/$(albumId)).data.deleted == false
        );
        allow create, update: if isAdmin() && hasDeletedFlag();
        allow delete: if false;
      }
    }

    match /admins/{uid} {
      allow read: if isAdmin();
      allow write: if false;   // console only
    }

    match /audit/{id} {
      allow read: if isAdmin();
      allow create: if isAdmin() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    // Everything else (donations, transparency, members, notices, roster …)
    // is denied until its phase adds explicit rules + tests.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 6: Run tests** — `npm run test:rules` → all Firestore tests pass (storage tests not yet present).

- [ ] **Step 7: Mutation check (verify-the-verifier)** — temporarily change `isLive()` to `resource.data.published == true` (drop the deleted clause), run `npm run test:rules`, confirm the `history/events/albums` tests **fail** on the `g` doc. Revert. Then change `allow create: if isAdmin()` on audit (drop uid check), confirm the spoof test fails. Revert. Note both in build-log.

- [ ] **Step 8: Commit**

```bash
git add firestore.rules storage.rules tests/rules/ docs/build-log.md && git commit -m "feat: firestore security rules with emulator test matrix"
```

---

### Task 6: Storage security rules + tests (TDD)

**Files:**
- Create: `tests/rules/storage.test.js`
- Modify: `storage.rules` (replace stub)

**Interfaces:**
- Produces: uploads only under `public/**`, admin only, < 5 MB, `image/*` or `application/pdf`; public read.

- [ ] **Step 1: Write failing tests**

```js
import { test, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { setup } from './_env.js';

let E;
before(async () => { E = await setup(); });
after(async () => { await E.testEnv.cleanup(); });

const png = new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]);
const meta = { contentType: 'image/png' };

test('storage: anon cannot write, admin can; anyone reads public/', async () => {
  await assertFails(uploadBytes(ref(E.anon.storage(), 'public/a.png'), png, meta));
  await assertFails(uploadBytes(ref(E.other.storage(), 'public/a.png'), png, meta));
  await assertSucceeds(uploadBytes(ref(E.admin.storage(), 'public/a.png'), png, meta));
  await assertSucceeds(getBytes(ref(E.anon.storage(), 'public/a.png')));
});
test('storage: content type and size enforced', async () => {
  await assertFails(uploadBytes(ref(E.admin.storage(), 'public/x.exe'), png, { contentType: 'application/x-msdownload' }));
  await assertSucceeds(uploadBytes(ref(E.admin.storage(), 'public/doc.pdf'), png, { contentType: 'application/pdf' }));
  const big = new Uint8Array(5 * 1024 * 1024 + 1);
  await assertFails(uploadBytes(ref(E.admin.storage(), 'public/big.png'), big, meta));
});
test('storage: outside public/ is dead even for admin', async () => {
  await assertFails(uploadBytes(ref(E.admin.storage(), 'private/a.png'), png, meta));
  await assertFails(getBytes(ref(E.anon.storage(), 'private/a.png')));
});
test('storage: only admin deletes', async () => {
  await assertSucceeds(uploadBytes(ref(E.admin.storage(), 'public/del.png'), png, meta));
  await assertFails(deleteObject(ref(E.other.storage(), 'public/del.png')));
  await assertSucceeds(deleteObject(ref(E.admin.storage(), 'public/del.png')));
});
```

- [ ] **Step 2: Run** — `npm run test:rules` → storage tests FAIL (stub denies admin too).

- [ ] **Step 3: Write `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null &&
        firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }
    function okType() {
      return request.resource.contentType.matches('image/.*') ||
             request.resource.contentType == 'application/pdf';
    }
    match /public/{allPaths=**} {
      allow read: if true;
      allow create, update: if isAdmin() && okType() && request.resource.size < 5 * 1024 * 1024;
      allow delete: if isAdmin();
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

`firestore.exists()` inside Storage rules is a cross-service rule; the Storage emulator supports it when the Firestore emulator runs in the same `emulators:exec` (it does — `--only firestore,storage,auth`). If the emulator reports the function unknown, upgrade `firebase-tools`.

- [ ] **Step 4: Run** — `npm run test:rules` → all green (Firestore + Storage).

- [ ] **Step 5: Mutation check** — drop `okType() &&`, confirm the `.exe` test fails; revert.

- [ ] **Step 6: Write `scripts/deploy-rules.sh`**

```bash
#!/usr/bin/env bash
# Deploy Firestore + Storage rules — ONLY after the full test suite is green.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npx firebase deploy --only firestore:rules,storage
echo "Rules deployed $(date '+%Y-%m-%d %H:%M'). Add a build-log line."
```

`chmod +x scripts/deploy-rules.sh`

- [ ] **Step 7: Commit**

```bash
git add storage.rules tests/rules/storage.test.js scripts/deploy-rules.sh docs/build-log.md && git commit -m "feat: storage rules (public/ admin-write, type+size limits) with tests"
```

---

### Task 7: `js/firebase.js` — init, App Check, emulator wiring

**Files:**
- Create: `js/firebase.js`

**Interfaces:**
- Consumes: `firebaseConfig`, `APPCHECK_SITE_KEY` from `js/firebase-config.js`.
- Produces: named exports `app, db, auth, storage, IS_LOCAL` and re-exports of the Firestore/Auth/Storage functions the rest of the site uses, so every other module imports Firebase **only** from `./firebase.js` (one place to pin the version).

- [ ] **Step 1: Write `js/firebase.js`**

```js
// Single Firebase entry point. Every other module imports from here — never from gstatic directly.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js';
import {
  getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  getStorage, connectStorageEmulator, ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';
import { firebaseConfig, APPCHECK_SITE_KEY } from './firebase-config.js';

export const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

export const app = initializeApp(firebaseConfig);

if (IS_LOCAL) {
  // Emulator runs have no App Check; debug token keeps the SDK quiet.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
} else if (APPCHECK_SITE_KEY && APPCHECK_SITE_KEY !== 'PASTE') {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

if (IS_LOCAL) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

// Repeat visits paint from cache; ignore "already open in another tab".
enableIndexedDbPersistence(db).catch(() => {});

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential,
  EmailAuthProvider, setPersistence, browserLocalPersistence,
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
};
```

- [ ] **Step 2: Smoke test in the browser against the emulator**

Create a throwaway `smoke.html` (not committed):

```html
<script type="module">
  import { db, doc, getDoc } from './js/firebase.js';
  const s = await getDoc(doc(db, 'settings/site'));
  document.body.textContent = 'exists=' + s.exists();
</script>
```

Run: `npm run emu` (terminal 1), `npm run serve` (terminal 2), open `http://127.0.0.1:5500/smoke.html` in the Browser pane.
Expected: page shows `exists=false`, console has no red errors, Emulator UI (4000) shows a Firestore read. Delete `smoke.html`.

- [ ] **Step 3: Commit**

```bash
git add js/firebase.js docs/build-log.md && git commit -m "feat: firebase entry module with app check and emulator wiring"
```

---

### Task 8: Admin auth shell (login, isAdmin gate, dashboard, hash router)

**Files:**
- Create: `admin/index.html`, `admin/js/admin.js`, `css/admin.css`

**Interfaces:**
- Produces: `registerSection(key, { title:{bn,en}, icon, render(container, ctx) })` in `admin.js`; `ctx = { db, storage, user, lang, navigate(hash), reauth(): Promise<boolean> }`. Sections (Tasks 9, 10, 15, 16, 18, 19) call `registerSection` on import; `admin.js` imports them at the bottom.

- [ ] **Step 1: Write `admin/index.html`**

```html
<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Admin</title>
<link rel="stylesheet" href="../css/admin.css">
</head>
<body>
<header class="adm-top">
  <strong id="adm-title">Admin</strong>
  <span class="grow"></span>
  <button id="adm-lang" class="btn-sm" type="button">EN</button>
  <button id="adm-logout" class="btn-sm" type="button" hidden></button>
</header>

<section id="adm-login" hidden>
  <form id="adm-login-form" class="card">
    <h2 data-t="admin.login"></h2>
    <label><span data-t="admin.email"></span><input name="email" type="email" autocomplete="username" required></label>
    <label><span data-t="admin.password"></span><input name="password" type="password" autocomplete="current-password" minlength="12" required></label>
    <button class="btn" type="submit" data-t="admin.login"></button>
    <p id="adm-login-err" class="err" role="alert"></p>
  </form>
</section>

<main id="adm-main" hidden></main>
<script type="module" src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `admin/js/admin.js`**

```js
import {
  db, storage, auth, doc, getDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence,
} from '../../js/firebase.js';
import { t, getLang, setLang, onLangChange, pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';

const sections = new Map();
export function registerSection(key, def) { sections.set(key, def); }

const $ = id => document.getElementById(id);
let user = null;

function applyStrings() {
  document.querySelectorAll('[data-t]').forEach(n => { n.textContent = t(n.dataset.t); });
  $('adm-lang').textContent = getLang() === 'bn' ? 'EN' : 'বাং';
  $('adm-logout').textContent = t('admin.logout');
}
$('adm-lang').onclick = () => setLang(getLang() === 'bn' ? 'en' : 'bn');
onLangChange(() => { applyStrings(); route(); });

$('adm-login-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('adm-login-err').textContent = '';
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
  } catch (err) {
    $('adm-login-err').textContent = err.code === 'auth/too-many-requests' ? 'Too many attempts — wait a few minutes.' : 'Login failed.';
  }
};
$('adm-logout').onclick = () => signOut(auth);

async function isAdmin(u) {
  try { return (await getDoc(doc(db, 'admins', u.uid))).exists(); } catch { return false; }
}

onAuthStateChanged(auth, async u => {
  applyStrings();
  if (!u) { user = null; $('adm-login').hidden = false; $('adm-main').hidden = true; $('adm-logout').hidden = true; return; }
  if (!(await isAdmin(u))) { toast(t('admin.notAdmin'), 'err'); await signOut(auth); return; }
  user = u;
  $('adm-login').hidden = true; $('adm-main').hidden = false; $('adm-logout').hidden = false;
  route();
});

/** Ask for the password again before a sensitive action. Resolves true on success. */
async function reauth() {
  const pw = prompt(t('admin.reauth'));
  if (!pw) return false;
  try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw)); return true; }
  catch { toast('Wrong password', 'err'); return false; }
}

const ctx = () => ({ db, storage, user, lang: getLang(), navigate: h => { location.hash = h; }, reauth });

function dashboard() {
  const grid = el('div', { class: 'grid' });
  for (const [key, def] of sections) {
    grid.append(el('a', { class: 'card tile', href: `#${key}` },
      el('span', { class: 'icon', text: def.icon }), el('span', { text: pick(def.title) })));
  }
  return grid;
}

function route() {
  if (!user) return;
  const main = $('adm-main'); main.replaceChildren();
  const key = location.hash.replace(/^#/, '').split('/')[0];
  const def = sections.get(key);
  $('adm-title').textContent = def ? pick(def.title) : 'Admin';
  if (!def) { main.append(dashboard()); return; }
  main.append(el('a', { class: 'back', href: '#', text: '‹ ' + pick({ bn: 'ড্যাশবোর্ড', en: 'Dashboard' }) }));
  const box = el('div'); main.append(box);
  Promise.resolve(def.render(box, ctx())).catch(err => { console.error(err); toast(t('common.error'), 'err'); });
}
window.addEventListener('hashchange', route);

// Sections register themselves on import (order = dashboard order).
import './sections/settings.js';
import './sections/history.js';
import './sections/committee.js';
import './sections/albums.js';
import './sections/events.js';
import './sections/export.js';
```

(Until Tasks 9–19 create those section files, comment out the missing imports and add them back task by task.)

- [ ] **Step 3: Write `css/admin.css`** — phone-first, no framework:

```css
:root { --bg:#faf7f2; --card:#fff; --ink:#222; --accent:#c2410c; --muted:#777; --err:#b91c1c; --ok:#15803d; }
* { box-sizing: border-box; }
body { margin:0; font: 16px/1.5 system-ui, "Noto Sans Bengali", sans-serif; background:var(--bg); color:var(--ink); }
.adm-top { display:flex; align-items:center; gap:.5rem; padding:.75rem 1rem; background:var(--accent); color:#fff; position:sticky; top:0; }
.grow { flex:1; }
main { padding:1rem; max-width:720px; margin:0 auto; }
.card { background:var(--card); border-radius:12px; padding:1rem; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:1rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:.75rem; }
.tile { display:flex; flex-direction:column; align-items:center; gap:.25rem; text-decoration:none; color:inherit; }
.tile .icon { font-size:2rem; }
label { display:block; margin:.5rem 0; }
label span { display:block; font-size:.85rem; color:var(--muted); }
input, textarea, select { width:100%; padding:.6rem; border:1px solid #ccc; border-radius:8px; font:inherit; }
.bi { display:grid; grid-template-columns:1fr 1fr; gap:.5rem; }
.btn, .btn-sm { border:0; border-radius:8px; padding:.6rem 1rem; background:var(--accent); color:#fff; font:inherit; cursor:pointer; }
.btn-sm { padding:.3rem .6rem; font-size:.85rem; }
.btn.secondary { background:#e5e7eb; color:var(--ink); }
.btn.danger { background:var(--err); }
.row { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
.list-item { display:flex; align-items:center; gap:.5rem; padding:.5rem 0; border-bottom:1px solid #eee; }
.badge { font-size:.75rem; padding:.1rem .5rem; border-radius:999px; background:#e5e7eb; }
.badge.pub { background:#dcfce7; color:var(--ok); }
.err { color:var(--err); min-height:1.2em; }
.back { display:inline-block; margin-bottom:.5rem; }
.toast { position:fixed; left:50%; bottom:1.5rem; transform:translateX(-50%); background:#333; color:#fff; padding:.6rem 1rem; border-radius:8px; }
.toast-err { background:var(--err); }
.thumb { width:72px; height:72px; object-fit:cover; border-radius:8px; }
progress { width:100%; }
```

- [ ] **Step 4: Verify in browser against emulator**

Create the admin user in the Auth emulator: Emulator UI → Authentication → Add user (`admin@example.com` / `password12345`); copy the UID; Firestore tab → add `admins/<uid>` with `createdAt`. Open `http://127.0.0.1:5500/admin/`:
- wrong password → "Login failed."; correct → dashboard (empty grid until sections exist)
- create a second user with no `admins` doc → login shows "not an admin" toast and returns to login
- reload keeps the session; Logout returns to login.

- [ ] **Step 5: Commit**

```bash
git add admin/ css/admin.css docs/build-log.md && git commit -m "feat: admin shell with email login, admins-doc gate, hash router"
```

---

### Task 9: `forms.js` + `audit.js` + Settings section

**Files:**
- Create: `admin/js/forms.js`, `admin/js/audit.js`, `admin/js/sections/settings.js`

**Interfaces:**
- `audit.js`: `logAudit(ctx, action, path, before, after)` → Promise; never throws (catches and `console.warn`s).
- `forms.js`:
  - `biField(label:{bn,en}, name, value:{bn,en}={}, {multiline=false}={})` → `{node, read(): {bn,en}}`
  - `textField(label, name, value='', {type='text', required=false}={})` → `{node, read(): string}`
  - `boolField(label, name, value=false)` → `{node, read(): boolean}`
  - `listView(ctx, { coll, itemLabel(doc):string, badge(doc):'pub'|'draft'|null, onEdit(id), onNew(), reorder:boolean })` → renders a list of non-deleted docs ordered by `order`, with ↑↓ swap that writes `order` and logs audit.
  - `saveDoc(ctx, coll, id|null, data, {publish})` → writes `{...data, published, deleted:false, updatedAt}`, logs audit, returns id. `publish` undefined = keep existing flag.
  - `softDelete(ctx, coll, id)` → confirm + reauth + `{deleted:true}` + audit.

- [ ] **Step 1: Write `admin/js/audit.js`**

```js
import { collection, addDoc, serverTimestamp } from '../../js/firebase.js';
export async function logAudit(ctx, action, path, before = null, after = null) {
  try {
    await addDoc(collection(ctx.db, 'audit'), {
      uid: ctx.user.uid, action, path,
      before: before ?? null, after: after ?? null, at: serverTimestamp(),
    });
  } catch (e) { console.warn('audit failed', e); }
}
```

- [ ] **Step 2: Write `admin/js/forms.js`**

```js
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp } from '../../js/firebase.js';
import { t, pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
import { logAudit } from './audit.js';

export function biField(label, name, value = {}, { multiline = false } = {}) {
  const mk = (lang) => el(multiline ? 'textarea' : 'input', { name: `${name}.${lang}`, placeholder: lang.toUpperCase(), value: multiline ? undefined : (value[lang] || '') });
  const bn = mk('bn'), en = mk('en');
  if (multiline) { bn.value = value.bn || ''; en.value = value.en || ''; bn.rows = en.rows = 4; }
  const node = el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'bi' }, bn, en));
  return { node, read: () => ({ bn: bn.value.trim(), en: en.value.trim() }) };
}
export function textField(label, name, value = '', { type = 'text', required = false } = {}) {
  const input = el('input', { name, type, value, required });
  return { node: el('label', {}, el('span', { text: pick(label) }), input), read: () => input.value.trim() };
}
export function boolField(label, name, value = false) {
  const input = el('input', { name, type: 'checkbox' }); input.checked = !!value;
  return { node: el('label', { class: 'row' }, input, el('span', { text: pick(label) })), read: () => input.checked };
}

export async function saveDoc(ctx, coll, id, data, { publish } = {}) {
  const ref = id ? doc(ctx.db, coll, id) : doc(collection(ctx.db, coll));
  const before = id ? (await getDoc(ref)).data() ?? null : null;
  const payload = { ...data, deleted: false, updatedAt: serverTimestamp() };
  if (publish !== undefined) payload.published = publish;
  else if (!before) payload.published = false;
  if (!before) { payload.createdAt = serverTimestamp(); if (payload.order == null) payload.order = Date.now(); }
  await setDoc(ref, payload, { merge: true });
  await logAudit(ctx, id ? 'update' : 'create', `${coll}/${ref.id}`, before, data);
  toast(t('admin.saved'));
  return ref.id;
}

export async function softDelete(ctx, coll, id) {
  if (!confirm(t('admin.confirmDelete'))) return false;
  if (!(await ctx.reauth())) return false;
  const ref = doc(ctx.db, coll, id);
  const before = (await getDoc(ref)).data();
  await updateDoc(ref, { deleted: true, updatedAt: serverTimestamp() });
  await logAudit(ctx, 'delete', `${coll}/${id}`, before, { deleted: true });
  toast(t('admin.saved'));
  return true;
}

export async function listView(ctx, { coll, itemLabel, badge, onEdit, onNew, reorder = true }) {
  const box = el('div');
  const q = query(collection(ctx.db, coll), where('deleted', '==', false), orderBy('order'));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  box.append(el('div', { class: 'row' }, el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: onNew })));
  if (!docs.length) box.append(el('p', { text: t('common.empty') }));
  docs.forEach((d, i) => {
    const b = badge ? badge(d) : null;
    const row = el('div', { class: 'list-item' },
      el('a', { href: '#', class: 'grow', text: itemLabel(d), onclick: e => { e.preventDefault(); onEdit(d.id); } }),
      b && el('span', { class: `badge ${b === 'pub' ? 'pub' : ''}`, text: b === 'pub' ? t('admin.published') : t('admin.draft') }),
    );
    if (reorder) {
      const swap = async (j) => {
        if (j < 0 || j >= docs.length) return;
        const a = docs[i], c = docs[j];
        await updateDoc(doc(ctx.db, coll, a.id), { order: c.order });
        await updateDoc(doc(ctx.db, coll, c.id), { order: a.order });
        await logAudit(ctx, 'reorder', `${coll}/${a.id}`, { order: a.order }, { order: c.order });
        box.replaceWith(await listView(ctx, { coll, itemLabel, badge, onEdit, onNew, reorder }));
      };
      row.append(el('button', { class: 'btn-sm', type: 'button', text: '↑', onclick: () => swap(i - 1) }),
                 el('button', { class: 'btn-sm', type: 'button', text: '↓', onclick: () => swap(i + 1) }));
    }
    box.append(row);
  });
  return box;
}
```

Firestore needs a composite index for `where('deleted','==',false) + orderBy('order')` per collection on the **real** project (the emulator does not). The first real query throws with a console link that creates the index — do that for each collection during Task 21 and record in `firestore.indexes.json` (`firebase firestore:indexes > firestore.indexes.json`, then add `"indexes": "firestore.indexes.json"` under `firestore` in `firebase.json`).

- [ ] **Step 3: Write `admin/js/sections/settings.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, boolField } from '../forms.js';
import { logAudit } from '../audit.js';

const SECTIONS = ['about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members'];

registerSection('settings', {
  title: { bn: 'সেটিংস', en: 'Settings' }, icon: '⚙️',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const vis = cur.sectionVisibility ?? {};
    const f = {
      name: biField({ bn: 'ট্রাস্টের নাম', en: 'Trust name' }, 'name', cur.name),
      tagline: biField({ bn: 'ট্যাগলাইন', en: 'Tagline' }, 'tagline', cur.tagline),
      address: biField({ bn: 'ঠিকানা', en: 'Address' }, 'address', cur.address, { multiline: true }),
      logoUrl: textField({ bn: 'লোগো URL', en: 'Logo URL' }, 'logoUrl', cur.logoUrl),
      mapUrl: textField({ bn: 'Google Maps লিঙ্ক', en: 'Google Maps link' }, 'mapUrl', cur.mapUrl),
      phone: textField({ bn: 'ফোন', en: 'Phone' }, 'phone', cur.contacts?.phone),
      whatsapp: textField({ bn: 'WhatsApp নম্বর (91 সহ)', en: 'WhatsApp number (with 91)' }, 'whatsapp', cur.contacts?.whatsapp),
      email: textField({ bn: 'ইমেল', en: 'Email' }, 'email', cur.contacts?.email, { type: 'email' }),
      regNo: textField({ bn: 'রেজিস্ট্রেশন নম্বর', en: 'Registration no.' }, 'regNo', cur.regNo),
      has80G: boolField({ bn: '80G আছে', en: 'Has 80G' }, 'has80G', cur.has80G),
      upiId: textField({ bn: 'UPI ID', en: 'UPI ID' }, 'upiId', cur.upiId),
      upiQrUrl: textField({ bn: 'UPI QR ছবির URL', en: 'UPI QR image URL' }, 'upiQrUrl', cur.upiQrUrl),
      pujaDate: textField({ bn: 'পুজোর তারিখ-সময়', en: 'Puja date-time' }, 'pujaDate', cur.pujaDate, { type: 'datetime-local' }),
      theme: biField({ bn: 'এই বছরের থিম', en: "This year's theme" }, 'theme', cur.theme),
      maintenance: boolField({ bn: 'Maintenance mode (সাইট বন্ধ)', en: 'Maintenance mode' }, 'maintenance', cur.maintenance),
    };
    const visFields = SECTIONS.map(s => boolField({ bn: `দেখাও: ${s}`, en: `Show: ${s}` }, `vis.${s}`, vis[s] !== false));
    const form = el('form', { class: 'card' },
      ...Object.values(f).map(x => x.node),
      el('h3', { text: t('nav.home') === 'হোম' ? 'কোন সেকশন দেখা যাবে' : 'Visible sections' }),
      ...visFields.map(x => x.node),
      el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }));
    form.onsubmit = async e => {
      e.preventDefault();
      if (!(await ctx.reauth())) return;
      const next = {
        name: f.name.read(), tagline: f.tagline.read(), address: f.address.read(), theme: f.theme.read(),
        logoUrl: f.logoUrl.read(), mapUrl: f.mapUrl.read(),
        contacts: { phone: f.phone.read(), whatsapp: f.whatsapp.read(), email: f.email.read() },
        regNo: f.regNo.read(), has80G: f.has80G.read(), upiId: f.upiId.read(), upiQrUrl: f.upiQrUrl.read(),
        pujaDate: f.pujaDate.read() ? new Date(f.pujaDate.read()).toISOString() : '',
        maintenance: f.maintenance.read(), defaultLang: 'bn',
        sectionVisibility: Object.fromEntries(SECTIONS.map((s, i) => [s, visFields[i].read()])),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, next, { merge: true });
      await logAudit(ctx, 'update', 'settings/site', cur, next);
      toast(t('admin.saved'));
    };
    box.append(form);
  },
});
```

`pujaDate` is stored as an ISO string (not a Timestamp) so `countdown()` from `ui.js` consumes it directly and the export JSON stays plain.

- [ ] **Step 4: Verify in browser** — `/admin/#settings`: fill name, puja date, save → reauth prompt → toast; Emulator UI shows `settings/site` and one `audit` row with `uid` = admin, `action: 'update'`. Reload → values persist.

- [ ] **Step 5: Commit**

```bash
git add admin/js/forms.js admin/js/audit.js admin/js/sections/settings.js docs/build-log.md && git commit -m "feat: admin forms toolkit, audit log, settings section"
```

---

### Task 10: Export all data as JSON

**Files:**
- Create: `admin/js/sections/export.js`

- [ ] **Step 1: Write it**

```js
import { registerSection } from '../admin.js';
import { collection, getDocs, doc, getDoc } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { logAudit } from '../audit.js';

const COLLS = ['history', 'committee', 'albums', 'events', 'audit'];

registerSection('export', {
  title: { bn: 'ব্যাকআপ', en: 'Backup' }, icon: '📤',
  render(box, ctx) {
    box.append(el('div', { class: 'card' },
      el('p', { text: t('admin.export') }),
      el('button', { class: 'btn', type: 'button', text: 'JSON ⬇', onclick: async () => {
        const out = { exportedAt: new Date().toISOString(), settings: (await getDoc(doc(ctx.db, 'settings', 'site'))).data() ?? null };
        for (const c of COLLS) {
          const snap = await getDocs(collection(ctx.db, c));
          out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (c === 'albums') for (const a of out.albums) {
            a.photos = (await getDocs(collection(ctx.db, 'albums', a.id, 'photos'))).docs.map(d => ({ id: d.id, ...d.data() }));
          }
        }
        const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: `trust-backup-${out.exportedAt.slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
        await logAudit(ctx, 'export', '*');
        toast(t('admin.saved'));
      } })));
  },
});
```

Timestamps serialise as `{seconds, nanoseconds}` — acceptable for a backup; note it in the admin guide.

- [ ] **Step 2: Verify** — click JSON ⬇ in the browser pane; file downloads; contains `settings` and an `audit` array.

- [ ] **Step 3: Commit**

```bash
git add admin/js/sections/export.js docs/build-log.md && git commit -m "feat: admin JSON export of all collections"
```

---

### Task 11: Deploy pipeline — GitHub repo, Pages, rules deploy, custom domain

**Files:**
- Create: `.nojekyll`, `CNAME` (after domain), `docs/user-guide/deploy.md`

- [ ] **Step 1: Create the GitHub repo and push** (Hrishi's account is logged in via `gh`):

```bash
gh repo create Hrishi91/trust-webpage --public --source=. --remote=origin --push
```

- [ ] **Step 2: Enable Pages from `main` root**

```bash
touch .nojekyll && git add .nojekyll && git commit -m "chore: disable jekyll on pages" && git push
gh api -X POST repos/Hrishi91/trust-webpage/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
```

Expected: `https://hrishi91.github.io/trust-webpage/` serves `index.html` within ~2 min (a placeholder until Phase 1; add a minimal `index.html` with the Trust name if none exists yet).

**Path note:** on the project-pages URL the site lives under `/trust-webpage/`; on the custom domain it lives at `/`. All internal links in HTML must therefore be **relative** (`css/site.css`, `../js/firebase.js`), never root-absolute (`/css/...`).

- [ ] **Step 3: Deploy rules to the real project (first time)**

Run: `npx firebase login` (browser flow, Hrishi's Google account) then `scripts/deploy-rules.sh`.
Expected: `npm test` green, then "Deploy complete". Firebase console → Firestore → Rules shows our file.

- [ ] **Step 4: Custom domain** (after Hrishi buys it; registrar DNS):
  - `A` records @ → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `CNAME www` → `hrishi91.github.io`
  - `echo "<domain>" > CNAME && git add CNAME && git commit -m "chore: custom domain" && git push`
  - GitHub → Settings → Pages → Custom domain shows the domain, tick **Enforce HTTPS** once the cert issues (~1 h).
  - Firebase console → Authentication → Settings → Authorized domains → add the domain. GCP → API key referrer list → add `https://<domain>/*`.

- [ ] **Step 5: Turn on App Check enforcement** only after Task 21's live verification passes on the real domain (Firebase console → App Check → Firestore/Storage → Enforce).

- [ ] **Step 6: Write `docs/user-guide/deploy.md`** with Steps 1–5 as a re-runnable Bengali checklist (what to do when: rules change → `scripts/deploy-rules.sh`; site change → `git push`; domain change → CNAME + DNS + authorized domains + referrer list).

- [ ] **Step 7: Commit + push**

```bash
git add docs/ && git commit -m "docs: deploy guide (pages, rules, domain, app check)" && git push
```

---

## Phase 1 — Public Showcase

### Task 12: `js/content.js` — published-only reads for public pages

**Files:**
- Create: `js/content.js`

**Interfaces:**
- Produces:
  - `getSettings(): Promise<Settings>` — `settings/site` merged over `DEFAULT_SETTINGS`; memoised per page load.
  - `listPublished(coll): Promise<Doc[]>` — `where('published','==',true) + where('deleted','==',false) + orderBy('order')`.
  - `listCommittee(): Promise<Doc[]>` — `isPublic==true && deleted==false`, by `order`.
  - `listPhotos(albumId): Promise<Doc[]>` — `deleted==false`, by `order`.
  - `getPublished(coll, id): Promise<Doc|null>`.
  - Each `Doc` is `{ id, ...data }`.

- [ ] **Step 1: Write `js/content.js`**

```js
import { db, collection, doc, getDoc, getDocs, query, where, orderBy } from './firebase.js';

export const DEFAULT_SETTINGS = {
  name: { bn: 'গণেশ পুজো ট্রাস্ট', en: 'Ganesh Puja Trust' }, tagline: { bn: '', en: '' },
  address: { bn: '', en: '' }, theme: { bn: '', en: '' }, logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '', email: '' }, regNo: '', has80G: false, upiId: '', upiQrUrl: '',
  pujaDate: '', maintenance: false, defaultLang: 'bn',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: false, transparency: false, members: false },
};

let settingsPromise;
export function getSettings() {
  settingsPromise ??= getDoc(doc(db, 'settings', 'site'))
    .then(s => ({ ...DEFAULT_SETTINGS, ...(s.data() ?? {}), sectionVisibility: { ...DEFAULT_SETTINGS.sectionVisibility, ...(s.data()?.sectionVisibility ?? {}) } }))
    .catch(() => DEFAULT_SETTINGS);
  return settingsPromise;
}

const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export async function listPublished(coll) {
  return rows(await getDocs(query(collection(db, coll), where('published', '==', true), where('deleted', '==', false), orderBy('order'))));
}
export async function listCommittee() {
  return rows(await getDocs(query(collection(db, 'committee'), where('isPublic', '==', true), where('deleted', '==', false), orderBy('order'))));
}
export async function listPhotos(albumId) {
  return rows(await getDocs(query(collection(db, 'albums', albumId, 'photos'), where('deleted', '==', false), orderBy('order'))));
}
export async function getPublished(coll, id) {
  const s = await getDoc(doc(db, coll, id));
  return s.exists() && s.data().published === true && s.data().deleted === false ? { id: s.id, ...s.data() } : null;
}
```

Composite indexes required on the real project (Task 21): `history/events/albums: published ASC, deleted ASC, order ASC`; `committee: isPublic ASC, deleted ASC, order ASC`; collection-group not needed.

- [ ] **Step 2: Smoke** — from the browser console on any page: `(await import('./js/content.js')).getSettings()` resolves with defaults merged. (No unit test: this module is Firebase-bound; covered by e2e in Task 20.)

- [ ] **Step 3: Commit**

```bash
git add js/content.js docs/build-log.md && git commit -m "feat: content read helpers (published-only queries)"
```

---

### Task 13: Public shell — theme CSS, header/nav/footer, language toggle, maintenance mode

**Files:**
- Create: `css/site.css`, `js/shell.js`, a shared HTML skeleton used by every public page

**Interfaces:**
- Produces: `mountShell(activeNav)` in `shell.js` → Promise<Settings>; it renders `<header>` + `<nav>` + `<footer>` into `#site-header` / `#site-footer`, applies `sectionVisibility` to nav items, shows the maintenance page when `settings.maintenance` is true and returns `null` in that case. Pages call `const s = await mountShell('home'); if (!s) return;`.

- [ ] **Step 1: Write the HTML skeleton** — every public page starts with this (shown for `index.html`; other pages differ only in `<title>`, `<main>` content and the page script):

```html
<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ganesh Puja Trust</title>
<meta name="description" content="Ganesh Puja Trust — history, committee, gallery, events">
<link rel="preconnect" href="https://www.gstatic.com">
<link rel="stylesheet" href="css/site.css">
</head>
<body>
<div id="site-header"></div>
<main id="main" class="container"><p class="muted" id="loading">…</p></main>
<div id="site-footer"></div>
<script type="module" src="js/pages/home.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `js/shell.js`**

```js
import { getSettings } from './content.js';
import { getLang, setLang, onLangChange, pick, t } from './i18n.js';
import { el } from './ui.js';

const NAV = [
  ['home', 'index.html', 'nav.home', null],
  ['about', 'about.html', 'nav.about', 'about'],
  ['committee', 'committee.html', 'nav.committee', 'committee'],
  ['gallery', 'gallery.html', 'nav.gallery', 'gallery'],
  ['events', 'events.html', 'nav.events', 'events'],
];

export async function mountShell(active) {
  const s = await getSettings();
  document.documentElement.lang = getLang();
  const render = () => {
    document.documentElement.lang = getLang();
    document.title = pick(s.name);
    document.getElementById('site-header').replaceChildren(
      el('header', { class: 'site-top' },
        el('a', { href: 'index.html', class: 'brand' },
          s.logoUrl ? el('img', { src: s.logoUrl, alt: '', class: 'logo' }) : null,
          el('span', { text: pick(s.name) })),
        el('button', { class: 'lang', type: 'button', text: getLang() === 'bn' ? 'EN' : 'বাং', onclick: () => setLang(getLang() === 'bn' ? 'en' : 'bn') })),
      el('nav', { class: 'site-nav' },
        ...NAV.filter(([, , , vis]) => !vis || s.sectionVisibility[vis] !== false)
              .map(([key, href, tkey]) => el('a', { href, class: key === active ? 'active' : '', text: t(tkey) }))));
    document.getElementById('site-footer').replaceChildren(
      el('footer', { class: 'site-footer' },
        el('p', { text: pick(s.address) }),
        s.contacts.phone && el('p', {}, el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone })),
        s.contacts.whatsapp && el('p', {}, el('a', { href: `https://wa.me/${s.contacts.whatsapp}`, text: 'WhatsApp' })),
        s.mapUrl && el('p', {}, el('a', { href: s.mapUrl, target: '_blank', rel: 'noopener', text: pick({ bn: 'মানচিত্রে দেখুন', en: 'View on map' }) })),
        s.regNo && el('p', { class: 'muted', text: `Reg. No. ${s.regNo}` }),
        el('p', { class: 'muted', text: `© ${new Date().getFullYear()} ${pick(s.name)}` })));
  };
  render();
  onLangChange(() => { render(); document.dispatchEvent(new CustomEvent('langchange')); });
  if (s.maintenance && !location.pathname.includes('/admin/')) {
    document.getElementById('main').replaceChildren(el('p', { class: 'notice', text: t('footer.maintenance') }));
    return null;
  }
  return s;
}
```

- [ ] **Step 3: Write `css/site.css`** — traditional palette placeholder (Hrishi's colour answer may adjust the three accent tokens; nothing else changes):

```css
:root {
  --saffron:#e07a1f; --deep:#8b1e1e; --gold:#c9a227;
  --bg:#fffaf3; --ink:#2b2118; --muted:#7a6a5c; --card:#fff;
}
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.6 "Noto Serif Bengali", Georgia, serif; }
.container { max-width:960px; margin:0 auto; padding:1rem; }
.site-top { display:flex; align-items:center; justify-content:space-between; padding:.75rem 1rem; background:var(--deep); color:#fff; }
.brand { display:flex; align-items:center; gap:.5rem; color:#fff; text-decoration:none; font-weight:700; font-size:1.15rem; }
.logo { height:36px; width:auto; }
.lang { background:transparent; border:1px solid rgba(255,255,255,.6); color:#fff; border-radius:999px; padding:.2rem .7rem; font:inherit; }
.site-nav { display:flex; gap:.25rem; overflow-x:auto; background:var(--saffron); padding:.4rem .5rem; }
.site-nav a { color:#fff; text-decoration:none; padding:.4rem .8rem; border-radius:999px; white-space:nowrap; }
.site-nav a.active { background:rgba(0,0,0,.2); }
.site-footer { background:var(--deep); color:#fff; padding:1.5rem 1rem; text-align:center; margin-top:3rem; }
.site-footer a { color:var(--gold); }
.muted { color:var(--muted); }
.site-footer .muted { color:rgba(255,255,255,.7); }
.notice { background:#fff3cd; padding:1rem; border-radius:12px; }
.card { background:var(--card); border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,.08); padding:1rem; margin-bottom:1rem; }
h1, h2 { font-weight:700; color:var(--deep); }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:.75rem; }
img.cover { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:12px; }
.hero { background:linear-gradient(135deg,var(--deep),var(--saffron)); color:#fff; padding:2rem 1rem; border-radius:16px; text-align:center; }
.hero h1 { color:#fff; margin:.25rem 0; }
.countdown { display:flex; justify-content:center; gap:1rem; margin-top:1rem; }
.countdown div { background:rgba(255,255,255,.15); border-radius:12px; padding:.5rem .9rem; min-width:70px; }
.countdown b { display:block; font-size:1.6rem; }
.person { text-align:center; }
.person img { width:110px; height:110px; border-radius:50%; object-fit:cover; }
.event { border-left:4px solid var(--gold); padding-left:.75rem; }
.event time { color:var(--muted); font-size:.9rem; }
.lightbox { position:fixed; inset:0; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center; }
.lightbox img { max-width:96vw; max-height:90vh; }
.rich img { max-width:100%; border-radius:12px; }
@media (min-width:720px) { body { font-size:18px; } .hero { padding:3rem 2rem; } }
```

- [ ] **Step 4: Verify** — a temporary `index.html` with the skeleton + `js/pages/home.js` containing just `import { mountShell } from '../shell.js'; mountShell('home');`. Browser pane: header shows the name saved in Task 9, nav has 5 items, toggle flips bn/en; set `maintenance` in admin → public page shows the maintenance notice, admin still works. Mobile preset (375px): nav scrolls horizontally, no horizontal page scroll.

- [ ] **Step 5: Commit**

```bash
git add css/site.css js/shell.js index.html js/pages/home.js docs/build-log.md && git commit -m "feat: public shell (theme, header, nav, footer, lang toggle, maintenance)"
```

---

### Task 14: Home page — hero, countdown, upcoming events, latest album

**Files:**
- Modify: `index.html` (main content), `js/pages/home.js`

- [ ] **Step 1: Write `js/pages/home.js`**

```js
import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, countdown, fmtDate, bnDigits } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('home');
if (s) {
  const [events, albums] = await Promise.all([listPublished('events'), listPublished('albums')]);
  const render = () => {
    const lang = getLang();
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.end || e.start) >= now).slice(0, 3);
    const latest = albums.at(-1);
    const cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
    const num = n => lang === 'bn' ? bnDigits(n) : String(n);
    main.replaceChildren(
      el('section', { class: 'hero' },
        el('h1', { text: pick(s.name) }),
        s.tagline && el('p', { text: pick(s.tagline) }),
        pick(s.theme) && el('p', {}, el('b', { text: pick(s.theme) })),
        cd && (cd.past
          ? el('p', { class: 'countdown-today', text: t('countdown.today') })
          : el('div', { class: 'countdown' },
              el('div', {}, el('b', { text: num(cd.days) }), t('countdown.days')),
              el('div', {}, el('b', { text: num(cd.hours) }), t('countdown.hours')),
              el('div', {}, el('b', { text: num(cd.minutes) }), t('countdown.minutes'))))),
      upcoming.length && s.sectionVisibility.events !== false && el('section', {},
        el('h2', { text: t('events.upcoming') }),
        ...upcoming.map(e => el('div', { class: 'card event' },
          el('time', { text: fmtDate(e.start, lang) }), el('h3', { text: pick(e.title) }),
          e.venue && el('p', { text: pick(e.venue) })))),
      latest && s.sectionVisibility.gallery !== false && el('section', {},
        el('h2', { text: t('nav.gallery') }),
        el('a', { href: `gallery.html?album=${latest.id}`, class: 'card' },
          latest.coverUrl && el('img', { class: 'cover', src: latest.coverUrl, alt: pick(latest.title) }),
          el('p', { text: pick(latest.title) }))));
  };
  render();
  document.addEventListener('langchange', render);
  setInterval(render, 60000);
}
```

- [ ] **Step 2: Verify** — with `pujaDate` set in the future: countdown ticks; set it in the past: "আজই পুজো!"; with no events/albums the sections are absent (no empty headings). Toggle language re-renders digits in Bengali.

- [ ] **Step 3: Commit**

```bash
git add index.html js/pages/home.js docs/build-log.md && git commit -m "feat: home page with hero, countdown, upcoming events, latest album"
```

---

### Task 15: History — admin section + About page (rich text via DOMPurify)

**Files:**
- Create: `admin/js/sections/history.js`, `about.html`, `js/pages/about.js`, `js/rich.js`

**Interfaces:**
- `js/rich.js`: `renderRich(html: string): DocumentFragment` — sanitises with DOMPurify (pinned `https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js`, loaded as a classic script in each page that uses it, exposing `window.DOMPurify`), allowing `p, br, b, strong, i, em, ul, ol, li, h3, h4, a[href], img[src,alt], blockquote`.
- History doc: `{ year:number, title:{bn,en}, body:{bn,en} (HTML), images:string[], order, published, deleted }`.

- [ ] **Step 1: Write `js/rich.js`**

```js
const CFG = { ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'img', 'blockquote'],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'] };
export function renderRich(html) {
  const clean = window.DOMPurify ? window.DOMPurify.sanitize(html ?? '', CFG) : '';
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;             // sanitised — the one permitted innerHTML
  tpl.content.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  return tpl.content;
}
```

- [ ] **Step 2: Write `admin/js/sections/history.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete } from '../forms.js';
import { pick } from '../../../js/i18n.js';

const COLL = 'history';
registerSection(COLL, {
  title: { bn: 'ইতিহাস', en: 'History' }, icon: '📜',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL,
        itemLabel: d => `${d.year} — ${pick(d.title)}`,
        badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      year: textField({ bn: 'বছর', en: 'Year' }, 'year', cur.year ?? new Date().getFullYear(), { type: 'number', required: true }),
      title: biField({ bn: 'শিরোনাম', en: 'Title' }, 'title', cur.title),
      body: biField({ bn: 'বিবরণ (HTML: <p> <b> <ul> <li> <img>)', en: 'Body (HTML allowed)' }, 'body', cur.body, { multiline: true }),
      images: textField({ bn: 'ছবির URL (কমা দিয়ে)', en: 'Image URLs (comma separated)' }, 'images', (cur.images ?? []).join(', ')),
    };
    const read = () => ({ year: Number(f.year.read()), title: f.title.read(), body: f.body.read(),
                          images: f.images.read().split(',').map(x => x.trim()).filter(Boolean), order: cur.order ?? Number(f.year.read()) });
    const save = publish => async e => {
      e.preventDefault();
      const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        id !== 'new' && el('a', { class: 'btn secondary', href: `../about.html?preview=1`, target: '_blank', text: t('admin.preview') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } })));
    form.onsubmit = save(true);
    box.append(form);
  },
});
```

`?preview=1` on a public page makes `about.js` (below) query **all** non-deleted docs instead of published-only — it only works when the visitor is the signed-in admin (rules deny the draft docs to everyone else), so it is safe to leave in.

- [ ] **Step 3: Write `about.html` + `js/pages/about.js`**

`about.html` = skeleton with `<title>History</title>`, plus `<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js"></script>` before the module script `js/pages/about.js`.

```js
import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell('about');
if (s) {
  const preview = new URLSearchParams(location.search).has('preview');
  const items = preview
    ? (await getDocs(query(collection(db, 'history'), where('deleted', '==', false), orderBy('order')))).docs.map(d => ({ id: d.id, ...d.data() }))
    : await listPublished('history');
  const render = () => {
    main.replaceChildren(el('h1', { text: t('nav.about') }),
      items.length ? null : el('p', { class: 'muted', text: t('common.empty') }),
      ...items.map(h => el('article', { class: 'card' },
        el('h2', { text: `${getLang() === 'bn' ? h.year.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]) : h.year} · ${pick(h.title)}` }),
        el('div', { class: 'rich' }, renderRich(pick(h.body))),
        ...(h.images ?? []).map(src => el('img', { class: 'cover', src, alt: '', loading: 'lazy' })))));
  };
  render();
  document.addEventListener('langchange', render);
}
```

- [ ] **Step 4: XSS check** — in admin, save a history body containing `<img src=x onerror=alert(1)><script>alert(2)</script><p>ok</p>`; open About: no alert fires, only "ok" renders (inspect: `onerror` and `<script>` stripped). Record this check in the build-log.

- [ ] **Step 5: Verify** — draft entry invisible on About; publish → visible; `?preview=1` as admin shows the draft; reorder ↑↓ changes order on About.

- [ ] **Step 6: Commit**

```bash
git add js/rich.js admin/js/sections/history.js about.html js/pages/about.js docs/build-log.md && git commit -m "feat: history section (admin) and about page with sanitised rich text"
```

---

### Task 16: Committee — admin section + page

**Files:**
- Create: `admin/js/sections/committee.js`, `committee.html`, `js/pages/committee.js`

**Interfaces:**
- Committee doc: `{ name:{bn,en}, post:{bn,en}, photoUrl:string, order, isPublic:boolean, deleted:boolean }`. Note: this collection uses `isPublic`, not `published` — `saveDoc`'s `publish` option is therefore **not** used; the form writes `isPublic` explicitly.

- [ ] **Step 1: Write `admin/js/sections/committee.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, boolField, listView, saveDoc, softDelete } from '../forms.js';
import { imageField } from '../upload.js';

const COLL = 'committee';
registerSection(COLL, {
  title: { bn: 'কমিটি', en: 'Committee' }, icon: '👥',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${pick(d.name)} — ${pick(d.post)}`,
        badge: d => d.isPublic ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      name: biField({ bn: 'নাম', en: 'Name' }, 'name', cur.name),
      post: biField({ bn: 'পদ', en: 'Post' }, 'post', cur.post),
      photo: imageField(ctx, { bn: 'ছবি', en: 'Photo' }, cur.photoUrl, { folder: 'public/committee', max: 600 }),
      isPublic: boolField({ bn: 'ওয়েবসাইটে দেখাও', en: 'Show on website' }, 'isPublic', cur.isPublic ?? true),
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } })));
    form.onsubmit = async e => {
      e.preventDefault();
      const data = { name: f.name.read(), post: f.post.read(), photoUrl: f.photo.read(), isPublic: f.isPublic.read(), order: cur.order ?? Date.now() };
      const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, data);
      ctx.navigate(`#${COLL}/${newId}`);
    };
    box.append(form);
  },
});
```

`saveDoc` will also write `published:false` on create (harmless extra field; rules for `committee` ignore it).

- [ ] **Step 2: Write `committee.html` + `js/pages/committee.js`**

```js
import { mountShell } from '../shell.js';
import { listCommittee } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('committee');
if (s) {
  const people = await listCommittee();
  const render = () => main.replaceChildren(el('h1', { text: t('nav.committee') }),
    people.length ? el('div', { class: 'grid' }, ...people.map(p => el('div', { class: 'card person' },
      el('img', { src: p.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="55" cy="55" r="55" fill="%23ddd"/></svg>', alt: '', loading: 'lazy' }),
      el('h3', { text: pick(p.name) }), el('p', { class: 'muted', text: pick(p.post) }))))
    : el('p', { class: 'muted', text: t('common.empty') }));
  render();
  document.addEventListener('langchange', render);
}
```

- [ ] **Step 3: Verify** — add two members (one hidden); public page shows one; reorder works. (Photo upload is Task 17 — until then `imageField` may be a stub returning the existing URL; do Task 17 first if executing in order matters — see Task 17 note.)

- [ ] **Step 4: Commit**

```bash
git add admin/js/sections/committee.js committee.html js/pages/committee.js docs/build-log.md && git commit -m "feat: committee section (admin) and public committee page"
```

---

### Task 17: Image upload — `resize.js` (pure, TDD) + `upload.js` (browser)

Execute **before** Task 16 and 18 if working strictly in order (both import `imageField`); the task numbering follows the spec's page order.

**Files:**
- Create: `admin/js/resize.js`, `tests/unit/resize.test.js`, `admin/js/upload.js`

**Interfaces:**
- `resize.js`: `fitDims(w, h, max = 1600) → { w, h }` — scales the longer side down to `max`, never up, integer output.
- `upload.js`:
  - `resizeImage(file: File, { max = 1600, quality = 0.82 } = {}) → Promise<Blob>` (WebP via canvas; falls back to JPEG if `canvas.toBlob` yields null for webp).
  - `uploadPublic(ctx, blob, path, onProgress?) → Promise<string>` — resumable upload to `public/<path>`, returns download URL.
  - `imageField(ctx, label:{bn,en}, currentUrl='', { folder, max=1600 }) → { node, read(): string }` — file picker (`accept="image/*" capture`), progress bar, thumbnail; `read()` returns the latest URL.
  - `multiImageField(ctx, label, { folder, max=1600, onEach(url) })` → node — multi-select, uploads sequentially, calls `onEach` per finished file (used by albums).

- [ ] **Step 1: Failing tests**

```js
// tests/unit/resize.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitDims } from '../../admin/js/resize.js';
test('landscape scales longer side', () => assert.deepEqual(fitDims(4000, 3000, 1600), { w: 1600, h: 1200 }));
test('portrait scales height', () => assert.deepEqual(fitDims(3000, 4000, 1600), { w: 1200, h: 1600 }));
test('never upscales', () => assert.deepEqual(fitDims(800, 600, 1600), { w: 800, h: 600 }));
test('integer output', () => assert.deepEqual(fitDims(1001, 333, 500), { w: 500, h: 166 }));
test('default max 1600', () => assert.deepEqual(fitDims(3200, 3200), { w: 1600, h: 1600 }));
```

- [ ] **Step 2: Run** — `node --test tests/unit/resize.test.js` → FAIL (missing module).

- [ ] **Step 3: Write `admin/js/resize.js`**

```js
export function fitDims(w, h, max = 1600) {
  const longest = Math.max(w, h);
  if (longest <= max) return { w, h };
  const k = max / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}
```

- [ ] **Step 4: Run** — 5 passing.

- [ ] **Step 5: Write `admin/js/upload.js`**

```js
import { ref, uploadBytesResumable, getDownloadURL } from '../../js/firebase.js';
import { pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
import { fitDims } from './resize.js';

export async function resizeImage(file, { max = 1600, quality = 0.82 } = {}) {
  const bmp = await createImageBitmap(file);
  const { w, h } = fitDims(bmp.width, bmp.height, max);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const toBlob = type => new Promise(res => canvas.toBlob(res, type, quality));
  return (await toBlob('image/webp')) ?? (await toBlob('image/jpeg'));
}

export function uploadPublic(ctx, blob, path, onProgress) {
  const full = path.startsWith('public/') ? path : `public/${path}`;
  const task = uploadBytesResumable(ref(ctx.storage, full), blob, { contentType: blob.type, cacheControl: 'public,max-age=31536000,immutable' });
  return new Promise((resolve, reject) => {
    task.on('state_changed', s => onProgress?.(s.bytesTransferred / s.totalBytes), reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}

const fname = (folder, blob) => `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;

export function imageField(ctx, label, currentUrl = '', { folder, max = 1600 } = {}) {
  let url = currentUrl;
  const img = el('img', { class: 'thumb', src: url || '', alt: '', hidden: !url });
  const bar = el('progress', { max: 1, value: 0, hidden: true });
  const input = el('input', { type: 'file', accept: 'image/*' });
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    try {
      bar.hidden = false;
      const blob = await resizeImage(file, { max });
      url = await uploadPublic(ctx, blob, fname(folder, blob), p => { bar.value = p; });
      img.src = url; img.hidden = false; bar.hidden = true;
    } catch (e) { console.error(e); toast('Upload failed', 'err'); bar.hidden = true; }
  };
  return { node: el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'row' }, img, input), bar), read: () => url };
}

export function multiImageField(ctx, label, { folder, max = 1600, onEach }) {
  const bar = el('progress', { max: 1, value: 0, hidden: true });
  const status = el('span', { class: 'muted' });
  const input = el('input', { type: 'file', accept: 'image/*', multiple: true });
  input.onchange = async () => {
    const files = [...input.files]; let n = 0;
    bar.hidden = false;
    for (const file of files) {
      try {
        const blob = await resizeImage(file, { max });
        const url = await uploadPublic(ctx, blob, fname(folder, blob), p => { bar.value = p; });
        await onEach(url); n++; status.textContent = `${n}/${files.length}`;
      } catch (e) { console.error(e); toast(`Failed: ${file.name}`, 'err'); }
    }
    bar.hidden = true; input.value = '';
  };
  return el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'row' }, input, status), bar);
}
```

- [ ] **Step 6: Verify** — in `/admin/#committee/new` pick a 4000px photo: progress bar moves, thumbnail appears, Emulator UI → Storage shows a `public/committee/…webp` under ~200 KB. Storage rules already deny non-admins (Task 6).

- [ ] **Step 7: Commit**

```bash
git add admin/js/resize.js admin/js/upload.js tests/unit/resize.test.js docs/build-log.md && git commit -m "feat: client-side image resize and resumable public upload"
```

---

### Task 18: Gallery — albums + photos (admin) and public gallery with lightbox

**Files:**
- Create: `admin/js/sections/albums.js`, `gallery.html`, `js/pages/gallery.js`

**Interfaces:**
- Album doc: `{ title:{bn,en}, year:number, coverUrl, order, published, deleted }`; photo doc under `albums/{id}/photos`: `{ url, caption:{bn,en}, order, deleted }`.

- [ ] **Step 1: Write `admin/js/sections/albums.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc, getDocs, collection, query, where, orderBy, setDoc, updateDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete } from '../forms.js';
import { imageField, multiImageField } from '../upload.js';
import { logAudit } from '../audit.js';

const COLL = 'albums';
registerSection(COLL, {
  title: { bn: 'গ্যালারি', en: 'Gallery' }, icon: '🖼️',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${d.year} — ${pick(d.title)}`, badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField({ bn: 'অ্যালবামের নাম', en: 'Album title' }, 'title', cur.title),
      year: textField({ bn: 'বছর', en: 'Year' }, 'year', cur.year ?? new Date().getFullYear(), { type: 'number', required: true }),
      cover: imageField(ctx, { bn: 'কভার ছবি', en: 'Cover photo' }, cur.coverUrl, { folder: `public/albums/${id}`, max: 1200 }),
    };
    const read = () => ({ title: f.title.read(), year: Number(f.year.read()), coverUrl: f.cover.read(), order: cur.order ?? Number(f.year.read()) * 1000 });
    const save = publish => async e => {
      e.preventDefault();
      const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        id !== 'new' && el('a', { class: 'btn secondary', href: `../gallery.html?album=${id}&preview=1`, target: '_blank', text: t('admin.preview') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } })));
    form.onsubmit = save(true);
    box.append(form);
    if (id === 'new') return;

    // ---- photos ----
    const photosColl = collection(ctx.db, COLL, id, 'photos');
    const photosBox = el('div', { class: 'card' });
    const renderPhotos = async () => {
      const snap = await getDocs(query(photosColl, where('deleted', '==', false), orderBy('order')));
      const photos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      photosBox.replaceChildren(
        el('h3', { text: `${pick({ bn: 'ছবি', en: 'Photos' })} (${photos.length})` }),
        multiImageField(ctx, { bn: 'ছবি যোগ করুন (একাধিক)', en: 'Add photos (multiple)' }, {
          folder: `public/albums/${id}`,
          onEach: async url => {
            const pref = doc(photosColl);
            await setDoc(pref, { url, caption: { bn: '', en: '' }, order: Date.now(), deleted: false, createdAt: serverTimestamp() });
            await logAudit(ctx, 'create', `${COLL}/${id}/photos/${pref.id}`, null, { url });
            if (!f.cover.read()) { await updateDoc(doc(ctx.db, COLL, id), { coverUrl: url }); }
            await renderPhotos();
          },
        }),
        ...photos.map((p, i) => {
          const cap = el('input', { value: pick(p.caption), placeholder: 'caption' });
          cap.onchange = async () => { await updateDoc(doc(photosColl, p.id), { caption: { bn: cap.value, en: cap.value } }); toast(t('admin.saved')); };
          const swap = async j => {
            if (j < 0 || j >= photos.length) return;
            await updateDoc(doc(photosColl, p.id), { order: photos[j].order });
            await updateDoc(doc(photosColl, photos[j].id), { order: p.order });
            await renderPhotos();
          };
          return el('div', { class: 'list-item' }, el('img', { class: 'thumb', src: p.url, alt: '' }), cap,
            el('button', { class: 'btn-sm', type: 'button', text: '↑', onclick: () => swap(i - 1) }),
            el('button', { class: 'btn-sm', type: 'button', text: '↓', onclick: () => swap(i + 1) }),
            el('button', { class: 'btn-sm', type: 'button', text: '🗑', onclick: async () => {
              if (!confirm(t('admin.confirmDelete'))) return;
              await updateDoc(doc(photosColl, p.id), { deleted: true });
              await logAudit(ctx, 'delete', `${COLL}/${id}/photos/${p.id}`, { url: p.url }, { deleted: true });
              await renderPhotos();
            } }));
        }));
    };
    await renderPhotos();
    box.append(photosBox);
  },
});
```

- [ ] **Step 2: Write `gallery.html` + `js/pages/gallery.js`**

```js
import { mountShell } from '../shell.js';
import { listPublished, listPhotos, getPublished } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('gallery');
if (s) {
  const params = new URLSearchParams(location.search);
  const albumId = params.get('album');
  const preview = params.has('preview');
  if (!albumId) {
    const albums = (await listPublished('albums')).reverse();   // newest first
    const render = () => main.replaceChildren(el('h1', { text: t('gallery.albums') }),
      albums.length ? el('div', { class: 'grid' }, ...albums.map(a => el('a', { class: 'card', href: `gallery.html?album=${a.id}` },
        a.coverUrl && el('img', { class: 'cover', src: a.coverUrl, alt: pick(a.title), loading: 'lazy' }),
        el('p', { text: `${a.year} · ${pick(a.title)}` })))) : el('p', { class: 'muted', text: t('common.empty') }));
    render(); document.addEventListener('langchange', render);
  } else {
    const album = preview ? (await getDoc(doc(db, 'albums', albumId))).data() : await getPublished('albums', albumId);
    if (!album) { main.replaceChildren(el('p', { class: 'muted', text: t('common.empty') })); }
    else {
      const photos = await listPhotos(albumId);
      const open = i => {
        const box = el('div', { class: 'lightbox', onclick: () => box.remove() }, el('img', { src: photos[i].url, alt: pick(photos[i].caption) }));
        document.body.append(box);
      };
      const render = () => main.replaceChildren(
        el('a', { href: 'gallery.html', text: '‹ ' + t('gallery.albums') }),
        el('h1', { text: `${album.year} · ${pick(album.title)}` }),
        el('div', { class: 'grid' }, ...photos.map((p, i) => el('img', { class: 'cover', src: p.url, alt: pick(p.caption), loading: 'lazy', onclick: () => open(i) }))));
      render(); document.addEventListener('langchange', render);
    }
  }
}
```

- [ ] **Step 3: Verify** — create album, upload 3 photos (multi-select), first becomes cover; publish; public gallery lists it newest-first; tap → lightbox; draft album 404s publicly but `?preview=1` shows it to admin. Anon in another (incognito) tab cannot load `albums/<draft>/photos` (console shows permission-denied — expected and silent).

- [ ] **Step 4: Commit**

```bash
git add admin/js/sections/albums.js gallery.html js/pages/gallery.js docs/build-log.md && git commit -m "feat: gallery albums with multi-photo upload (admin) and public lightbox"
```

---

### Task 19: Events — admin section + page

**Files:**
- Create: `admin/js/sections/events.js`, `events.html`, `js/pages/events.js`

**Interfaces:**
- Event doc: `{ title:{bn,en}, venue:{bn,en}, desc:{bn,en}, start:ISO string, end:ISO string|'', order:number (= start epoch ms), published, deleted }`.

- [ ] **Step 1: Write `admin/js/sections/events.js`**

```js
import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete } from '../forms.js';

const COLL = 'events';
// datetime-local wants local wall time; shift by the zone offset before slicing.
const toLocal = iso => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
registerSection(COLL, {
  title: { bn: 'অনুষ্ঠান', en: 'Events' }, icon: '📅',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${fmtDate(d.start, ctx.lang)} — ${pick(d.title)}`, badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`), reorder: false,
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField({ bn: 'নাম', en: 'Title' }, 'title', cur.title),
      start: textField({ bn: 'শুরু', en: 'Start' }, 'start', toLocal(cur.start), { type: 'datetime-local', required: true }),
      end: textField({ bn: 'শেষ (ঐচ্ছিক)', en: 'End (optional)' }, 'end', toLocal(cur.end), { type: 'datetime-local' }),
      venue: biField({ bn: 'স্থান', en: 'Venue' }, 'venue', cur.venue),
      desc: biField({ bn: 'বিবরণ', en: 'Description' }, 'desc', cur.desc, { multiline: true }),
    };
    const read = () => {
      const start = new Date(f.start.read()).toISOString();
      return { title: f.title.read(), venue: f.venue.read(), desc: f.desc.read(), start,
               end: f.end.read() ? new Date(f.end.read()).toISOString() : '', order: new Date(start).getTime() };
    };
    const save = publish => async e => {
      e.preventDefault();
      const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } })));
    form.onsubmit = save(true);
    box.append(form);
  },
});
```

- [ ] **Step 2: Write `events.html` + `js/pages/events.js`**

```js
import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('events');
if (s) {
  const all = await listPublished('events');
  const render = () => {
    const now = new Date(), lang = getLang();
    const up = all.filter(e => new Date(e.end || e.start) >= now);
    const past = all.filter(e => new Date(e.end || e.start) < now).reverse();
    const card = e => el('div', { class: 'card event' },
      el('time', { text: fmtDate(e.start, lang) + (e.end ? ' – ' + fmtDate(e.end, lang) : '') }),
      el('h3', { text: pick(e.title) }), pick(e.venue) && el('p', { text: pick(e.venue) }),
      pick(e.desc) && el('p', { class: 'muted', text: pick(e.desc) }));
    main.replaceChildren(
      el('h1', { text: t('events.upcoming') }),
      up.length ? el('div', {}, ...up.map(card)) : el('p', { class: 'muted', text: t('common.empty') }),
      past.length && el('h2', { text: t('events.past') }), ...past.map(card));
  };
  render(); document.addEventListener('langchange', render);
}
```

- [ ] **Step 3: Verify** — one past, one future event; public page splits them; home shows only the future one; datetime picker round-trips the same local time after save + reopen.

- [ ] **Step 4: Commit**

```bash
git add admin/js/sections/events.js events.html js/pages/events.js docs/build-log.md && git commit -m "feat: events section (admin) and public events page"
```

---

### Task 20: Emulator seed + Playwright e2e

**Files:**
- Create: `tests/seed/seed.js`, `playwright.config.js`, `tests/e2e/public.spec.js`, `tests/e2e/admin.spec.js`

**Interfaces:**
- `npm run seed` (emulators must be running) creates admin `admin@example.com / password12345` in the Auth emulator, the `admins/{uid}` doc, `settings/site`, one published + one draft doc in each of history/events/albums (+2 photos), two committee rows (one hidden).

- [ ] **Step 1: Write `tests/seed/seed.js`**

```js
// Seeds the running emulators. Never points at production: it refuses unless the emulator env vars are set.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ projectId: 'demo-trust' });
const db = getFirestore(app), auth = getAuth(app);
const bi = (bn, en) => ({ bn, en });

const admin = await auth.createUser({ email: 'admin@example.com', password: 'password12345', emailVerified: true }).catch(() => auth.getUserByEmail('admin@example.com'));
await db.doc(`admins/${admin.uid}`).set({ createdAt: new Date() });
await db.doc('settings/site').set({
  name: bi('গণেশ পুজো ট্রাস্ট', 'Ganesh Puja Trust'), tagline: bi('সবার পুজো', 'Everyone\'s puja'),
  address: bi('মালদা', 'Malda'), theme: bi('', ''), logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '', email: '' }, regNo: '', has80G: false, upiId: '', upiQrUrl: '',
  pujaDate: new Date(Date.now() + 10 * 86400000).toISOString(), maintenance: false, defaultLang: 'bn',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: false, transparency: false, members: false },
});
const base = { deleted: false, createdAt: new Date() };
await db.doc('history/h1').set({ ...base, year: 2025, title: bi('২০২৫', '2025'), body: bi('<p>গত বছর</p>', '<p>Last year</p>'), images: [], order: 2025, published: true });
await db.doc('history/h2').set({ ...base, year: 2024, title: bi('ড্রাফট', 'Draft'), body: bi('', ''), images: [], order: 2024, published: false });
await db.doc('events/e1').set({ ...base, title: bi('আগামী', 'Upcoming'), venue: bi('মণ্ডপ', 'Pandal'), desc: bi('', ''), start: new Date(Date.now() + 5 * 86400000).toISOString(), end: '', order: 1, published: true });
await db.doc('events/e2').set({ ...base, title: bi('ড্রাফট', 'Draft event'), venue: bi('', ''), desc: bi('', ''), start: new Date().toISOString(), end: '', order: 2, published: false });
await db.doc('albums/a1').set({ ...base, title: bi('২০২৫ পুজো', 'Puja 2025'), year: 2025, coverUrl: 'https://placehold.co/400x300', order: 1, published: true });
await db.doc('albums/a1/photos/p1').set({ ...base, url: 'https://placehold.co/800x600', caption: bi('', ''), order: 1 });
await db.doc('albums/a1/photos/p2').set({ ...base, url: 'https://placehold.co/801x600', caption: bi('', ''), order: 2 });
await db.doc('albums/a2').set({ ...base, title: bi('ড্রাফট', 'Draft album'), year: 2024, coverUrl: '', order: 2, published: false });
await db.doc('committee/c1').set({ ...base, name: bi('সভাপতি', 'President'), post: bi('সভাপতি', 'President'), photoUrl: '', order: 1, isPublic: true });
await db.doc('committee/c2').set({ ...base, name: bi('গোপন', 'Hidden'), post: bi('', ''), photoUrl: '', order: 2, isPublic: false });
console.log('seeded; admin uid', admin.uid);
process.exit(0);
```

- [ ] **Step 2: `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5500', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npm run serve', url: 'http://127.0.0.1:5500/index.html', reuseExistingServer: true },
});
```

Run `npx playwright install chromium` once. E2E expects emulators running and seeded (`npm run emu` then `npm run seed`).

- [ ] **Step 3: Write `tests/e2e/public.spec.js`**

```js
import { test, expect } from '@playwright/test';
test('home shows name, countdown, upcoming event, latest album', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.brand')).toContainText('গণেশ পুজো ট্রাস্ট');
  await expect(page.locator('.countdown b').first()).toHaveText(/[০-৯]+/);
  await expect(page.locator('.event h3')).toHaveText('আগামী');
  await expect(page.locator('a[href^="gallery.html?album=a1"]')).toBeVisible();
});
test('language toggle switches to English and persists', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('.lang');
  await expect(page.locator('.brand')).toContainText('Ganesh Puja Trust');
  await page.goto('/events.html');
  await expect(page.locator('h1')).toHaveText('Upcoming events');
});
test('drafts and hidden rows never render publicly', async ({ page }) => {
  await page.goto('/about.html');  await expect(page.locator('article')).toHaveCount(1);
  await page.goto('/events.html'); await expect(page.locator('.event')).toHaveCount(1);
  await page.goto('/gallery.html'); await expect(page.locator('.grid a')).toHaveCount(1);
  await page.goto('/committee.html'); await expect(page.locator('.person')).toHaveCount(1);
  await page.goto('/gallery.html?album=a2'); await expect(page.locator('h1')).toHaveCount(0);
});
test('no horizontal overflow on mobile', async ({ page }) => {
  for (const p of ['index', 'about', 'committee', 'gallery', 'events']) {
    await page.goto(`/${p}.html`);
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(w, p).toBeLessThanOrEqual(0);
  }
});
```

- [ ] **Step 4: Write `tests/e2e/admin.spec.js`**

```js
import { test, expect } from '@playwright/test';
async function login(page) {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(6);
}
test('wrong password fails', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'wrongwrongwrong');
  await page.click('button[type=submit]');
  await expect(page.locator('#adm-login-err')).toContainText('Login failed');
});
test('create + publish an event, it appears publicly', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#events/new');
  await page.fill('input[name="title.bn"]', 'ই২ই অনুষ্ঠান');
  await page.fill('input[name="title.en"]', 'E2E event');
  const soon = new Date(Date.now() + 2 * 86400000); soon.setSeconds(0, 0);
  await page.fill('input[name=start]', new Date(soon.getTime() - soon.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  await page.click('button[type=submit]');            // publish
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/events.html');
  await expect(page.locator('.event h3', { hasText: 'ই২ই অনুষ্ঠান' })).toBeVisible();
});
test('soft delete asks confirm + reauth and hides the row', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#history/h1');
  page.on('dialog', d => d.type() === 'confirm' ? d.accept() : d.accept('password12345'));
  await page.click('button.danger');
  await expect(page).toHaveURL(/#history$/);
  await page.goto('/about.html');
  await expect(page.locator('article')).toHaveCount(0);
});
```

Order matters: the soft-delete test mutates seed data; Playwright runs files in parallel by default — set `workers: 1` in the config, and re-run `npm run seed` before each e2e run (`seed.js` uses `set`, so re-seeding restores `h1`).

- [ ] **Step 5: Run** — `npm run emu` (bg) → `npm run seed` → `npm run e2e`. Expected: 7 passing.

- [ ] **Step 6: Commit**

```bash
git add tests/seed tests/e2e playwright.config.js docs/build-log.md && git commit -m "test: emulator seed and playwright e2e for public pages and admin flows"
```

---

### Task 21: Go-live — real project verification, indexes, admin guide, handover

**Files:**
- Create/finish: `docs/user-guide/admin-guide.md`, `firestore.indexes.json`
- Modify: `firebase.json` (indexes), `docs/pending.md`, `docs/PROJECT_CONTEXT.md`, `docs/build-log.md`

- [ ] **Step 1: Composite indexes on the real project** — open the live site pages once as anon and once as admin; each "index required" console error carries a create link; create all four (history, events, albums: `published, deleted, order`; committee: `isPublic, deleted, order`). Then:

```bash
npx firebase firestore:indexes > firestore.indexes.json
```

and add `"indexes": "firestore.indexes.json"` under `"firestore"` in `firebase.json`.

- [ ] **Step 2: Live checklist on the custom domain (Browser pane, mobile preset), tick each in build-log:**
  - [ ] anon: all five pages render from the real Firestore; no console errors; Lighthouse mobile perf ≥ 90
  - [ ] anon: DevTools → try `setDoc` on `settings/site` from console → permission-denied
  - [ ] admin: login on Hrishi's phone; upload a photo (real camera) → appears in gallery within seconds
  - [ ] admin: Export JSON downloads on phone
  - [ ] second Google-auth user with no `admins` doc → rejected
  - [ ] maintenance toggle hides the public site, admin still works; toggle back
  - [ ] App Check: enable **Enforce** for Firestore + Storage in console → reload public site → still works (reCAPTCHA token issued); a `curl` to the Firestore REST endpoint without a token → 403
  - [ ] Budget alert exists in GCP Billing
- [ ] **Step 3: Write `docs/user-guide/admin-guide.md`** (Bengali, screenshots optional): login, each card, draft vs publish, photo tips (portrait for committee, landscape for albums), reorder, delete is soft, Export monthly, "যদি ভুল হয়" (contact developer), what NOT to do (share password, edit Firestore console directly).
- [ ] **Step 4: Update docs** — `pending.md`: tick Phase 0/1, list Phase 2 next; `PROJECT_CONTEXT.md`: add "Live since <date> at <domain>" and the index list; `build-log.md`: go-live entry with the checklist results.
- [ ] **Step 5: Commit + push + tag**

```bash
git add -A && git commit -m "docs: go-live verification, admin guide, indexes" && git tag v1.0.0 && git push && git push --tags
```

---

## Self-review against the spec

| Spec item | Task |
|---|---|
| §4 architecture: multi-page static, pinned SDK, offline persistence, client resize, DOMPurify | 7, 12, 13, 15, 17 |
| §4 Blaze plan decision + ₹100 alert | 2 (now decided: Blaze required) |
| §5 collections settings/history/committee/albums(+photos)/events/admins/audit | 5, 9, 15, 16, 18, 19 |
| §5 phase-2+ collections | explicitly default-deny (Task 5 rules + test) — added in their own phases |
| §6.1–6.2 rules default deny, admin-only writes, audit append-only, storage limits | 5, 6 |
| §6.3 App Check enforced | 7 (init), 11/21 (enforce after verification) |
| §6.4 referrer-restricted key, no service account in repo | 2 checklist, `.gitignore`, pre-commit hook |
| §6.5 admin auth ≥12 chars, verified email, unlinked `/admin/`, re-auth for delete/settings | 8, 9 (`reauth`), robots noindex |
| §6.7 rules matrix + mutation checks | 5, 6 |
| §6.8 Export JSON | 10 |
| §6.9 XSS | 15 (+ `el()` uses textContent everywhere else) |
| §7 dashboard cards, bn+en fields, draft/publish, upload with progress, ↑↓ reorder, soft delete, preview, section toggles, maintenance | 8, 9, 13, 15–19 |
| §8 Phase 0 + 1 deliverables | 1–11, 12–21 |
| §9 unit, rules, e2e, live verify, Lighthouse | 3, 4, 17 (unit); 5, 6 (rules); 20 (e2e); 21 (live) |
| §10 docs discipline | 1, 21 |
| §11 inputs from Hrishi | 2 (Firebase/Blaze), 11 (repo, domain), 13 (colours), 21 (phone tests) |

Type consistency checked: `registerSection` / `ctx` shape (Task 8) used identically in 9, 10, 15, 16, 18, 19; `saveDoc/softDelete/listView/biField/textField/boolField` signatures (Task 9) match all callers; `imageField/multiImageField` (Task 17) match 16 and 18; `listPublished/listCommittee/listPhotos/getPublished` (Task 12) match 14, 15, 16, 18, 19; `fmtDate/bnDigits/countdown/el/toast` (Task 4) match all pages. `committee` uses `isPublic` (not `published`) consistently in rules, seed, admin, content.

Known deliberate simplifications (Phase 1): photo captions are single-language (same text in bn/en); history images are URL fields (upload via the album flow, paste URL) — both listed in `pending.md` as Phase 1.1 polish.
