# Build log (append-only, newest at bottom)

## 2026-09-03 — v0.0.1 scaffold
Repo created; design spec approved; docs discipline + pre-commit hook; dev-only
package.json (firebase-tools, rules-unit-testing, playwright). No site code yet.
Fix: test scripts use globs (Node 24), rules-unit-testing ^5 (firebase 12 peer). package-lock synced to 5.0.2.

v0.0.2 — firebase.json (emulator ports 8080/9099/9199/4000), .firebaserc, firebase-config.js placeholder (PASTE), deny-all rules stubs, setup-firebase.md guide (Bengali).

v0.1.0 — i18n module (getLang/setLang/pick/t/STRINGS/onLangChange), 11 unit tests.

v0.2.0 — ui helpers (escapeHtml, countdown, bnDigits, fmtDate, el, toast), 9 unit tests.
Fix: Bengali digit codepoints (was Devanagari 1–9), date-only fmtDate parses as local, 9 tests.

v0.3.0 — Firestore rules (default deny; published+deleted gates; admins console-only; audit append-only) + emulator test matrix (9 tests). Mutation checks: dropping the deleted clause fails history/events/albums; dropping audit uid check fails audit.
Fix: settings/site delete denied; committee/photo deleted guards, hasDeletedFlag and legacy-doc reads now under test; mutation 3 (hasDeletedFlag) verified.

v0.4.0 — Storage rules (public/ read-all, admin write via firestore.exists, under 5 MB, image/pdf only) + 4 emulator tests; scripts/deploy-rules.sh (tests gate deploy). Mutations: dropping okType fails .exe test; dropping firestore.exists fails other-user upload.
Fix: update-op, anon-delete, admin-private-read, list, exact-5MB, anchored-type tests; clearStorage in _env; size mutation verified; deploy script pins --project.

v0.5.0 — js/firebase.js single entry (SDK 12.18.0 CDN, persistent local cache, App Check when key set, emulator wiring on localhost); smoke-tested against emulator with Playwright.
Fix: projectId overridden to demo-trust on localhost — singleProjectMode does not merge namespaces; admin gate now sees seeded data.

v0.6.0 — admin shell: email login, admins-doc gate, hash router, dashboard grid, reauth helper, bn/en toggle; verified against emulator with Playwright (wrong pw, admin, non-admin rejected, persistence, logout).
Fix: route() awaits render inside try/catch (sync throws now caught); login/reauth errors localized.
Fix: sections/registerSection moved from admin.js into new admin/js/registry.js. A section file does `import { registerSection } from '../admin.js'` and calls it at its own top level; admin.js statically imports every section file at its bottom — a circular module reference. With the Map declared directly in admin.js, that call ran (per ES module evaluation order) before admin.js's own `const sections = new Map()` line, hitting it in its temporal dead zone and crashing the whole app the moment any section was uncommented (reproduced with a throwaway `admin/js/sections/_boom.js`, matching task-9-brief.md's and task-10-brief.md's literal registration pattern). A dynamic `await import(...)` does not fix this either — it makes admin.js an async module, and a static back-edge into a still-evaluating async module deadlocks instead of erroring (confirmed empirically: the import promise never resolves, no error). registry.js has no imports of its own, so it is always fully evaluated before anything that touches it runs, regardless of which side of the cycle loads first; admin.js now imports sections/registerSection from there and re-exports registerSection so section files are unaffected.

v0.7.0 — admin forms toolkit (biField/textField/boolField/listView/saveDoc/softDelete), audit log helper, Settings section (trust info, contacts, reg/80G/UPI, puja date, theme, section visibility, maintenance); verified against emulator with Playwright (save → reauth → audit row).
Fix: pujaDate round-trips into datetime-local (toLocalInput helper); reorder swap is one writeBatch.

v0.8.0 — admin Export: all collections + album photos as one JSON download (audit row logged); verified with Playwright download against emulator.
Includes settings, history, committee, albums (with nested photos), events, and audit collections. Timestamps serialize as {seconds, nanoseconds}. Object URL revoked after download to prevent memory leak.
Fix: export errors surface as a toast; button disabled while running.

v0.9.0 — Pages placeholder index + .nojekyll; deploy guide. GitHub repo creation ⏳ owner (token lacks repo-create permission); Pages/rules deploy/domain/App Check follow.

v0.10.0 — js/content.js: DEFAULT_SETTINGS, getSettings (memoised, merged defaults), listPublished/listCommittee/listPhotos/getPublished — published-only queries; smoke-tested in browser against emulator.

v0.11.0 — public shell: css/site.css theme, js/shell.js (header/nav/footer from settings, lang toggle, maintenance mode, sectionVisibility nav filter), index.html skeleton + home stub; verified with Playwright (bn/en, maintenance, 375px no overflow).

v0.12.0 — home page: hero (name/tagline/theme), puja countdown (bn digits, 'today' state, 60s tick), next 3 upcoming events, latest album card; sections omitted when empty; verified with Playwright.
Fix: `main.replaceChildren(...)` is the native DOM method, not `el()` — it stringifies non-Node arguments instead of skipping them, so a conditional section written as `cond ? el(...) : null` (or the brief's original `cond && el(...)`) left a literal "null" (or "0") text node in #main when the condition was false. Sections are now built into an array and passed as `main.replaceChildren(...arr.filter(Boolean))`.

v0.13.0 — History admin section (year/title/body/images, draft/publish, preview, soft delete) + About page rendering sanitized rich text (DOMPurify 3.2.4 SRI-pinned); XSS probe (img onerror, script, javascript: href) verified stripped.
Fix: `el()`'s child loop only skips `null`/`undefined` (not `false`), so the brief's `id !== 'new' && el(...)` inside `history.js`'s toolbar would have rendered a literal "false" text node when creating a new entry — used `id !== 'new' ? el(...) : null` instead, consistent with the v0.12.0 `replaceChildren` fix already applied to `about.js`.

v0.14.0 — image upload: resize.js fitDims (5 tests) + upload.js (client-side resize to WebP, resumable upload to public/, imageField/multiImageField widgets with progress); el() now skips false children; verified against Storage emulator with Playwright (admin ok, non-admin denied).
Fix: EXIF orientation honoured (from-image); imageField input reset for retry; capture attr intentionally omitted.

v0.15.0 — Committee: admin section (name/post/photo upload/show-on-website, reorder, soft delete) + public committee page (grid of persons, placeholder avatar, bn/en); verified with Playwright.

v0.16.0 — Gallery: albums admin (title/year/cover, draft/publish/preview, multi-photo upload with progress, captions, photo reorder via batch, soft-delete photo) + public gallery (album grid newest-first, album page, lightbox); verified with Playwright incl. draft isolation.
Fix: cover-photo auto-set from the first uploaded photo was fragile — `f.cover.read()` never reflects that auto-set (only the cover widget's own upload), so every photo (not just the first) overwrote `coverUrl`, and a later Save/Publish click in the same session stomped it back to `''`. A local `coverAutoSet` flag now gates the auto-set to once, and `read()` omits `coverUrl` from the save payload unless the widget was actually used, letting `setDoc({merge:true})` leave the auto-set value alone.
Fix: multi-upload widget persists across photo re-renders (no mid-upload teardown); cover auto-set reflected in form via imageField.set().

v0.16.1 — admin gate: opening a second same-origin tab initialised Auth with the SDK's default indexedDBLocalPersistence while the admin tab used explicit browserLocalPersistence, and the SDK's cross-tab persistence sync then cleared the admin tab's session outright (`onAuthStateChanged(null)`, no error, no `isAdmin()` call, no network request) — `js/firebase.js` now pins every tab to `browserLocalPersistence` unconditionally, removing the mismatch — transient Firestore errors no longer sign the admin out; only permission-denied does; gate not re-run for the same uid.
Fix: Auth persistence fixed at construction via initializeAuth (no post-hoc setPersistence window).

v0.17.0 — Events: admin section (title/start/end/venue/desc, draft/publish, chronological list, soft delete, empty-start guard) + public events page (upcoming/past split, bn/en); verified with Playwright incl. datetime round-trip.

v0.18.0 — emulator seed (firebase-admin, refuses non-emulator hosts) + Playwright e2e (8 specs: public pages, lang persistence, draft isolation, mobile overflow, anon preview error, admin wrong-pw, create+publish event, soft delete with reauth); home/about pages now surface fetch errors.

v0.19.0 — docs: full admin guide, go-live checklist, pending/context/README refreshed to the real state; live steps ⏳ owner.
Fix: soft-delete e2e asserts history/h1 still exists with deleted:true (mutation-checked against a hard delete); seed guard is a strict host match.

v0.20.0 — fix: declare all nine Firestore composite indexes (firestore.indexes.json, wired into firebase.json/deploy-rules.sh); go-live checklist Step 1 rewritten to the real nine-index list plus the deploy command, and gained the missing owner step (custom domain → Auth Authorized domains + GCP API-key HTTP referrers); js/content.js's three bare catches (getSettings, listPhotos, getPublished) now console.warn the swallowed error before falling back.

v0.21.0 — fix: firestore.rules/storage.rules isAdmin() now also requires request.auth.token.email_verified == true, so an admin account whose email was never verified in the console cannot write anywhere. tests/rules/_env.js gained an `unverified` context (same ADMIN_UID, email_verified: false) and firestore.test.js/storage.test.js assert it cannot write settings/site or upload to public/. Mutation-checked: reverting isAdmin() to drop the email_verified clause failed exactly those two tests (13/15 pass, the two new assertions fail) and nothing else; reverted back to 15/15 green. setup-firebase.md now tells the owner to tick Email verified on the admin user in the console.
