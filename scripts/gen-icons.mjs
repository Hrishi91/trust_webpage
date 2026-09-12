#!/usr/bin/env node
// scripts/gen-icons.mjs — generates the favicon set + per-page OG images from the ॐ brand mark
// (no logo PNG exists yet — owner-only asset, spec §2). Uses a headless Chromium <canvas> (via
// Playwright, already a devDependency) rather than a Node canvas library so the exact same
// Google-Fonts-loaded Bengali glyphs render as they do in a browser. Usage: `npm run icons`.
//
// Output (committed, not gitignored — spec: "generated assets ARE committed"):
//   assets/icons/{favicon.ico,icon-192.png,icon-512.png,apple-touch-icon.png}
//   assets/og/<page>.png (1200x630) for every HEAD_META entry
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { HEAD_META } from './sync-head.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDIGO = '#0f1230';
const INDIGO2 = '#1c2154';
const GOLD = '#ffcc66';
const CREAM = '#fff7ea';
const TRUST_BN = 'গণেশ পুজো ট্রাস্ট';
const MAX_BYTES = 120 * 1024;

// Resolves the same bn title HEAD_META/js/i18n.js would show as <title> — mirrors
// scripts/sync-head.mjs's resolveTitle() but only needs the bn half here.
function bnTitleFor(id, meta, strings) {
  if (meta.title) return meta.title.bn;
  return strings[meta.titleKey].bn;
}

function dataUrlToBuffer(dataUrl) {
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

// A minimal single-image ICO container wrapping a PNG (ICONDIR + one ICONDIRENTRY + the PNG
// bytes) — every modern consumer (browsers, OS icon caches) accepts a PNG-format image inside an
// .ico this way; a hand-rolled BMP encoder would be needless extra code for one 32x32 icon.
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // color count (0 = not palette)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12); // offset: 6 (header) + 16 (this entry)
  return Buffer.concat([header, entry, pngBuffer]);
}

function checkSize(path) {
  const bytes = statSync(path).size;
  if (bytes > MAX_BYTES) console.warn(`gen-icons: WARNING ${path} is ${(bytes / 1024).toFixed(1)} KB, over the 120 KB budget`);
  return bytes;
}

async function main() {
  mkdirSync(join(ROOT, 'assets/icons'), { recursive: true });
  mkdirSync(join(ROOT, 'assets/og'), { recursive: true });

  const { STRINGS } = await import('../js/i18n.js');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@700&family=Baloo+Da+2:wght@600;700&display=swap">
<style>html,body{margin:0}</style></head><body></body></html>`, { waitUntil: 'networkidle' });

  // Confirm the Google-Fonts request actually landed and the glyphs are usable before drawing
  // anything — a network hiccup or an offline run must fall back to system fonts rather than
  // silently emitting tofu boxes for the Bengali/Devanagari text (brief: "if the headless font
  // fails, fall back to system fonts and say so").
  let fontOk = false;
  try {
    fontOk = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('700 100px "Noto Sans Devanagari"'),
        document.fonts.load('700 100px "Baloo Da 2"'),
      ]);
      await document.fonts.ready;
      return document.fonts.check('700 100px "Noto Sans Devanagari"') && document.fonts.check('700 100px "Baloo Da 2"');
    });
  } catch (err) {
    console.warn('gen-icons: font load check threw', err.message);
  }
  const OM_FONT = fontOk ? '"Noto Sans Devanagari", serif' : 'serif';
  const TITLE_FONT = fontOk ? '"Baloo Da 2", sans-serif' : 'sans-serif';
  if (!fontOk) console.warn('gen-icons: WARNING Bengali/Devanagari web fonts did not load in the headless page — falling back to system serif/sans-serif. Re-run with network access to get the intended type.');

  async function renderIcon(size) {
    return page.evaluate(({ size, INDIGO, GOLD, OM_FONT }) => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const r = size * 0.18;
      ctx.fillStyle = INDIGO;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = `700 ${Math.round(size * 0.6)}px ${OM_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ॐ', size / 2, size * 0.56);
      return canvas.toDataURL('image/png');
    }, { size, INDIGO, GOLD, OM_FONT });
  }

  async function renderOg(bnTitle) {
    return page.evaluate(({ INDIGO, INDIGO2, GOLD, CREAM, OM_FONT, TITLE_FONT, bnTitle, TRUST_BN }) => {
      const W = 1200, H = 630;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      // "Theme ground gradient" as flat shapes, not a canvas gradient: a smooth linear/radial
      // gradient over a 1200x630 canvas is near-photographic (every pixel a distinct shade),
      // which bloats PNG output past the 120 KB budget by ~15-20x (measured: 670 KB vs 40 KB for
      // the same composition redone as solid fills) since PNG's lossless compression can't find
      // repeats in continuous tone. Two flat accent shapes give the same layered-ground look at a
      // fraction of the size.
      ctx.fillStyle = INDIGO;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = INDIGO2;
      ctx.beginPath();
      ctx.arc(W - 200, 130, 420, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141838';
      ctx.fillRect(0, H - 110, W, 110);
      ctx.fillStyle = GOLD;
      ctx.globalAlpha = 0.9;
      ctx.font = `700 220px ${OM_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('ॐ', 60, 300);
      ctx.globalAlpha = 1;
      ctx.fillStyle = CREAM;
      ctx.font = `700 66px ${TITLE_FONT}`;
      ctx.fillText(bnTitle, 70, 420);
      ctx.fillStyle = GOLD;
      ctx.font = `600 34px ${TITLE_FONT}`;
      ctx.fillText(TRUST_BN, 70, 480);
      return canvas.toDataURL('image/png');
    }, { INDIGO, INDIGO2, GOLD, CREAM, OM_FONT, TITLE_FONT, bnTitle, TRUST_BN });
  }

  const favPng = dataUrlToBuffer(await renderIcon(32));
  writeFileSync(join(ROOT, 'assets/icons/favicon.ico'), pngToIco(favPng, 32));
  writeFileSync(join(ROOT, 'assets/icons/icon-192.png'), dataUrlToBuffer(await renderIcon(192)));
  writeFileSync(join(ROOT, 'assets/icons/icon-512.png'), dataUrlToBuffer(await renderIcon(512)));
  writeFileSync(join(ROOT, 'assets/icons/apple-touch-icon.png'), dataUrlToBuffer(await renderIcon(180)));

  for (const [id, meta] of Object.entries(HEAD_META)) {
    const bnTitle = bnTitleFor(id, meta, STRINGS);
    const buf = dataUrlToBuffer(await renderOg(bnTitle));
    writeFileSync(join(ROOT, `assets/og/${id}.png`), buf);
  }

  await browser.close();

  for (const p of ['assets/icons/favicon.ico', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png']) checkSize(join(ROOT, p));
  for (const id of Object.keys(HEAD_META)) checkSize(join(ROOT, `assets/og/${id}.png`));

  console.log(`gen-icons: done (fonts ${fontOk ? 'OK' : 'FALLBACK — see warning above'})`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
