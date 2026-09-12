// Item 33 (site-basics-audit-2026-09-12.md §2 #33): the backup export must cover every collection
// firestore.rules actually protects, not a stale hand-maintained list — this test parses the rules
// file itself so a future phase that adds a collection there and forgets export.js fails here
// instead of shipping a silently-incomplete backup.
//
// COLLS/DOCS are imported from admin/js/sections/export-colls.js, not export.js itself:
// export.js imports registerSection from ../admin.js, which pulls in the whole Firebase module
// graph (gstatic https: specifiers plain `node --test` can't resolve) — export-colls.js has zero
// imports so it loads under node exactly like js/i18n.js or js/ui.js (see CLAUDE.md's "pure-logic
// modules" convention). export.js re-exports the same two constants for any other importer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { COLLS, DOCS } from '../../admin/js/sections/export-colls.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesText = readFileSync(path.join(here, '../../firestore.rules'), 'utf8');

// Top-level `match /<name>/{...}` blocks are indented exactly 4 spaces in firestore.rules (checked
// against the file directly — `databases` sits at 2 spaces, the nested `match /photos/{photoId}`
// inside the albums block sits at 6). Anchoring on that exact indent is what keeps this a
// "first-level match" parse rather than picking up photos along with everything else.
function topLevelMatches(text) {
  return [...text.matchAll(/^ {4}match \/(\w+)\/\{/gm)].map(m => m[1]);
}

test('parses the expected shape out of firestore.rules (sanity check on the parser itself)', () => {
  const names = topLevelMatches(rulesText);
  assert.ok(names.includes('content'), 'content/{doc} should be a top-level match');
  assert.ok(names.includes('admins'), 'admins/{uid} should be a top-level match');
  assert.ok(!names.includes('photos'), 'photos is nested inside albums — must NOT be a top-level match');
  assert.ok(!names.includes('settings'), 'settings/site is a literal doc path, not a /{param} match');
  assert.equal(new Set(names).size, names.length, 'no top-level collection name repeats in the rules file');
});

test('export-colls.COLLS equals every rules collection minus admins/content, plus the photos subcollection', () => {
  const expected = new Set(topLevelMatches(rulesText));
  expected.delete('admins'); // console-only — never admin-panel-editable, never exported
  expected.delete('content'); // fixed 2-doc registry — its two docs are DOCS, not an open collection
  expected.add('photos'); // albums/{id}/photos — the one subcollection this backup covers

  assert.deepEqual(new Set(COLLS), expected);
  assert.equal(COLLS.length, new Set(COLLS).size, 'COLLS must not contain duplicates');
});

test('export-colls.DOCS is exactly the single-doc paths handled outside COLLS', () => {
  assert.deepEqual(DOCS, ['settings/site', 'content/strings', 'content/media']);
});
