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
