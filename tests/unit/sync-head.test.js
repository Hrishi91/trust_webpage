import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HEAD_META, generatedFiles, lastmodFor } from '../../scripts/sync-head.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('HEAD_META covers every *.html file at the repo root (admin/ excluded, it is a directory not a file)', () => {
  const rootHtmlFiles = readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
  const metaFiles = Object.values(HEAD_META).map(m => m.file).sort();
  assert.deepEqual(metaFiles, rootHtmlFiles);
});

test('HEAD_META entries are unique files with a bn+en desc', () => {
  const files = Object.values(HEAD_META).map(m => m.file);
  assert.equal(new Set(files).size, files.length, 'no duplicate target files');
  for (const [id, meta] of Object.entries(HEAD_META)) {
    assert.ok(meta.desc?.bn && meta.desc?.en, `${id} needs a bn+en desc`);
    assert.ok(meta.titleKey || meta.title, `${id} needs a titleKey or a literal title`);
  }
});

test('only the 404 page (notfound) is noindex / has no canonical', () => {
  for (const [id, meta] of Object.entries(HEAD_META)) {
    if (id === 'notfound') { assert.equal(meta.noindex, true); continue; }
    assert.ok(!meta.noindex, `${id} must not be noindex`);
  }
});

test('generatedFiles() is idempotent: running it twice yields byte-identical output', () => {
  const a = generatedFiles();
  const b = generatedFiles();
  assert.deepEqual(a, b);
});

test('generatedFiles(): every HTML file gets exactly one head:start/head:end block containing a <title>, canonical or noindex, og:image, and JSON-LD', () => {
  const files = generatedFiles();
  for (const [id, meta] of Object.entries(HEAD_META)) {
    const html = files[meta.file];
    const blocks = html.match(/<!-- head:start -->/g) || [];
    assert.equal(blocks.length, 1, `${meta.file} must have exactly one head:start marker`);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /og:image/);
    assert.match(html, /application\/ld\+json/);
    if (meta.noindex) assert.match(html, /name="robots" content="noindex"/);
    else assert.match(html, /rel="canonical"/);
  }
});

test('generatedFiles(): robots.txt disallows the admin path under the Pages sub-path and points at the sitemap; sitemap.xml has one <url> per non-noindex page; manifest.webmanifest has both icon sizes', () => {
  const files = generatedFiles();
  // Final-review fix wave I3: this site is served under a repo sub-path
  // (https://hrishi91.github.io/trust_webpage/), so the disallowed path must be
  // '/trust_webpage/admin/', not a bare '/admin/' that never matches any real request path here.
  assert.match(files['robots.txt'], /Disallow: \/trust_webpage\/admin\/\n/);
  assert.doesNotMatch(files['robots.txt'], /Disallow: \/admin\/\n/);
  assert.match(files['robots.txt'], /Sitemap: https:\/\/hrishi91\.github\.io\/trust_webpage\/sitemap\.xml/);
  const urlCount = (files['sitemap.xml'].match(/<url>/g) || []).length;
  const expected = Object.values(HEAD_META).filter(m => !m.noindex).length;
  assert.equal(urlCount, expected);
  const manifest = JSON.parse(files['manifest.webmanifest']);
  assert.deepEqual(manifest.icons.map(i => i.sizes).sort(), ['192x192', '512x512']);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './index.html');
});

test('lastmodFor() returns a date in YYYY-MM-DD format from git history or falls back to 2026-09-12', () => {
  const indexPath = join(ROOT, 'index.html');
  const lastmod = lastmodFor(indexPath);
  assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, 'lastmod must be in YYYY-MM-DD format');
});

test('generatedFiles() is stable: running it twice yields byte-identical sitemap.xml (not affected by wall clock)', () => {
  const a = generatedFiles();
  const b = generatedFiles();
  assert.equal(a['sitemap.xml'], b['sitemap.xml'], 'sitemap.xml must be identical on consecutive runs');
});

// Phase 7 performance pass (2026-09-13): the render-blocking Google Fonts stylesheet + its
// preconnects + the four version-pinned gstatic preloads are gone from every generated public
// page, replaced by one self-hosted preload and an inlined tokens/themes <style> block — see
// css/fonts.css and scripts/sync-head.mjs's FONT_PRELOADS / buildAssetsBlock().
test('generatedFiles(): no generated HTML file references fonts.googleapis.com or fonts.gstatic.com', () => {
  const files = generatedFiles();
  for (const [rel, html] of Object.entries(files)) {
    if (!rel.endsWith('.html')) continue;
    assert.doesNotMatch(html, /fonts\.googleapis\.com/, `${rel} must not reference fonts.googleapis.com`);
    assert.doesNotMatch(html, /fonts\.gstatic\.com/, `${rel} must not reference fonts.gstatic.com`);
  }
});

test('generatedFiles(): every HTML file has exactly one self-hosted font preload (the Hind Siliguri body face)', () => {
  const files = generatedFiles();
  for (const [rel, html] of Object.entries(files)) {
    if (!rel.endsWith('.html')) continue;
    const preloads = html.match(/<link rel="preload" as="font"[^>]*>/g) || [];
    assert.equal(preloads.length, 1, `${rel} must have exactly one font preload`);
    assert.match(preloads[0], /href="assets\/fonts\/hind-siliguri-400-bengali\.woff2"/, `${rel} preload must target the self-hosted body face`);
  }
});

test('generatedFiles(): every HTML file links css/fonts.css, css/tokens.css, css/site.css and css/themes.css (self-hosted, no Google Fonts)', () => {
  const files = generatedFiles();
  for (const [rel, html] of Object.entries(files)) {
    if (!rel.endsWith('.html')) continue;
    assert.match(html, /<link rel="stylesheet" href="css\/fonts\.css">/, `${rel} must link css/fonts.css`);
    assert.match(html, /<link rel="stylesheet" href="css\/tokens\.css">/, `${rel} must link css/tokens.css`);
    assert.match(html, /<link rel="stylesheet" href="css\/site\.css">/, `${rel} must link css/site.css`);
    assert.match(html, /<link rel="stylesheet" href="css\/themes\.css">/, `${rel} must link css/themes.css`);
  }
});
