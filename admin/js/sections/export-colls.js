// Pure (no Firebase, no DOM) so it can be node --test'ed directly — see the project convention in
// CLAUDE.md ("Pure-logic modules... have no Firebase imports"). admin/js/sections/export.js
// imports registerSection from ../admin.js, which pulls in the whole Firebase module graph
// (gstatic https: specifiers Node's test runner can't resolve), so these two constants live here
// instead and export.js just re-exports them — tests/unit/export-colls.test.js imports this file
// directly, never export.js.
//
// Item 33: every collection in firestore.rules — see tests/unit/export-colls.test.js, which parses
// firestore.rules itself and fails if this list and the rules ever drift apart. Excluded: `admins`
// (console-only, never admin-panel-editable) and `content` (a fixed 2-doc registry — settings/site
// and content/strings and content/media are covered by DOCS below, not an open collection).
// `photos` is albums/{id}/photos, a subcollection with no root-level `collection(db, 'photos')` of
// its own — export.js fetches it per-album, not via the main per-collection loop.
export const COLLS = [
  'history', 'pages', 'events', 'committee', 'culture', 'albums', 'photos',
  'audit', 'donations', 'transparency', 'announcements', 'members', 'notices', 'roster',
];
// Single-doc paths that live outside any collection this admin account can getDocs() a whole
// collection from — settings/site and the two fixed content/* docs (Phase 6).
export const DOCS = ['settings/site', 'content/strings', 'content/media'];
