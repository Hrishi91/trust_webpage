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

test('generatedFiles(): robots.txt disallows /admin/ and points at the sitemap; sitemap.xml has one <url> per non-noindex page; manifest.webmanifest has both icon sizes', () => {
  const files = generatedFiles();
  assert.match(files['robots.txt'], /Disallow: \/admin\//);
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
