*Last updated: 2026-09-03 (Task 21 — docs refresh; Phase 0+1 code complete)*

## 1. What this is

A public website for the Ganesh Puja committee (a charitable Trust, registration
in progress) with a single-admin content panel, so the admin can change every
dynamic part of the site from a phone without touching code.

**Totally separate from the Chanda Collection PWA.** No shared data, backend,
users or code. Hrishi's decision: "no chanda app, totally different."

## 2. Scope — all five, in this priority

| # | Feature | Summary |
|---|---|---|
| A | Public showcase | Trust identity, history, committee, gallery, events, location |
| B | Donation | UPI/QR donation page, manual donation records, donor wall |
| C | Transparency | Year-wise income/expense summary, uploaded documents (deed, audit, certificates) |
| D | Live event hub | Realtime announcements, live banner, today's schedule during puja days |
| E | Member portal | Committee members log in (phone OTP), see own pledge/balance, internal notices, duty roster |

Built phase-wise (§8). Each phase gets its own spec → plan → build → live cycle.

## 3. Decisions and their causes

| Decision | Cause |
|---|---|
| Firebase (Firestore + Auth + Storage) backend, vanilla HTML/CSS/JS frontend, no build step | Three of five features (gallery upload, live updates, member login) need file upload + auth + realtime; Google Sheet is weak at all three, Firebase native at all three. No-build keeps it one-developer maintainable (Chanda lesson). |
| GitHub Pages hosting + custom domain (to be purchased) | Free HTTPS, known pattern; custom domain for credibility as a Trust |
| Single admin | Hrishi's requirement. Admin identity = `admins/{uid}` doc, not custom claims (no Admin SDK needed) |
| Registration no., 80G status, UPI ID, section visibility are all admin-editable settings | Trust registration is in progress; these arrive later and must not need a code change |
| Members = committee members only, phone OTP, admin pre-registered phone list, no approval queue | Small known group; only numbers the admin adds can log in — no spam registration surface |
| Member doc id = E.164 phone number | Rule becomes one line (`request.auth.token.phone_number == docId`); no uid↔phone mapping table to get wrong |
| Donor phone numbers are never stored in the website DB | Public collection + PII = one wrong rule away from a leak. Name/amount/receipt only; phone stays with admin offline |
| Bilingual bn/en, every text field `{bn, en}`, default bn, fallback to whichever exists | Same audience as Chanda app |
| Admin panel online-only (no offline queue) | One admin, edits when network exists; Chanda's offline queue complexity not justified |
| Soft delete + append-only audit log | Chanda lesson: "who did what, when" for a money-adjacent app; admin cannot erase history |
| Security is a first-class requirement | Hrishi: "remember the security" |
| Blaze plan from day 1 | Storage needs Blaze since 2026-02-03 and phone OTP needs Blaze; free quotas unchanged; ₹100 budget alert set |

## 4. State as of 2026-09-03

### What is built

Phase 0 (Foundation) and Phase 1 (Showcase) are code-complete on `main` (Tasks 1–20, all reviewed):

- Public pages: `index.html` (hero, countdown, upcoming events, latest album), `about.html` (history, sanitized rich text), `committee.html`, `gallery.html` (albums + lightbox), `events.html` (upcoming/past)
- `/admin/` single-page app (unlisted route) with 6 sections: settings (trust info, contacts, reg/80G, UPI, puja date, theme, section visibility, maintenance mode), history, committee, albums (with nested photos), events, export (JSON backup)
- Firestore + Storage security rules — default-deny, admin-only writes, append-only audit log, public read of published-only content, 5 MB/image-or-pdf Storage limit
- Shared modules: `js/i18n.js`, `js/ui.js`, `js/firebase.js` (SDK 12.18.0, pinned, offline persistence), `js/content.js` (published-only queries), `js/shell.js` (header/nav/footer/maintenance), `js/rich.js` (DOMPurify-sanitized HTML), `admin/js/forms.js` + `upload.js` + `resize.js` + `registry.js` + `audit.js`

### What is verified

- 25 unit tests (`npm run test:unit`) — i18n, ui helpers, resize math
- 15 Firestore/Storage rules tests with mutation checks (`npm run test:rules`) — each guard clause confirmed to actually gate access by removing it and watching the matching test fail
- 8 Playwright e2e specs (`npm run e2e`) — public pages, lang persistence, draft isolation, mobile overflow, anon preview error, admin wrong-password, create+publish event, soft delete with reauth
- Every task additionally hand-verified against the Firebase emulator with Playwright at implementation time (see `docs/build-log.md` per-version entries)

### What is NOT live yet, and why

The site is not deployed. This is deliberately deferred to the owner (Hrishi) because it needs things this session cannot obtain:

- **GitHub repo + Pages**: the available GitHub PAT lacks Administration permission, so a new repo cannot be created and Pages cannot be enabled from here
- **Real Firebase project**: `js/firebase-config.js` still holds `PASTE` placeholders; no live Firestore/Auth/Storage backend exists yet, and Storage + phone OTP require the Blaze plan
- **Custom domain**: not yet purchased/pointed
- **Composite Firestore indexes, rules deploy, App Check enforcement**: all require the real project to exist first

See `docs/user-guide/go-live-checklist.md` for the full owner-driven go-live sequence (indexes → live verification → App Check enforcement last).

### Decisions made during implementation (design-changing, from `docs/build-log.md`)

| Decision | Cause |
|---|---|
| Emulator `projectId` overridden to `demo-trust` on localhost | Firebase's emulator `singleProjectMode` does not merge namespaces across differing project IDs; without the override the admin gate could not see seeded data |
| `admins/{uid}` gate only signs the admin out on an actual `permission-denied`, with one retry for other errors | A transient Firestore error (e.g. during multi-tab primary-lease handoff) is "can't tell right now," not "not admin" — treating it as the latter would spuriously log the admin out |
| Auth persistence fixed at construction via `initializeAuth` (not `setPersistence` after the fact) | Opening a second same-origin tab initialized Auth with the SDK's default `indexedDBLocalPersistence` while the admin tab used explicit `browserLocalPersistence`; the SDK's cross-tab persistence sync then silently cleared the admin tab's session. Pinning every tab to `browserLocalPersistence` at construction removes the mismatch |
| `settings/site` is never hard-deletable | It's a singleton the whole public site depends on; rules explicitly deny delete on it |
| `el()` skips `false` children (not just `null`/`undefined`) | `cond && el(...)` patterns used in section toolbars would otherwise render a literal "false" text node when the condition was falsy |
| Reorder swap uses one `writeBatch` | Two independent `updateDoc` calls could partially fail and leave two items with the same `order` |
| `toLocalInput` helper for `<input type="datetime-local">` round-trip | Firestore stores ISO strings; the input needs local-time `yyyy-MM-ddThh:mm` without a timezone suffix |
| `admin/js/registry.js` created to hold `sections`/`registerSection` | Section files import `registerSection` from `admin.js` and call it at their own top level, while `admin.js` statically imports every section file — a circular reference. Keeping the `Map` directly in `admin.js` hit it in the temporal dead zone at load (module evaluation order runs all static imports first); a dynamic `import()` deadlocks instead of erroring. `registry.js` has no imports of its own, so it fully evaluates before either side of the cycle runs |
| Rules tests run with `--test-concurrency=1` | Concurrent rules tests raced against the same emulator project state and produced flaky failures |
| DOMPurify loaded via SRI-pinned `<script>` tag, checked at call time | `renderRich()` refuses to fall back to raw HTML if `window.DOMPurify` is missing — a degraded XSS-safe feature is acceptable, unsanitised admin HTML reaching a visitor is not |
| `getSettings()` failure ⇒ maintenance page, not memoised | A failed `settings/site` read now returns `{ ...DEFAULT_SETTINGS, maintenance: true }` (fail CLOSED — the maintenance notice, not a silently-broken "open" site with placeholder content) and resets the module-level `settingsPromise` in the `.catch` so the next call retries the network instead of being stuck on the cached failure for the rest of the page's life |

## 5. State as of 2026-09-04

**Live: phases 2–4 on 2026-09-04** — `ganesh-puja-trust`'s rules/25 indexes are deployed, phone-auth
config is live, demo data is seeded, and every page below has been verified against production
(`https://hrishi91.github.io/trust_webpage/`). Tagged `v2.0.0`. Full rollout write-up: build-log
"v2.0.0 phases 2–4 LIVE".

### What Phase 2–4 add

Plan: `docs/superpowers/plans/2026-09-04-phase-2-4-donation-transparency-live-members.md`. Tasks 1–14 are all done — Task 14 (production rollout) shipped the same day, closing out the phase.

- **Donate** (`donate.html`): UPI pay link + QR, a WhatsApp-confirmation form (name/amount/UPI ref → pre-filled `wa.me` message, no online payment gateway), and a public donor wall (`donations` where `showOnWall==true`). Admin section `💰 দান`.
- **Transparency** (`transparency.html`): year-wise income/expense ledgers with computed totals/balance and PDF documents (`transparency` where `published==true`; `?year=&preview=1` lets a logged-in admin see a draft year). Admin section `📊 হিসাব`.
- **Live hub**: `announcements` collection, realtime (`onSnapshot`) on the home page's "live strip" — pinned-first, non-expired, 🔴 badge when any visible one has `isLive:true`. Admin section `📢 ঘোষণা` (quick-post, publishes immediately).
- **Members portal** (`members.html`): phone-OTP sign-in (Firebase Auth phone provider, `RecaptchaVerifier` size `invisible`) → own pledge/paid/due card, notices, and duty-roster rows. Admin sections `🧾 সদস্য` (+ payments), `📋 নোটিশ`, `🗓️ দায়িত্ব তালিকা`.

### Decisions and their causes (Phase 2–4)

| Decision | Cause |
|---|---|
| Member doc id = E.164 phone number (unchanged from the Phase 0 design, now actually exercised) | `request.auth.token.phone_number == docId` is a one-line rule; the phone IS the identity, no uid↔phone table to get out of sync |
| Production Identity Toolkit `testPhoneNumbers`: `+919999999999` → `123456` (Task 14); the Auth emulator has its own `GET /emulator/v1/projects/demo-trust/verificationCodes` for local/e2e | Demo/e2e sign-in must never send a real SMS, on production OR on the emulator |
| Announcements are realtime (`onSnapshot`), not a periodic poll or a page-load-only fetch | The whole point of a "live strip" is that it updates while someone is already looking at the home page, e.g. during the event itself |
| No online payment gateway | 80G registration is still in progress (`docs/pending.md` "Later phases"); accepting money online before the trust can issue a proper tax receipt was ruled out. Today's flow is UPI-app-of-choice + a WhatsApp message as an honour-system confirmation, not a processed transaction |
| `donations` docs never carry a phone field; Firestore rules reject the field outright on write | Same "public collection + PII = one wrong rule away from a leak" reasoning as the original Phase 0 members design — donor phone numbers stay with the admin offline, never in the site DB |
| Removed/deactivated members lose `notices`/`roster` access immediately, not just dashboard visibility | `notices`/`roster` rules gate on `activeMember()` (a live `get()` on the caller's own `members/{phone}` doc, `active==true`), not on a cached claim — flipping "সক্রিয়" off in the admin panel takes effect on the member's very next query, no token refresh or re-login needed |
| `getMyMember(phone)` succeeds for an inactive member even though `listNotices()`/`listMyRoster()` don't | Different rule, different collection: reading your OWN `members/{phone}` doc is allowed regardless of `active` (so an inactive member still sees their own pledge/balance and knows why they're inactive); only the notices/roster rules add the `activeMember()` gate |
| Phone normalisation (`normalizePhone`, duplicated in `js/pages/members.js` and `admin/js/sections/members.js`) accepts a bare 10-digit number (assumed `+91`) or an already-`+`-prefixed 11–14 digit number | Matches how an Indian admin will actually type a number; anything shorter/longer is rejected rather than silently mis-normalised |

### Task 12/13 investigation: the "session torn down ~1s after sign-in" concern

Task 12's report flagged an undemonstrated concern: phone sign-in against the Auth emulator appeared to fire `onAuthStateChanged` with the signed-in user, then flip to `null` roughly a second later, with no error — blamed (in isolated throwaway pages, not the committed `members.js`) on any page merely instantiating a Firestore client.

Task 13 re-investigated with a throwaway Playwright script driving the actual committed `members.html`/`js/pages/members.js` (never the isolated scratch pages) against a freshly seeded emulator: sign in as `+919999999999` via the code read from the Auth emulator's `verificationCodes` endpoint, watch `onAuthStateChanged` + all network traffic to `127.0.0.1:9099` for 5 s, then reload.

**Result: not reproducible.** Across 3 repeated end-to-end trials (plus a variant with the `RecaptchaVerifier` deliberately left uncleared, and a variant with no Firestore client instantiated at all), the session stayed signed in for the full 5 s window and survived a page reload every time, with the member card, notices, and duty roster all rendering correctly throughout. The most likely explanation: the two fixes Task 12's own implementer made to `members.js` during that same task (clearing the invisible `RecaptchaVerifier` in a `finally` block after `signInWithPhoneNumber`, and the `authSeq` guard against a stale `onAuthStateChanged` invocation overwriting a newer render) already resolve the exact symptom described — but Task 12's "Concerns" section was written against isolated scratch pages that predated or excluded those fixes, and was never re-verified against the fixed `members.js` end-to-end before being reported as still-open.

Practical effect: `tests/e2e/members.spec.js` includes the real "sign in → reload → still logged in" assertion, unskipped — it passed in both required `npm run e2e` runs for this task. If it ever proves flaky in CI (a genuinely different environment/firebase-tools version than this one), the fallback is `test.skip` with a comment pointing back to this section, not silently deleting the assertion.

### e2e coverage added

`tests/e2e/{donate,transparency,live,members}.spec.js`, 11 new specs (2+3+2+4) on top of the existing 8, for 19 total. `playwright.config.js` projects now run `public` (public/donate/transparency/live specs) → `members` → `admin`, since `admin.spec.js`'s soft-delete test still mutates seed data and must run last. Both `npm run seed && npm run e2e` runs required by this task were green (19/19), and `npm test` (39 unit + 20 rules) is unchanged and green — no rules/index changes this task.
