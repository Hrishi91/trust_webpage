// Phase 7 Task 5 (site-basics audit item 29). Covers the pure logic behind the SW cache-key
// discipline: version format, the shell-asset hash, and `sw:check`'s pass/fail decision — all
// without touching the filesystem for the pure pieces, per scripts/bump-sw.mjs's own doc comment
// on why these are exported as pure functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SHELL_ASSETS, SHELL_HTML, SHELL_CSS, SHELL_FONTS, SHELL_JS, hashAssetContents, computeShellHash,
} from '../../scripts/lib/shell-assets.mjs';
import {
  isValidVersion, nextVersion, todayStamp, needsBump, generateSwVersionJs, generateSwJs,
} from '../../scripts/bump-sw.mjs';
import { SW_VERSION, SW_HASH } from '../../js/sw-version.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('SHELL_ASSETS covers the 15 root HTML pages, the 4 shell CSS files, the default-theme font files, and every public JS module, with no admin/* files', () => {
  assert.equal(SHELL_HTML.length, 15);
  assert.deepEqual([...SHELL_CSS].sort(), ['css/fonts.css', 'css/site.css', 'css/themes.css', 'css/tokens.css']);
  // Phase 7 performance pass: only the default (সিদ্ধি) theme's Bengali+Latin font files are
  // precached — Hind Siliguri 500/600 and the Tiro Bangla/Atma theme faces stay a normal,
  // uncached-until-used fetch (see scripts/lib/shell-assets.mjs's own comment on SHELL_FONTS).
  assert.deepEqual([...SHELL_FONTS].sort(), [
    'assets/fonts/baloo-da-2-700-bengali.woff2',
    'assets/fonts/baloo-da-2-700-latin.woff2',
    'assets/fonts/hind-siliguri-400-bengali.woff2',
    'assets/fonts/hind-siliguri-400-latin.woff2',
    'assets/fonts/hind-siliguri-700-bengali.woff2',
    'assets/fonts/hind-siliguri-700-latin.woff2',
  ]);
  assert.ok(SHELL_JS.length > 0);
  for (const rel of SHELL_ASSETS) {
    assert.ok(!rel.startsWith('admin/'), `${rel} must not be an admin/ file`);
    assert.ok(!rel.startsWith('assets/icons/'), `${rel} must not be an icon file`);
    assert.notEqual(rel, 'manifest.webmanifest');
  }
  assert.equal(new Set(SHELL_ASSETS).size, SHELL_ASSETS.length, 'no duplicate entries');
});

test('computeShellHash(ROOT) reads every SHELL_ASSETS file without throwing (all exist on disk)', () => {
  assert.doesNotThrow(() => computeShellHash(ROOT));
});

test('hashAssetContents is a pure function of (path, content) pairs: order and content both matter', () => {
  const a = hashAssetContents([['a.js', Buffer.from('1')], ['b.js', Buffer.from('2')]]);
  const b = hashAssetContents([['a.js', Buffer.from('1')], ['b.js', Buffer.from('2')]]);
  const differentContent = hashAssetContents([['a.js', Buffer.from('X')], ['b.js', Buffer.from('2')]]);
  const differentOrder = hashAssetContents([['b.js', Buffer.from('2')], ['a.js', Buffer.from('1')]]);
  assert.equal(a, b, 'identical input must hash identically');
  assert.notEqual(a, differentContent, 'changed content must change the hash');
  assert.notEqual(a, differentOrder, 'changed order must change the hash');
  assert.match(a, /^[0-9a-f]{64}$/, 'sha256 hex digest');
});

test('computeShellHash(ROOT) matches a from-scratch hash of the same files (covers the real allowlist)', () => {
  const direct = hashAssetContents(SHELL_ASSETS.map((rel) => [rel, readFileSync(join(ROOT, rel))]));
  assert.equal(computeShellHash(ROOT), direct);
});

test('js/sw-version.js: SW_VERSION is YYYYMMDD-n and SW_HASH matches the committed shell assets', () => {
  assert.ok(isValidVersion(SW_VERSION), `SW_VERSION "${SW_VERSION}" must look like YYYYMMDD-n`);
  assert.match(SW_HASH, /^[0-9a-f]{64}$/);
  assert.equal(SW_HASH, computeShellHash(ROOT), 'SW_HASH is stale — run `npm run sw:bump`');
});

test('isValidVersion rejects malformed strings', () => {
  assert.equal(isValidVersion('20260912-1'), true);
  assert.equal(isValidVersion('2026-09-12'), false);
  assert.equal(isValidVersion('20260912'), false);
  assert.equal(isValidVersion(''), false);
  assert.equal(isValidVersion(null), false);
});

test('nextVersion increments the counter within the same day and resets on a new day', () => {
  assert.equal(nextVersion('20260912-1', '20260912'), '20260912-2');
  assert.equal(nextVersion('20260912-4', '20260912'), '20260912-5');
  assert.equal(nextVersion('20260912-4', '20260913'), '20260913-1');
  assert.equal(nextVersion(null, '20260913'), '20260913-1');
  assert.equal(nextVersion('garbage', '20260913'), '20260913-1');
});

test('todayStamp formats a Date as YYYYMMDD', () => {
  assert.equal(todayStamp(new Date('2026-09-12T10:00:00Z')), '20260912');
});

test('needsBump: true iff the stored hash differs from the freshly computed one', () => {
  assert.equal(needsBump('abc', 'abc'), false);
  assert.equal(needsBump('abc', 'def'), true);
  assert.equal(needsBump(null, 'def'), true);
});

test('generateSwVersionJs / generateSwJs round-trip: the file bump-sw.mjs would write matches what is committed', () => {
  const versionPath = join(ROOT, 'js', 'sw-version.js');
  assert.equal(readFileSync(versionPath, 'utf8'), generateSwVersionJs(SW_VERSION, SW_HASH));

  const swJsPath = join(ROOT, 'sw.js');
  assert.equal(readFileSync(swJsPath, 'utf8'), generateSwJs(SW_VERSION, SHELL_ASSETS), 'sw.js must be exactly what the generator produces');
});

test('generateSwJs never precaches admin/*, assets/icons/*, or manifest.webmanifest, and guards fetch-time exclusions', () => {
  const src = generateSwJs('20260912-1', SHELL_ASSETS);
  assert.ok(!src.includes("'./admin/"));
  assert.ok(!src.includes("'./assets/icons/"));
  assert.ok(!src.includes("'./manifest.webmanifest'"));
  assert.match(src, /req\.method !== 'GET'/);
  assert.match(src, /Authorization/);
  assert.match(src, /url\.origin !== self\.location\.origin/);
  assert.match(src, /\/admin\//);
  assert.match(src, /endsWith\('\/sw\.js'\)/);
  assert.match(src, /skipWaiting/);
  assert.match(src, /clients\.claim/);
  assert.match(src, /CACHE_PREFIX/);
});
