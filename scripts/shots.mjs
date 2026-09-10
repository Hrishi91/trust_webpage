// Renders every public page × five themes × three widths against the local server (emulator + seed
// running). Output: test-results/shots/<theme>/<page>-<width>.png. Usage: node scripts/shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const THEMES = ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh'];
const PAGES = ['index', 'about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members'];
const WIDTHS = [390, 768, 1366];
const base = process.env.BASE_URL || 'http://127.0.0.1:5500';
const browser = await chromium.launch();
for (const theme of THEMES) {
  mkdirSync(`test-results/shots/${theme}`, { recursive: true });
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const p of PAGES) {
      // 'networkidle' never resolves on this site: the shell's live-announcements ticker keeps a
      // persistent Firestore connection open on every page. 'load' + a settle pause is what the
      // existing e2e specs in this repo rely on too (none of them use 'networkidle').
      await page.goto(`${base}/${p}.html?theme=${theme}`, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.warn(`OVERFLOW ${theme}/${p}@${w}: ${overflow}px`);
      await page.screenshot({ path: `test-results/shots/${theme}/${p}-${w}.png`, fullPage: true });
    }
    await page.close();
  }
}
await browser.close();
console.log('done → test-results/shots/');
