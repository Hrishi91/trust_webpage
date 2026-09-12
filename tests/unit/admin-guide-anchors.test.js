// tests/unit/admin-guide-anchors.test.js — final-review fix wave M5. admin/js/admin.js's shared
// #adm-help link (item 37) points at `${GUIDE}#${key || 'dashboard'}`, where `key` is the current
// route's section key — the exact string each admin/js/sections/*.js file registers with
// registerSection(). If a future section is added (or renamed) with no matching
// `<a id="<key>">` in docs/user-guide/admin-guide.md, the help link 404s (a GitHub anchor that
// doesn't exist just scrolls to the top of the file, silently) with nothing catching it — this
// test parses both sides from their own source files (not a hand-maintained list either side
// could drift from) so that stays a loud test failure instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '../..');
const sectionsDir = path.join(ROOT, 'admin/js/sections');

// Each admin/js/sections/*.js file registers exactly one section key, either as a literal string
// (`registerSection('log', {...})`) or via a local `const COLL = 'xxx';` passed by reference
// (`registerSection(COLL, {...})`, the more common shape — see e.g. committee.js/albums.js). Both
// shapes are resolved here rather than only the literal one, since most section files use COLL.
function sectionKeyOf(text) {
  const literal = /registerSection\(\s*'([a-z]+)'/.exec(text);
  if (literal) return literal[1];
  const callsCollVar = /registerSection\(\s*COLL\s*,/.test(text);
  if (callsCollVar) {
    const collDecl = /const COLL\s*=\s*'([a-z]+)'/.exec(text);
    if (collDecl) return collDecl[1];
  }
  return null;
}

function registeredSectionKeys() {
  // admin/js/sections/export-colls.js is a zero-import pure data module (COLLS/DOCS, reused by
  // scripts/backup.mjs) — it registers no section itself; export.js imports it and is the one
  // that actually calls registerSection('export', ...).
  const files = readdirSync(sectionsDir).filter(f => f.endsWith('.js') && f !== 'export-colls.js');
  const keys = [];
  for (const file of files) {
    const text = readFileSync(path.join(sectionsDir, file), 'utf8');
    const key = sectionKeyOf(text);
    assert.ok(key, `admin/js/sections/${file}: could not resolve its registerSection() key — sectionKeyOf() needs a new case`);
    keys.push(key);
  }
  return keys;
}

const guideText = readFileSync(path.join(ROOT, 'docs/user-guide/admin-guide.md'), 'utf8');
function guideAnchors() {
  return new Set([...guideText.matchAll(/<a id="([a-z]+)">/g)].map(m => m[1]));
}

test('sanity check on the parser: 18 section files, each resolves to a non-empty, unique key', () => {
  const keys = registeredSectionKeys();
  assert.equal(keys.length, 18, 'admin/js/admin.js\'s dashboard grew to 18 tiles in Phase 7 — update this count (and the guide\'s own tile table) if that changes');
  assert.equal(new Set(keys).size, keys.length, 'no two section files register the same key');
});

test('admin/js/admin.js\'s #adm-help anchor scheme: every registered section key has a matching guide anchor', () => {
  const anchors = guideAnchors();
  for (const key of registeredSectionKeys()) {
    assert.ok(anchors.has(key), `docs/user-guide/admin-guide.md is missing <a id="${key}"> for the "${key}" admin section`);
  }
});

test('the dashboard-fallback anchor exists too (#adm-help falls back to "dashboard" with no hash)', () => {
  assert.ok(guideAnchors().has('dashboard'), 'docs/user-guide/admin-guide.md is missing <a id="dashboard">');
});
