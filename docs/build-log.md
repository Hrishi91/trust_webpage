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
