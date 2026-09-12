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

- [x] dhokra theme: `.pulse`, `.tabs button.active`, `.chips i.on`, `.days button[aria-pressed="true"]` hardcoded `#fff6e8` on `--sindoor` (3.2:1 after the final-review token change) — switched to `var(--ticker-ink)` (the `.days button[aria-pressed]` selector itself was retired along with it — events.js's day tabs now use real `role="tab"`/`.active`, not `aria-pressed`); the ticker-ink/sindoor pair was already gated in `tests/unit/contrast.test.js` (found by the final-review re-review, 2026-09-11; fixed Phase 7 Task 3, 2026-09-12).

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

- `admin/js/sections/albums.js` photo-list thumbnail renders `p.url` as `<img src>` without `httpsUrl()` (admin-only, Storage-derived URLs; every public `src`/`href` is gated) — wrap it for consistency (final re-review, 2026-09-12).
Fixed by the 2026-09-12 final-review fix wave and removed from this list: no automated assertion
on `document.title` override (M12); other admin-written image URLs `photoUrl`/`coverUrl`/`upiQrUrl`
not `httpsUrl()`-guarded (I3/M6); duplicate `.str-row .bi` rule (M13); an invalid hex row silently
dropped on save with no toast (M7).

- Task 3: admin `route()` is non-reentrant (pre-existing) — still open.
- Task 4: row values not trimmed on load (only the writer trims anyway) — still open.
- Task 6: `updateDoc`'s doc-must-exist precondition is now documented with an inline comment at the
  call site (`admin/js/sections/design.js`) rather than fixed in code — `settings/site` is seeded on
  production and by `tests/seed/seed.js` before any admin ever reaches the card, so the precondition
  always holds in practice. The hex input's `pattern` attribute is still inert outside a `<form>` —
  still open (harmless: `admin/js/sections/design.js`'s own save handler now validates the same hex
  shape in JS before writing).
- M9 — `firestore.rules`' `content/{doc}` rule (`allow create, update: if isAdmin() && doc in
  ['strings', 'media']`) gates which *document* an admin may write but never validates the *shape*
  of its values — a buggy admin write could put a non-`{bn,en}` value into `content/strings` or a
  non-string/non-https value into `content/media`; client code tolerates this (`setOverrides()`
  drops malformed entries, `httpsUrl()` blanks bad media URLs) but the rule itself doesn't enforce
  it server-side the way `validOverrideValues()`/`validSocial()` do for `settings/site`.
- M10 — a `content/strings` override written under a STRINGS key that a later change renames or
  removes has no cleanup path: `STRING_GROUPS` (and so the ✏️ লেখা editor) is derived from the
  *current* `STRINGS` table, so the orphaned override row becomes invisible in the admin UI while
  still sitting in Firestore — a legacy-key lockout with no admin-visible way to find or delete it.
- M11 — a media slot or settings URL field saved before `httpsUrl()` gating existed (or a
  non-`https://` value from some other path, e.g. a pasted `http://` link) is silently blanked at
  render time by every `httpsUrl()` call site added in this wave, but the stale non-https value
  itself is never surfaced to the admin or cleaned from Firestore — invisible litter, not a bug.
- M14 — page headers with a `header.*` media slot photo (`js/shell.js`'s `pageHeader({image})`,
  `.ph.photo .ph-img{opacity:.55}` in `css/site.css`) only dim the photo by a fixed opacity over
  `--bg`; unlike the 🎨 ডিজাইন colour rows, there is no live contrast check against `--hero-ink` for
  the crumb/title/lead text, so a bright admin-uploaded header photo could leave that text hard to
  read.

## Phase 7 — Site basics: everything a complete site needs

Audit: `docs/site-basics-audit-2026-09-12.md` (118 items). Spec: `docs/superpowers/specs/2026-09-12-phase-7-site-basics.md`. 8 tasks close every ❌/⚠️ the audit marked *Build*.

- [x] Task 1 pages & legal (404, privacy/terms+refund, trust, contact, downloads, news, faq) + admin 📄 পাতা (2026-09-12)
- [x] Task 2 SEO & share (titles/canonical/OG/JSON-LD, favicon/manifest, robots/sitemap, share row, .ics, print stylesheet) (2026-09-12)
- [x] Task 3 accessibility (skip link, 16px inputs, accessible lightbox, tab ARIA, aria-live, contrast fixes, alt text, form labels, banner role) (2026-09-12)
- [x] Task 4 performance (items 28, 30–32: static above-the-fold app-shell, `width`/`height`/`aspect-ratio` on images, firebase-auth split, font preload, deferred DOMPurify) (2026-09-12) — the PWA service worker (item 29) is its own follow-up (sdd task-5-brief.md), not built here despite this line's original wording
- [x] item 29 PWA service worker follow-up (sdd `task-5-brief.md`/`task-5-report.md`): versioned app-shell `sw.js`, `js/sw-register.js`, `scripts/bump-sw.mjs` hash+version discipline (2026-09-12)
- [x] Task 5 admin usability (export coverage, 📜 লগ audit viewer, restore toggle, forgot-password, help links, ?preview=1 everywhere, masked re-auth, list search) (2026-09-12) — build-log's own heading calls this "Task 6" (sdd task-6-brief.md numbering); see that entry for the discovered latent about.js preview-race bug (not fixed, out of scope) and Task 8's follow-up (admin-guide.md headings matching the "?" help anchors)
- [x] Task 6 ops (CI, client error reporting, scheduled backup workflow, "শেষ আপডেট" stamps) (2026-09-12) — build-log's own heading calls this "Task 7" (sdd `task-7-brief.md` numbering); see that entry for the full breakdown
- [ ] Task 7 docs + rules deploy + production seed
- [ ] Task 8 Lighthouse pass + live verification (includes the live GitHub Pages 404 check for item 1)

### Owner-only (Phase 7, recorded per the audit's §3)

- App Check key, real photos/logo, trust deed + audit PDFs, registration number/80G status, custom domain, Google Search Console verification, phone-OTP test on a real number, uptime-monitor account, MFA on the admin account, budget for any paid service, security headers via a CDN in front of GitHub Pages.
- **`FIREBASE_SA` repo secret** (Task 6/item 43 built the backup workflow itself; the storage decision — a GitHub Actions artifact, 90-day retention — is made) — once a real Firebase project exists, create a Cloud Datastore Viewer (read-only) service account and add its JSON key as the `FIREBASE_SA` GitHub secret (`docs/user-guide/deploy.md` Step 6) so the weekly cron actually exports something instead of skipping.

### Not needed (Phase 7, recorded per the audit's §4)

- hreflang (single URL per page, language is a client-side toggle — no per-language URLs to declare), RTL support, a cookie/consent banner (no tracking cookies are set), a Google Maps iframe embed (a plain link avoids ~200 KB + a third-party cookie; the link opens the visitor's own maps app), a payment gateway (UPI deep link + WhatsApp confirmation is the trust's chosen flow), and a minify/bundle build step (the project is deliberately no-build, per `CLAUDE.md`).

### Task 1 notes

`pages/{id}` (fixed ids: privacy, refund, trust, contact, faq, news, downloads, notfound) follows the same code-default pattern as `js/culture.js` — `js/page-defaults.js` supplies bilingual rich-HTML defaults so every page shows real copy before the admin ever edits it. `settings.trustees` (named trustees for trust.html) is wired end-to-end (default, rules validation, trust.html read) but has no admin editor yet — until the owner or a later task adds one, trust.html shows the committee's `officer:true` rows instead, which is the documented fallback, not a gap.

### Task 4 notes

The static app-shell's nav/footer show every `js/nav-config.js` `NAV`/`FOOTER_PAGES` entry unconditionally (ignoring `DEFAULT_SETTINGS.sectionVisibility`, which hides donate/transparency/members by default) — hydration (`js/shell.js`'s `renderNav`/`renderFooter`) trims to the real visibility the moment settings arrive. Showing everything by default was the simpler, more honest choice for a JS-off visitor (a full site map beats a guess at which three links to hide) and is what makes the JS-disabled e2e assertion ("≥ 8 nav links") unconditionally true. `js/nav-config.js` and `js/default-settings.js` are new pure (no DOM/Firebase) modules — `NAV`/`FOOTER_PAGES` and `DEFAULT_SETTINGS` were extracted out of `js/shell.js`/`js/content.js` respectively so `scripts/sync-shell.mjs` can import the exact same data under plain Node (same "shared source of truth" reasoning as `js/page-defaults.js`/`scripts/sync-head.mjs`).

Splitting Auth out of `js/firebase.js` broke three pages' `?preview=1` admin-preview reads (`js/pages/{about,gallery,transparency}.js`) — a page that never imports `js/firebase-auth.js` never calls `initializeAuth()`, so Firestore has no live Auth instance to attach an admin's persisted ID token to, even though the browser still has one in storage from `/admin/`. Fixed with a **dynamic** `import('../firebase-auth.js')` inside each `preview` branch only (not a static top-level import, which would defeat item 31 for exactly the three pages the audit calls out by name) — caught by `tests/e2e/transparency.spec.js`'s pre-existing "admin preview" test going red, not by anything Task 4 added; worth checking for the same shape of bug in any future page that grows a `?preview=1`/admin-elevated-read branch.

Local Lighthouse numbers are noisy and not directly comparable to the live audit's, confirmed by running `scripts/lighthouse.mjs` against `http://127.0.0.1:5500/index.html` before and after (both via `git stash`): CLS is `0` on both (a local emulator round-trip is fast enough that Chrome never registers the shift the live 4G-throttled run does — this does NOT mean the CLS fix is unverified, the static-shell mechanism itself is verified structurally by `tests/e2e/pwa.spec.js`'s JS-disabled test and by reading the generated HTML), and LCP moved from ~7.0s to ~8.2–8.4s locally, traced (via the `lcp-breakdown-insight` audit) to the *same* LCP element (the nav brand text, which grows a second line once the seeded `tagline` hydrates in) with near-identical `elementRenderDelay` in both runs — the difference is Lighthouse's simulated-throttling model reacting to two new tiny same-origin module files (`nav-config.js`, `default-settings.js`) now in the critical import graph, which is a local-simulation artifact GitHub Pages' real HTTP/2 multiplexing shouldn't reproduce, not a structural regression. **Flagged as a real risk, not swept under the rug:** `render-blocking-insight`'s savings estimate stayed around 3.0–3.4s locally both before and after (DOMPurify's own ~900ms did drop out of the blocked-resources list, confirming `defer` worked, but `tokens.css`/`site.css`/`themes.css`/the Google Fonts stylesheet remain render-blocking `<link>` tags by design — font preloading speeds up the font *file* fetch once its CSS is already blocking, it does not stop the CSS itself from blocking) — item 32's "<500ms" acceptance criterion was written against the live site's 1,720ms baseline, not confirmed to be met by this task's prescribed technique (preload + defer only, no CSS delivery-strategy change) on either environment. Task 8's live Lighthouse run is the real gate; if it's still over 500ms, an async-CSS-loading pattern (`media=print` swap or `rel=preload as=style`) for the three same-origin stylesheets is the next lever, deliberately not attempted here since it wasn't part of this task's brief and carries a FOUC/theme-flash risk that needs its own careful pass.

### Item 29 (PWA service worker) notes

Two real bugs turned up while getting the offline e2e test green, both worth remembering for any future service worker: (1) `event.respondWith(promise)` only keeps a fetch event alive until `promise` itself settles — an un-awaited `cache.put()` fired inside that promise chain can be silently dropped once the response is returned and the worker is freed, so `networkFirstNavigate()` must `await cache.put(...)` before returning, not fire-and-forget it. (2) `Cache.match()` matches the full request URL by default, query string included — the very `?sw=1` opt-in flag this worker registers under meant the first successful online navigation cached itself under a different key than the query-less precached `./index.html` entry, so an offline reload fell through to the `404.html` fallback; the navigation fallback match now passes `{ignoreSearch: true}`. Both were caught by `tests/e2e/pwa.spec.js`'s own offline test going red before the fix, not found by manual inspection.

`sw.js` and `js/sw-version.js` are fully generated (not hand-maintained) by `scripts/bump-sw.mjs` from `scripts/lib/shell-assets.mjs`'s `SHELL_ASSETS` allowlist — the same "single source of truth, checked in CI" pattern `scripts/sync-head.mjs` already uses for heads/robots/sitemap/manifest. `SHELL_HTML` is derived from `scripts/sync-head.mjs`'s own `HEAD_META` file list rather than retyped, so the two can never disagree. `npm run sw:check` recomputes a sha256 over every allowlisted file's path+content and fails when it differs from the committed `SW_HASH`, and separately diffs the committed `sw.js` against what the generator would produce right now — catching both "a shell asset changed but nobody bumped the version" and "someone hand-edited sw.js" as the same class of CI failure.

`navigator.serviceWorker.controller === null` on `/admin/` is verified in a **fresh** browser context that never visited a public `?sw=1` page first, not as a guarantee that survives a mixed session: a service worker's scope is directory-hierarchical, `sw.js` sits at the repo root (the same level as the `admin/` folder), and the 15 public pages it must cover also sit at that root — there is no scope string that includes root-level siblings of `admin/` while excluding `admin/` itself. In a session where a public page registered the worker first, a later fresh navigation to `/admin/` would show a non-null `controller` per the Service Worker spec (claiming/scope rules, not a bug in this code) even though `sw.js`'s `fetch` handler still explicitly ignores every `/admin/*` request (no interception, no caching, normal network passthrough) — which is the actual security property spec §4 asks for, and is what `admin/index.html` never loading `js/sw-register.js` guarantees in the first place.

### Task 3 notes

The real cause of Lighthouse's brand `.t` 2.56:1 / `.s` 1.83:1 (audit §4) turned out not to be an opacity issue at all: `.brand` is an `<a>` tag, and the sitewide `a{color:var(--sindoor)}` rule (top of `css/site.css`) targets it directly — an explicit same-specificity declaration on an element always wins over what it would otherwise inherit from `.nav{color:var(--hero-ink)}`, so the brand name/tagline were rendering in sindoor-on-dark-bg (a middling 3.5:1 on its own, worse still against the old translucent nav) the whole time, never in hero-ink. `.brand{color:inherit}` is the actual fix; `.nav`'s background going from a translucent `color-mix()` blend to a flat `var(--bg)` and dropping `.brand .s`'s `opacity:.7` both still stand as real, separate contrast improvements. Two axe-detected issues turned up outside the audit's own list and got fixed alongside it: the transparency donut chart's `role="img"` `<svg>` (`js/ledger-view.js`) had no accessible name (`svg-img-alt`), and `.upi code`/`.donate .eyebrow` used `--pitambar` for text sitting directly on `--bg` (mukha: `--pitambar` equals `--bg`, i.e. invisible text) — both moved to the already-token-tested `--hero-accent`. Alt-text policy applied: a photo the admin actually chose (committee portraits, album covers/photos, header/hero/donate-band/members-teaser slots, culture cards) always gets a real `alt`; the brand-mark logo (redundant with the adjacent trust-name text) and the hero's decorative garland flourish keep `alt=""` on purpose. Album photos gained an optional per-photo `alt` field in admin (🖼️ গ্যালারি → an album's photo list), independent of `caption` — the public gallery falls back `alt || caption || album title` so nothing ships with an empty `alt` even before an admin fills it in.

### Task 6 notes

`errors` joined `admin/js/sections/export-colls.js`'s `COLLS` the moment it joined `firestore.rules` — `tests/unit/export-colls.test.js` parses the rules file itself and fails otherwise, so the manual 📤 ব্যাকআপ export and the new scheduled backup (item 43) both cover client error reports for free, without either being told to separately. The `errors` rule pins `at == request.time` (the server-resolved value of the client's `serverTimestamp()` sentinel) rather than trusting a client-supplied timestamp — confirmed against the emulator with `firebase/compat/app`'s `FieldValue.serverTimestamp()`, since `@firebase/rules-unit-testing`'s test contexts hand back a compat Firestore instance, not the modular SDK the rest of the codebase uses.

`scripts/backup.mjs`'s secret gating (`BACKUP_OPTIONAL=1` → exit 0 "skipped" vs. exit 1 "failed") means the `.github/workflows/backup.yml` cron stays green from day one even before the owner adds the `FIREBASE_SA` secret (docs/user-guide/deploy.md Step 6) — a real backup only starts happening once that one-time owner step is done, which is itself tracked in the Phase 7 owner-only list below (an addition: "add the `FIREBASE_SA` repo secret once a real Firebase project exists").
