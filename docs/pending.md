# Pending / Roadmap

## Phase 0 — Foundation

- [x] Task 1 scaffold (2026-09-03)
- [x] Task 2 Firebase project decisions (Blaze, ₹100 alert) (2026-09-03)
- [x] Task 3 i18n (2026-09-03)
- [x] Task 4 ui helpers (2026-09-03)
- [x] Task 5 Firestore rules (2026-09-03)
- [x] Task 6 Storage rules (2026-09-03)
- [x] Task 7 firebase.js (2026-09-03)
- [x] Task 8 admin auth shell (2026-09-03)
- [x] Task 9 settings + audit (2026-09-03)
- [x] Task 10 export (2026-09-03)
- [ ] Task 11 partial — code done (placeholder index, .nojekyll, deploy guide); ⏳ owner: GitHub PAT with Administration permission → repo create + Pages, real Firebase project + Blaze, rules deploy, custom domain

## Phase 1 — Showcase

- [x] Task 12 content.js (2026-09-03)
- [x] Task 13 public shell (2026-09-03)
- [x] Task 14 home (2026-09-03)
- [x] Task 15 history (2026-09-03)
- [x] Task 16 committee (2026-09-03)
- [x] Task 17 upload (2026-09-03)
- [x] Task 18 gallery (2026-09-03)
- [x] Task 19 events (2026-09-03)
- [x] Task 20 e2e (2026-09-03)
- [~] Task 21 — docs done; Firestore rules + 9 indexes LIVE 2026-09-03; Pages+Storage live 2026-09-04; ⏳ owner: App Check key, domain, phone upload test, live checklist

## Deferred minors (from reviews)

Small, non-blocking items noted during code review across Tasks 1–20. None of these gate go-live; revisit opportunistically.

- rules test matrix cells still missing (other-user reads of drafts, updates of existing docs by anon/other, admin list on admins, admin read of unknown collections) — admin list on audit/committee added in the 2026-09-03 fix wave
- image/svg+xml passes Storage okType (admin-only upload; revisit if Storage is fronted by our domain)
- rich.js: ALLOW_DATA_ATTR/ARIA false, RETURN_DOM_FRAGMENT, rel noreferrer — console.warn on missing DOMPurify added in the 2026-09-03 fix wave
- reauth uses unmasked prompt()
- captions single-language; history images are URL fields
- events: upcoming wrapped in div, past not
- stale `// Task N` labels in admin.js

## Phase 2 — Donation · Phase 3 — Live hub · Phase 4 — Members

Plan: `docs/superpowers/plans/2026-09-04-phase-2-4-donation-transparency-live-members.md`.

- [x] Task 1 rules + tests + indexes for donations/transparency/announcements/members/notices/roster (2026-09-04)
- [x] Task 2 shared plumbing — i18n, content reads, nav, money helpers, PDF upload (2026-09-04)
- [x] Task 3 admin donations section (2026-09-04)
- [x] Task 4 public donate.html (2026-09-04)
- [x] Task 5 admin transparency section + PDF upload (2026-09-04)
- [x] Task 6 public transparency.html (2026-09-04)
- [x] Task 7 admin announcements section (2026-09-04)
- [x] Task 8 live strip on home (realtime) + today's schedule (2026-09-04)
- [x] Task 9 phone auth enablement + seed/e2e groundwork (2026-09-04)
- [x] Task 10 admin members section + payments (2026-09-04)
- [x] Task 11 admin notices + roster sections (2026-09-04)
- [x] Task 12 public members.html (phone OTP portal) (2026-09-04)
- [x] Task 13 e2e for phases 2–4 (donate/transparency/live/members, 19 specs total) + docs; members-portal "torn down after sign-in" concern investigated, not reproducible against committed code (2026-09-04)
- [x] Task 14 production rollout: rules/25 indexes deployed, `testPhoneNumbers` auth config confirmed, demo data (12 donations, 2 transparency years, 4 announcements, 5 more members, 2 more notices, 3 more roster rows) written and live-verified end-to-end (2026-09-04) — **phases 2–4 are LIVE**, tagged `v2.0.0`

### ⏳ Owner still to test (post-launch, phases 2–4)

- **Phone OTP on a real phone**: the `+919999999999` / `123456` test pair was never exercised end-to-end against production from an actual device (only `RecaptchaVerifier`/form-render was checked in this rollout, per plan — reCAPTCHA can't be driven headlessly). Try signing in on `members.html` from a phone.
- **App Check key**: confirm the production `APPCHECK_SITE_KEY` in `js/firebase-config.js` is the real one and that the App Check console shows verified traffic, not just the "unverified" warning.
- **Custom domain** (if/when one is added): re-run `node scripts/auth-config.mjs --domain <name>` so phone auth's `authorizedDomains` picks it up — see `docs/user-guide/deploy.md`.
- **Real donation/transparency/UPI data**: everything written in Task 14 is dummy demo content (`upiId: 'ganeshpujatrust@upi'`, `regNo: 'WB/2026/DEMO'`, placeholder QR, generated PDFs) — replace all of it from `/admin/` before telling real donors to use the page.

### Deferred minors from Phase 2–4 reviews

Small, non-blocking items noted during Tasks 1–13 review. None gate Task 14; revisit opportunistically.

- `admin/js/upload.js`'s `fileField` (PDF upload) stores the raw uploaded filename in the Storage path rather than a sanitised/slugified one
- PDF MIME type is checked by Storage rules at write time only, not re-verified client-side before upload starts
- transparency admin form: a blank amount field is coerced to `0` rather than rejected/required
- `fileField`'s Storage folder is stamped with the current year at row-add time, not the transparency doc's own `year` field — editing an old year's doc later still files new uploads under this year
- admin tab click (e.g. switching donations year-select) triggers a full section re-render/refetch rather than an in-place list filter
- a few `catch` blocks across the six new admin sections set an `errored` flag that is read but never actually branched on in the render (dead code, harmless — the generic `common.error` text still shows via the surrounding try/catch)
- announcements admin list's "সম্পাদনা"/"Edit" button label doesn't change to anything else while a row is mid-edit
- `js/pages/members.js`'s `normalizePhone` (and its admin twin) accepts an 11-digit input with a leading 0 (e.g. `09999999999`) as if it were a valid `+0999...` E.164 number — no leading-zero rejection
- donations/notices/roster soft-delete and members phone-uniqueness checks have a TOCTOU window (read-then-write, no transaction) — acceptable at single-admin scale, would need a transaction or Firestore-side uniqueness constraint at larger scale
- `js/pages/home.js`'s live strip can paint once before `onAnnouncements()`'s first `onSnapshot` callback resolves (empty strip flashes, then fills) — not a correctness bug, just a first-paint flicker

## Phase 5 — Design system

Plan: `docs/superpowers/plans/2026-09-10-phase-5-design-system.md`. Spec: `docs/superpowers/specs/2026-09-10-phase-5-design-system.md`.

- [x] Tasks 1–13 all done (2026-09-11) — five selectable themes (`js/theme.js`), rules whitelist for
  `settings.design`, `css/site.css`+`css/themes.css`, hand-drawn Ganesh/diya art (`js/art.js`), shell
  rewrite (site-wide live ticker, sticky nav, footer), all eight public pages restyled, new admin
  fields (`officer`, `featured`, `donatePurposes`, `sectionVisibility.culture`), admin 🎨 ডিজাইন card,
  screenshot matrix script, docs, rules deployed, production live-verified — **Phase 5 is LIVE**.

### ⏳ Owner still to do (Phase 5)

- **Pick a theme**: /admin/ → 🎨 ডিজাইন → প্রিভিউ each of the five → চালু করুন the one you want. Default
  live right now is সিদ্ধি (Siddhi).
- **Mark officers**: 👥 কমিটি → tick "পদাধিকারী (সামনে দেখাও)" for the সভাপতি/সম্পাদক/কোষাধ্যক্ষ so they
  show first on the committee page.
- **Mark featured albums**: 🖼️ গ্যালারি → tick "সেরা মুহূর্ত strip-এ দেখাও" on a few good albums so the
  home page's best-moments strip isn't empty.
- **Fill দানের খাত**: ⚙️ সেটিংস → "দানের খাত" textarea (one purpose per line, `bn | en | amounts`) so
  donate.html shows real purpose cards instead of none.
- **Upload real photos + logo**: replace placeholder committee/album images with real uploads, and set
  a real logo via `settings.logoUrl` (currently the ॐ mark shows when it's empty).
- A fixed bottom-sheet Donate button (thumb-reachable on every page, not just the hero CTA/nav link)
  was **not built this phase** — YAGNI until the owner asks for it (see the Task 13 brief's self-review).

### Deferred minors from Phase 5 reviews

- dhokra theme: `.pulse`, `.tabs button.active`, `.chips i.on`, `.days button[aria-pressed="true"]` still hardcode `#fff6e8` on `--sindoor` (3.2:1 after the final-review token change); switch them to `var(--ticker-ink)` and add the pair to `tests/unit/contrast.test.js` (found by the final-review re-review, 2026-09-11).

## Phase 6 — "Nothing static": every visible thing is admin-editable

Plan: `docs/superpowers/plans/2026-09-11-phase-6-template-complete.md`. Spec: `docs/superpowers/specs/2026-09-11-phase-6-template-complete.md`.

- [x] Task 1 i18n overrides + keyed UI literals (2026-09-11)
- [x] Task 2 rules, content reads, seed (2026-09-11)
- [x] Task 3 overrides rendered on the public site (2026-09-11)
- [x] Task 4 admin ✏️ লেখা (2026-09-11)
- [x] Task 5 admin UI images + culture (2026-09-11)
- [x] Task 6 admin design + settings extensions (2026-09-11)
- [x] Task 7 production seed, docs, rules deploy, live verification (2026-09-12) — **Phase 6 is LIVE**

### ⏳ Owner still to do (Phase 6)

- **Edit your own strings**: /admin/ → ✏️ লেখা → search or browse by group, change any bn/en pair, সেভ করুন. Leave both sides empty to fall back to the default text.
- **Upload real UI images**: /admin/ → 🖼️ UI ছবি → hero (idol/banner) photo is the one visitors notice first; the rest (brand mark, favicon, page headers) are optional — drawn art stays until you upload something. The **OG (share) image slot is reserved** — no page reads it yet (nothing on the public site shows it), keep that in mind if you upload one expecting it to appear when the site is shared on WhatsApp/Facebook.
- **Edit the three সংস্কৃতি cards**: /admin/ → 🏺 সংস্কৃতি → the seeded মুখা/ঢোকরা/আত্রেয়ী cards are the same copy that was static before; add photos, edit text, or add a fourth.
- **Pick colours/fonts if you want a different look than the theme**: /admin/ → 🎨 ডিজাইন → রং/ফন্ট rows below the five theme tiles — leave a row empty to keep the theme's own colour.
- **Fill social links, established year, meta description**: /admin/ → ⚙️ সেটিংস → নিচের দিকে সোশ্যাল লিঙ্ক / প্রতিষ্ঠার বছর / meta description — all optional, blank means "don't show".

### Deferred minors from Phase 6 reviews

- Task 3: no automated assertion on `document.title` override; admin `route()` is non-reentrant (pre-existing); other admin-written image URLs (`photoUrl`/`coverUrl`/`upiQrUrl`) are not `httpsUrl()`-guarded (Storage-derived) — final review to triage
- Task 4: row values not trimmed on load (only the writer trims anyway); duplicate `.str-row .bi` rule
- Task 6: an invalid hex row is silently dropped on save (no toast); `updateDoc`'s doc-must-exist precondition is undocumented; the hex input's `pattern` attribute is inert outside a `<form>`
