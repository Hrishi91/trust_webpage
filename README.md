# Ganesh Puja Trust Website

Static vanilla-JS public website + single-admin Firebase backend for the Ganesh Puja Trust.

**Status: Phase 0+1 code complete, awaiting owner go-live steps** (see `docs/user-guide/go-live-checklist.md`).

## Repo map

```
CLAUDE.md                    # Project instructions and working rules
README.md                    # This file
index.html, about.html, committee.html, gallery.html, events.html   # Public pages
firestore.rules, storage.rules, .firebaserc, firebase.json          # Firebase config + security rules
admin/
  index.html                 # Admin app shell (unlisted route)
  js/
    admin.js                 # Auth gate, hash router, dashboard
    registry.js               # Section registry (breaks admin.js <-> sections circular import)
    forms.js                  # biField/textField/boolField/listView/saveDoc/softDelete
    upload.js                 # resizeImage/uploadPublic/imageField/multiImageField
    resize.js                 # fitDims (client-side resize math)
    audit.js                  # logAudit — append-only audit log writes
    sections/
      settings.js  history.js  committee.js  albums.js  events.js  export.js
js/
  firebase.js                 # Single Firebase SDK entry (pinned CDN version, emulator wiring)
  firebase-config.js           # Project config (PASTE placeholders until owner's real project)
  content.js                   # getSettings/listPublished/listCommittee/listPhotos/getPublished
  i18n.js                       # getLang/setLang/pick/t/STRINGS/onLangChange
  ui.js                         # el/toast/fmtDate/bnDigits/countdown/escapeHtml
  shell.js                      # Public header/nav/footer, maintenance mode
  rich.js                       # DOMPurify-sanitized HTML rendering
  pages/
    home.js  about.js  committee.js  gallery.js  events.js
css/
  site.css  admin.css
docs/
  PROJECT_CONTEXT.md          # Decisions and their causes, current state
  pending.md                  # Roadmap (phases 0–4) + deferred minors
  build-log.md                # Append-only development chronicle
  user-guide/
    admin-guide.md             # Admin panel guide (Bengali)
    go-live-checklist.md       # Owner go-live sequence (Bengali)
    setup-firebase.md          # Firebase project setup guide (Bengali)
    deploy.md                  # Deploy guide
  superpowers/
    specs/                    # Approved design specifications
    plans/                    # Phase plans
scripts/
  pre-commit-docs.sh          # Pre-commit hook (docs discipline)
  deploy-rules.sh              # Rules deploy (gated by tests)
tests/
  unit/                       # Unit tests (25) — i18n, ui, resize
  rules/                      # Firestore/Storage rules tests (15, with mutation checks)
  seed/                       # Emulator seed data
  e2e/                        # Playwright end-to-end specs (8)
package.json                  # Dev dependencies and npm scripts
```

## npm scripts

- `npm run test:unit` — Run unit tests (pure logic: i18n, ui, resize)
- `npm run test:rules` — Run Firestore/Storage rules tests against the emulator
- `npm test` — Full test suite (unit + rules)
- `npm run emu` — Start Firebase emulator (firestore, storage, auth)
- `npm run seed` — Seed emulator with test data
- `npm run serve` — Serve site locally at http://127.0.0.1:5500
- `npm run e2e` — Run Playwright end-to-end tests

## Design and plan

- [Design spec](docs/superpowers/specs/2026-09-03-trust-website-design.md)
- [Phase 0/1 plan](docs/superpowers/plans/2026-09-03-phase-0-1-foundation-showcase.md)
