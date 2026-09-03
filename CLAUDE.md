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
