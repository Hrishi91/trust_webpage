// scripts/lib/shell-assets.mjs — the ONE list of same-origin app-shell files sw.js is allowed to
// precache (site-basics audit item 29, spec §2 "Service worker"). Never admin/*, never
// assets/icons/*, never manifest.webmanifest, never cross-origin (gstatic/googleapis/
// firebasestorage/cdnjs) — those are fetched normally, outside this worker's cache-first path.
//
// SHELL_HTML is derived from scripts/sync-head.mjs's HEAD_META (the file list that script already
// owns) instead of being retyped here, so the two can never drift apart — the same "single source
// of truth" discipline sync-head.mjs itself uses for titles vs. js/page-defaults.js.
//
// scripts/bump-sw.mjs hashes the contents of every file in SHELL_ASSETS and stores the digest as
// SW_HASH in js/sw-version.js; `npm run sw:check` recomputes it and fails when it disagrees,
// which is what makes "I edited a shell CSS/JS file but forgot to bump the SW version" a CI
// failure instead of a silent stale-cache bug for visitors.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { HEAD_META } from '../sync-head.mjs';

export const SHELL_HTML = Object.values(HEAD_META).map((m) => m.file).sort();

export const SHELL_CSS = ['css/tokens.css', 'css/site.css', 'css/themes.css'];

// Every js/*.js module actually used by a public page, plus js/sw-register.js itself (loaded by
// every public page's generated shell block — scripts/sync-shell.mjs). admin/js/* is excluded
// outright: admin pages are never precached and the service worker never controls /admin/.
export const SHELL_JS_ROOT = [
  'js/art.js',
  'js/content.js',
  'js/contrast.js',
  'js/culture.js',
  'js/default-settings.js',
  'js/firebase-auth.js',
  'js/firebase-config.js',
  'js/firebase.js',
  'js/i18n.js',
  'js/ics.js',
  'js/ledger-view.js',
  'js/ledger.js',
  'js/media-slots.js',
  'js/money.js',
  'js/nav-config.js',
  'js/page-defaults.js',
  'js/phone.js',
  'js/rich.js',
  'js/sections.js',
  'js/share.js',
  'js/shell.js',
  'js/sw-register.js',
  'js/theme.js',
  'js/ui.js',
];

export const SHELL_JS_PAGES = [
  'js/pages/about.js',
  'js/pages/committee.js',
  'js/pages/contact.js',
  'js/pages/donate.js',
  'js/pages/downloads.js',
  'js/pages/events.js',
  'js/pages/faq.js',
  'js/pages/gallery.js',
  'js/pages/home-data.js',
  'js/pages/home.js',
  'js/pages/members.js',
  'js/pages/news.js',
  'js/pages/notfound.js',
  'js/pages/privacy.js',
  'js/pages/transparency.js',
  'js/pages/trust.js',
];

export const SHELL_JS = [...SHELL_JS_ROOT, ...SHELL_JS_PAGES].sort();

// Full allowlist, repo-root-relative, sorted (deterministic — order must not affect the hash or
// the generated sw.js diff).
export const SHELL_ASSETS = [...SHELL_HTML, ...SHELL_CSS, ...SHELL_JS].sort();

/** Pure: hash of an ordered list of (relPath, contentBuffer) pairs. Exported so unit tests can
 * verify the hashing logic itself without touching the filesystem. */
export function hashAssetContents(entries) {
  const hash = createHash('sha256');
  for (const [rel, content] of entries) {
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Reads every SHELL_ASSETS file under `root` and returns the sha256 hex digest covering all of
 * them (path + content, in SHELL_ASSETS' fixed sorted order). */
export function computeShellHash(root) {
  const entries = SHELL_ASSETS.map((rel) => [rel, readFileSync(join(root, rel))]);
  return hashAssetContents(entries);
}
