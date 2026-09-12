#!/usr/bin/env node
// scripts/lighthouse.mjs — runs Lighthouse against a URL and prints the five numbers used across
// this project's performance work (Phase 7 Task 4, item 28/30-32; Task 8 re-runs this against the
// live site). Default target is the live production home page; `--url` overrides it for a local
// run against `npm run serve` (`node scripts/lighthouse.mjs --url http://127.0.0.1:5500/index.html`).
//
// Usage: `node scripts/lighthouse.mjs [--url <url>]`
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'test-results');
const OUT_FILE = join(OUT_DIR, 'lh.json');
const DEFAULT_URL = 'https://hrishi91.github.io/trust_webpage/index.html';

function parseArgs(argv) {
  const urlFlag = argv.indexOf('--url');
  return { url: urlFlag !== -1 ? argv[urlFlag + 1] : DEFAULT_URL };
}

function runLighthouse(url) {
  mkdirSync(OUT_DIR, { recursive: true });
  execFileSync('npx', [
    'lighthouse', url,
    '--output=json', `--output-path=${OUT_FILE}`,
    '--chrome-flags=--headless=new',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet',
  ], { cwd: ROOT, stdio: 'inherit' });
}

function report() {
  const lhr = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  const score = id => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  const metric = id => lhr.audits[id]?.displayValue ?? lhr.audits[id]?.numericValue ?? 'n/a';
  const out = {
    url: lhr.finalDisplayedUrl ?? lhr.requestedUrl,
    performance: score('performance'),
    accessibility: score('accessibility'),
    'best-practices': score('best-practices'),
    seo: score('seo'),
    CLS: metric('cumulative-layout-shift'),
    LCP: metric('largest-contentful-paint'),
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}

function main() {
  const { url } = parseArgs(process.argv.slice(2));
  runLighthouse(url);
  report();
}

main();
