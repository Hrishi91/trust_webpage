import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Phase 7 Task 2 — SEO & share (audit items 10-17). Seed gives one published+upcoming event
// (events/e1, "আগামী") so events.html always has at least one .ev row to assert the .ics link on.

const PUBLIC_PAGES = [
  'index.html', 'about.html', 'committee.html', 'gallery.html', 'events.html', 'donate.html',
  'transparency.html', 'members.html', 'privacy.html', 'trust.html', 'contact.html',
  'downloads.html', 'news.html', 'faq.html',
];

test('every public page: exactly one <title> starting with Bengali, a canonical, og:title, og:image (200 locally), and parseable JSON-LD', async ({ page, request }) => {
  for (const p of PUBLIC_PAGES) {
    const res = await page.goto(`/${p}`);
    expect(res.status(), p).toBe(200);
    await expect(page.locator('title'), p).toHaveCount(1);
    const titleText = await page.title();
    expect(/^[ঀ-৿]/.test(titleText), `${p} title should start with a Bengali character: "${titleText}"`).toBe(true);
    await expect(page.locator('link[rel="canonical"]'), p).toHaveCount(1);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle, p).toBeTruthy();
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage, p).toBeTruthy();
    // og:image content is the production absolute URL (https://hrishi91.github.io/trust_webpage/…)
    // — translate it to the local dev server's own path (no /trust_webpage/ prefix locally) to
    // check the file actually exists rather than hitting the real internet from a test.
    const localPath = new URL(ogImage).pathname.replace(/^\/trust_webpage\//, '/');
    const imgRes = await request.get(localPath);
    expect(imgRes.status(), `${p} og:image ${localPath}`).toBe(200);
    const ldJsons = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ldJsons.length, p).toBeGreaterThan(0);
    for (const json of ldJsons) expect(() => JSON.parse(json), `${p} JSON-LD: ${json.slice(0, 80)}`).not.toThrow();
  }
});

test('404.html is noindex with no canonical, but still has a title/og/JSON-LD', async ({ page }) => {
  const res = await page.goto('/404.html');
  expect(res.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('title')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('robots.txt, sitemap.xml, manifest.webmanifest and the favicon all serve 200 locally', async ({ request }) => {
  for (const p of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/assets/icons/favicon.ico']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(200);
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin/');
  expect(robots).toContain('Sitemap: https://hrishi91.github.io/trust_webpage/sitemap.xml');
});

test('share row (.share) is present on home, gallery, events, donate, transparency, news', async ({ page }) => {
  for (const p of ['index.html', 'gallery.html', 'events.html', 'donate.html', 'transparency.html', 'news.html']) {
    await page.goto(`/${p}`);
    await expect(page.locator('.share').first(), p).toBeVisible();
    // every share control is a real ≥44px target (item 15's "buttons ≥ 44px" requirement)
    const box = await page.locator('.share > *').first().boundingBox();
    expect(box.height, p).toBeGreaterThanOrEqual(44);
  }
});

test('events page: each event row has a "ক্যালেন্ডারে যোগ" link with a data:text/calendar href and a download attribute', async ({ page }) => {
  await page.goto('/events.html');
  const link = page.locator('.ev .ics').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveText('ক্যালেন্ডারে যোগ');
  const href = await link.getAttribute('href');
  expect(href.startsWith('data:text/calendar')).toBe(true);
  expect(decodeURIComponent(href)).toContain('BEGIN:VCALENDAR');
  await expect(link).toHaveAttribute('download', /\.ics$/);
});

test('css/site.css has an @media print rule hiding chrome (nav/ticker/footer/share/tabs/btn)', () => {
  const css = readFileSync(new URL('../../css/site.css', import.meta.url), 'utf8');
  expect(css).toMatch(/@media print\{[^}]*\.nav[^}]*\.ticker[^}]*footer[^}]*\.share[^}]*\.tabs[^}]*\.btn/);
});

test('node scripts/sync-head.mjs --check exits 0 (generated heads/robots/sitemap/manifest are committed and in sync)', () => {
  expect(() => execFileSync('node', ['scripts/sync-head.mjs', '--check'], { cwd: new URL('../..', import.meta.url), stdio: 'pipe' })).not.toThrow();
});
