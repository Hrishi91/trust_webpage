// Phase 7 Task 4 — performance (site-basics audit items 28, 30–32). The service-worker tests
// promised by this file's name land in Task 5; this file covers what Task 4 actually built:
//  - item 28: a static app-shell renders real nav/hero/footer with JavaScript disabled — no more
//    blank `<main>` (the old `<p id="loading">…</p>`) driving Lighthouse's CLS 0.997 / LCP 7.1s.
//  - item 31: js/firebase-auth.js (Auth) is never fetched by a page that doesn't sign anyone in.
//  - item 32: DOMPurify loads `defer`, but about.html's history bodies (sanitised via
//    js/rich.js -> window.DOMPurify) still render.
//  - item 29 (Phase 7 Task 5): a versioned app-shell service worker — home renders offline after
//    one visit. Registration defaults OFF on localhost (js/sw-register.js), so every test below
//    that needs it opts in with `?sw=1`; every other spec in this suite is unaffected.
import { test, expect } from '@playwright/test';

test.describe('JS-disabled: the static app-shell renders without JavaScript', () => {
  test('index.html shows real nav links, the hero heading, and 4 footer columns', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/index.html`);
      // Static default shows every NAV entry (js/nav-config.js) — hydration is the thing that
      // would trim it to the real sectionVisibility, and hydration never runs here.
      expect(await page.locator('.nav .links a').count()).toBeGreaterThanOrEqual(8);
      await expect(page.locator('.hero h1')).toHaveText('গণেশ পুজো ট্রাস্ট');
      expect(await page.locator('footer .wrap > div').count()).toBe(4);
      // The old `…`-only placeholder (<p class="muted" id="loading">) is gone outright, not just
      // hidden — it was the whole reason <main> had nothing to show before Firestore answered.
      expect(await page.locator('#loading').count()).toBe(0);
    } finally {
      await context.close();
    }
  });
});

test.describe('JS-enabled: firebase-auth.js loads only on pages that sign someone in', () => {
  for (const path of ['/index.html', '/about.html', '/donate.html']) {
    test(`${path} never requests firebase-auth.js`, async ({ page }) => {
      const requested = [];
      page.on('request', req => requested.push(req.url()));
      await page.goto(path);
      // ES module imports resolve the whole graph before any of it starts running, so if
      // js/firebase-auth.js (and the gstatic firebase-auth.js chunk it imports) were ever going
      // to be requested for this page, the request already happened before this point — no need
      // to wait for Firestore's long-lived listeners to go idle.
      await expect(page.locator('.brand')).toContainText('গণেশ পুজো ট্রাস্ট');
      expect(requested.some(u => u.includes('firebase-auth.js'))).toBe(false);
    });
  }

  test('/members.html (Auth actually used here) does request firebase-auth.js', async ({ page }) => {
    const requested = [];
    page.on('request', req => requested.push(req.url()));
    await page.goto('/members.html');
    await expect(page.locator('.brand')).toContainText('গণেশ পুজো ট্রাস্ট');
    expect(requested.some(u => u.includes('firebase-auth.js'))).toBe(true);
  });
});

test('about.html: DOMPurify (deferred) still sanitises and renders history bodies', async ({ page }) => {
  await page.goto('/about.html');
  const firstCard = page.locator('.tl .card').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.locator('.rich')).not.toHaveText('');
  // js/rich.js falls back to common.richUnavailable when window.DOMPurify is missing — asserting
  // its absence catches a regression where `defer` broke the load-before-use ordering silently.
  await expect(firstCard).not.toContainText('লেখা দেখানো যাচ্ছে না');
});

test.describe('Service worker: versioned app-shell cache (item 29)', () => {
  test('index.html?sw=1 registers a service worker and precaches the versioned trust-shell cache', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/index.html?sw=1`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames.some((n) => /^trust-shell-\d{8}-\d+$/.test(n))).toBe(true);
  });

  test('offline after one visit: reloading with the network off still shows the hero heading and full nav', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/index.html?sw=1`);
      // Wait for the SW to actually take control (skipWaiting + clients.claim) rather than an
      // arbitrary timeout — proves the precache (part of the same install step) has finished too.
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('.hero h1')).toHaveText('গণেশ পুজো ট্রাস্ট');
      expect(await page.locator('.nav .links a').count()).toBeGreaterThanOrEqual(8);
    } finally {
      await context.close();
    }
  });

  test('/admin/ is never controlled by the service worker', async ({ browser, baseURL }) => {
    // A fresh, isolated context (its own service-worker/cache-storage partition, like a separate
    // profile) — admin/index.html never loads js/sw-register.js, so nothing in this session ever
    // calls navigator.serviceWorker.register() for /admin/. (A registration's scope is directory
    // hierarchical: a root-scoped worker registered from a PUBLIC page in the SAME session would
    // end up covering /admin/ too, same as it covers every other root-level page — sw.js's fetch
    // handler explicitly ignores every /admin/* request either way, per spec §4, but this test
    // asserts the plain no-prior-registration case the brief calls out.)
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/admin/`);
      const controller = await page.evaluate(() => navigator.serviceWorker.controller);
      expect(controller).toBeNull();
    } finally {
      await context.close();
    }
  });
});
