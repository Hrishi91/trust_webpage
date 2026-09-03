# Ganesh Puja Trust Website

Static vanilla-JS public website + single-admin Firebase backend for the Ganesh Puja Trust.

## Repo map

```
CLAUDE.md                    # Project instructions and working rules
README.md                    # This file
docs/
  PROJECT_CONTEXT.md         # Decisions and their causes
  pending.md                 # Roadmap (phases 0–4)
  build-log.md               # Append-only development chronicle
  user-guide/
    admin-guide.md           # Admin panel guide (Bengali)
  superpowers/
    specs/                   # Approved design specifications
    plans/                   # Phase plans
scripts/
  pre-commit-docs.sh         # Pre-commit hook (docs discipline)
tests/
  unit/                      # Unit tests (run with `npm run test:unit`)
  rules/                     # Firestore/Storage rules tests (planned)
  seed/                      # Seed data for emulator (planned)
  e2e/                       # End-to-end tests (planned)
package.json                 # Dev dependencies and npm scripts

Planned top-level files:
  index.html, about.html, committee.html, gallery.html, events.html
  firestore.rules, storage.rules, .firebaserc

Planned directories:
  admin/                     # Admin panel (single-admin content panel)
  js/                        # Shared modules (i18n, ui, firebase, content)
  css/                       # Stylesheets
```

## npm scripts

- `npm run test:unit` — Run unit tests (pure logic: i18n, ui, etc.)
- `npm run test:rules` — Run Firestore/Storage rules tests against emulator
- `npm test` — Full test suite (unit + rules)
- `npm run emu` — Start Firebase emulator (firestore, storage, auth)
- `npm run seed` — Seed emulator with test data
- `npm run serve` — Serve site locally at http://127.0.0.1:5500
- `npm run e2e` — Run Playwright end-to-end tests

## Design and plan

- [Design spec](docs/superpowers/specs/2026-09-03-trust-website-design.md)
- [Phase 0/1 plan](docs/superpowers/plans/2026-09-03-phase-0-1-foundation-showcase.md)
