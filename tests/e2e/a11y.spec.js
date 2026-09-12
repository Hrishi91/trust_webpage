// Phase 7 Task 3 — accessibility (audit items 18-27).
// Two kinds of checks live here:
//  1. axe-core (injected from cdnjs at run time — never bundled) on every public page in the
//     default theme: zero serious/critical violations.
//  2. Hand-written keyboard-flow and per-theme contrast assertions for the specific things the
//     audit found broken (skip link, gallery lightbox, event day tabs, donate form errors, the six
//     live contrast failures) — axe alone would not catch a wrong tab order or a focus trap.
import { test, expect } from '@playwright/test';
import './../seed/_emulator-env.js';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { contrast as ratio } from '../../js/contrast.js';

const AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
const PUBLIC_PAGES = ['index', 'about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members'];
const THEMES = ['siddhi', 'mukha', 'dhokra', 'atreyee', 'bangarh'];

async function runAxe(page) {
  await page.addScriptTag({ url: AXE_URL });
  return page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
}
function seriousOrCritical(results) {
  return results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
}
function describe(violations) {
  return JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => n.target) })), null, 2);
}

for (const p of PUBLIC_PAGES) {
  test(`axe: /${p}.html has zero serious/critical violations (default theme)`, async ({ page }) => {
    await page.goto(`/${p}.html`);
    const results = await runAxe(page);
    const bad = seriousOrCritical(results);
    expect(bad.length, describe(bad)).toBe(0);
  });
}
test('axe: gallery album view (dialog markup present but closed) has zero serious/critical violations', async ({ page }) => {
  await page.goto('/gallery.html?album=a1');
  const results = await runAxe(page);
  const bad = seriousOrCritical(results);
  expect(bad.length, describe(bad)).toBe(0);
});

// Item 18: the skip link is the FIRST child of #site-header — the very first Tab press on any
// page must land on it and reveal it (it sits off-screen at top:-56px until :focus).
test('home: the first Tab press reveals and focuses the skip link', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('.skip').waitFor(); // mountShell() inserts it once its async Firestore fetch resolves
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip');
  await expect(skip).toBeFocused();
  // top:-56px -> top:8px is a CSS transition (.15s) — poll instead of reading the box once,
  // since a single boundingBox() call right after focus can land mid-animation.
  await expect.poll(async () => (await skip.boundingBox())?.y).toBeGreaterThanOrEqual(0);
});

// Item 20: dialog-based lightbox — a real, focusable trigger button; Enter opens (native button
// behaviour, no extra JS needed); Escape closes via the browser's own 'cancel' event and focus is
// restored to whichever thumbnail opened it (js/pages/gallery.js's 'close' listener).
test('gallery album view: Enter opens the lightbox, Escape closes it and returns focus', async ({ page }) => {
  await page.goto('/gallery.html?album=a1');
  const firstThumb = page.locator('.thumb-btn').first();
  await firstThumb.focus();
  await expect(firstThumb).toBeFocused();
  const dialog = page.locator('dialog.lightbox');
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveAttribute('src', /placehold\.co/);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(firstThumb).toBeFocused();
});
test('gallery lightbox: next/prev buttons move between the album\'s photos', async ({ page }) => {
  await page.goto('/gallery.html?album=a1');
  await page.locator('.thumb-btn').first().click();
  const dialog = page.locator('dialog.lightbox');
  const img = dialog.locator('img');
  const first = await img.getAttribute('src');
  await dialog.locator('.lb-next').click();
  await expect.poll(() => img.getAttribute('src')).not.toBe(first);
  await dialog.locator('.lb-prev').click();
  await expect.poll(() => img.getAttribute('src')).toBe(first);
});
test('gallery lightbox: clicking the backdrop closes the dialog', async ({ page }) => {
  await page.goto('/gallery.html?album=a1');
  const firstThumb = page.locator('.thumb-btn').first();
  await firstThumb.click();
  const dialog = page.locator('dialog.lightbox');
  await expect(dialog).toBeVisible();
  // Clicks on the ::backdrop target the dialog element itself; clicking at the top-left corner
  // (in the padding area, away from the image/buttons) hits the backdrop.
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
});

// Item 21: real tabs — a temporary second published event (a different calendar day than the
// seeded events/e1) is added directly through the Admin SDK (bypasses rules, like tests/seed/seed.js)
// so ArrowRight has a second day to move to; removed again in afterAll so it never leaks into
// public.spec.js's exact `.ev` count assertions.
test.describe('events day tabs', () => {
  const app = initializeApp({ projectId: 'demo-trust' }, 'a11y-spec');
  const db = getFirestore(app);
  const TMP_ID = 'a11y-tab2';
  test.beforeAll(async () => {
    await db.doc(`events/${TMP_ID}`).set({
      deleted: false, createdAt: new Date(),
      title: { bn: 'এ১১ওয়াই দিন ২', en: 'A11y day 2' }, venue: { bn: '', en: '' }, desc: { bn: '', en: '' },
      start: new Date(Date.now() + 2 * 86400000).toISOString(), end: '', order: 0, published: true,
    });
  });
  test.afterAll(async () => {
    await db.doc(`events/${TMP_ID}`).delete();
  });

  test('ArrowRight moves both focus and selection to the next day tab', async ({ page }) => {
    await page.goto('/events.html');
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(2);
    const firstTab = page.locator('#day-tab-0'), secondTab = page.locator('#day-tab-1');
    await firstTab.focus();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(secondTab).toBeFocused();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(firstTab).toHaveAttribute('aria-selected', 'false');
    // Panel has stable id 'day-panel' (not per-day); aria-labelledby points to the selected tab
    await expect(page.locator('#day-panel')).toHaveAttribute('aria-labelledby', 'day-tab-1');
    // Every tab's aria-controls points at an existing element in the DOM
    for (let i = 0; i < 2; i++) {
      const tab = page.locator(`#day-tab-${i}`);
      const controlsId = await tab.getAttribute('aria-controls');
      await expect(page.locator(`#${controlsId}`)).toBeVisible();
    }
  });
});

// Item 25: an invalid amount gets an inline message under the field, linked via aria-describedby —
// not only a toast the field itself never referenced.
test('donate: submitting an empty amount shows the inline error, wired via aria-describedby', async ({ page }) => {
  await page.goto('/donate.html');
  const amountInput = page.locator('#donate-amount');
  const describedBy = await amountInput.getAttribute('aria-describedby');
  expect(describedBy).toBe('donate-amount-err');
  const err = page.locator(`#${describedBy}`);
  await expect(err).toBeHidden();
  await page.click('button:has-text("WhatsApp-এ জানান")');
  await expect(err).toBeVisible();
  await expect(err).not.toBeEmpty();
  await expect(amountInput).toHaveAttribute('aria-invalid', 'true');
});

// Item 25: `<label for>` on the donate/members fields — clicking the label focuses its input.
test('donate: clicking the amount label focuses the amount input', async ({ page }) => {
  await page.goto('/donate.html');
  await page.click('label[for="donate-amount"]');
  await expect(page.locator('#donate-amount')).toBeFocused();
});
test('members: clicking the phone label focuses the phone input', async ({ page }) => {
  await page.goto('/members.html');
  await page.click('label[for="mem-phone"]');
  await expect(page.locator('#mem-phone')).toBeFocused();
});

// Item 22: role="status" on toast() makes it an implicit aria-live="polite" region.
test('toast() renders with role="status" (an implicit aria-live="polite" region)', async ({ page }) => {
  await page.goto('/donate.html');
  await page.evaluate(async () => {
    const { toast } = await import('/js/ui.js');
    toast('a11y-spec test message');
  });
  await expect(page.locator('.toast[role="status"]', { hasText: 'a11y-spec test message' })).toBeVisible();
});

// Item 26: role="banner" landmark + about.html's heading order.
test('landmarks: #site-header is role=banner; about.html has no h1->h3 skip', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#site-header')).toHaveAttribute('role', 'banner');
  await page.goto('/about.html');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h3').first()).toHaveCount(0); // history cards render h2, not h3
});

// Item 27: cred.registered's Bengali value.
test('home credibility strip reads Bengali in Bengali mode', async ({ page }) => {
  await page.goto('/index.html');
  const cred = page.locator('.cred b', { hasText: 'নিবন্ধিত' });
  await expect(cred).toHaveCount(1);
});

// Item 23: the six real contrast failures, re-measured live in the browser (not just token math)
// in all five themes — getComputedStyle resolves color-mix()/inheritance/opacity to real rgb(),
// and js/contrast.js's own contrast() (imported here, not re-implemented) does the WCAG maths.
function toHex(rgbStr) {
  const m = rgbStr.match(/[\d.]+/g).map(Number);
  return '#' + m.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
for (const theme of THEMES) {
  test(`contrast (${theme}): ticker small, .pulse, brand .t/.s, .donate .eyebrow all pass 4.5:1`, async ({ page }) => {
    await page.goto(`/index.html?theme=${theme}`);
    // Everything here comes from mountShell()'s/home.js's async Firestore fetch — wait for the
    // slowest of the five (the donate band, rendered near the end of home.js's section list)
    // before reading computed styles, or the ticker/brand-text nodes may not exist yet.
    await page.locator('.donate .eyebrow').waitFor();
    const colors = await page.evaluate(() => {
      const cs = el => getComputedStyle(el);
      const bgOf = el => {
        for (let e = el; e; e = e.parentElement) {
          const c = cs(e).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        }
        return 'rgb(255,255,255)';
      };
      const pair = sel => { const el = document.querySelector(sel); return el ? { color: cs(el).color, bg: bgOf(el) } : null; };
      return {
        tickerSmall: pair('.ticker .ann small'),
        pulse: pair('.live-strip .pulse'),
        brandT: pair('.brand .t'),
        brandS: pair('.brand .s'),
        eyebrow: pair('.donate .eyebrow'),
      };
    });
    for (const [name, pair] of Object.entries(colors)) {
      expect(pair, `${theme} ${name}: selector not found on the page`).not.toBeNull();
      const r = ratio(toHex(pair.color), toHex(pair.bg));
      expect(r, `${theme} ${name}: ${pair.color} on ${pair.bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
