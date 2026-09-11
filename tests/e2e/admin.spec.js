// Order matters: the soft-delete test below mutates seed data (history/h1 -> deleted: true).
// playwright.config.js sets workers: 1 so specs run serially, one at a time, never in parallel
// workers — otherwise this test could race the public-page draft-isolation checks. Before each
// `npm run e2e` run, `npm run seed` must be re-run: seed.js uses `.set()`, which restores h1 to
// its original (non-deleted, published) state.
import { test, expect } from '@playwright/test';
async function login(page) {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(16);
}
test('wrong password fails', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'wrongwrongwrong');
  await page.click('button[type=submit]');
  // The admin app's language defaults to bn (js/i18n.js has no browser-language detection and this
  // is a fresh context with no localStorage 'lang'), so the rendered error is the bn string, not
  // the English "Login failed." from the brief.
  await expect(page.locator('#adm-login-err')).toContainText('লগইন হয়নি');
});
test('create + publish an event, it appears publicly', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#events/new');
  await page.fill('input[name="title.bn"]', 'ই২ই অনুষ্ঠান');
  await page.fill('input[name="title.en"]', 'E2E event');
  const soon = new Date(Date.now() + 2 * 86400000); soon.setSeconds(0, 0);
  await page.fill('input[name=start]', new Date(soon.getTime() - soon.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  // Scoped to #adm-main: the login form's own (hidden but still-present) submit button also
  // matches a bare 'button[type=submit]', and page.click() is not strict-mode, so it silently
  // clicks whichever DOM-order-first match it finds — the always-hidden login button — and then
  // waits forever for it to become visible. #adm-login sits outside #adm-main, so scoping here
  // leaves exactly one match: the event form's publish button.
  await page.click('#adm-main button[type=submit]');   // publish
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/events.html');
  await expect(page.locator('.ev b', { hasText: 'ই২ই অনুষ্ঠান' })).toBeVisible();
});
test('soft delete asks confirm + reauth and hides the row', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#history/h1');
  page.on('dialog', d => d.type() === 'confirm' ? d.accept() : d.accept('password12345'));
  await page.click('button.danger');
  await expect(page).toHaveURL(/#history$/);
  await page.goto('/about.html');
  await expect(page.locator('article')).toHaveCount(0);
  // The About page hiding the row is also what a hard delete would produce — assert the
  // underlying write directly against the Firestore emulator's REST API so a regression from
  // updateDoc({deleted:true}) to deleteDoc() (which would still make the row disappear
  // publicly) fails this test instead of passing it silently.
  const res = await fetch('http://127.0.0.1:8080/v1/projects/demo-trust/databases/(default)/documents/history/h1', { headers: { Authorization: 'Bearer owner' } });
  expect(res.status).toBe(200);                       // doc still exists — not hard-deleted
  const body = await res.json();
  expect(body.fields.deleted.booleanValue).toBe(true); // soft-deleted
});
test('admin panel follows the stored theme and uses the site fonts', async ({ page }) => {
  await login(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi');
  expect(await page.locator('.adm-top').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(15, 18, 48)');
  const tiles = page.locator('.grid .tile');
  const count = await tiles.count();
  for (let i = 0; i < count; i++) {
    const box = await tiles.nth(i).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.goto('/admin/#design');
  page.on('dialog', d => d.accept('password12345'));
  await page.click('.theme-tile[data-theme-name="atreyee"] button.apply');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atreyee');
  await page.click('.theme-tile[data-theme-name="siddhi"] button.apply');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi');
});
test('✏️ লেখা — override a string, see it publicly, then reset it', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#strings');
  await page.waitForSelector('input[name="nav.home.bn"]');
  await page.fill('input[name="nav.home.bn"]', 'শুরু');
  page.on('dialog', d => d.accept('password12345'));
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  await expect(page.locator('.links a').first()).toHaveText('শুরু');
  await page.goto('/admin/#strings');
  await page.waitForSelector('input[name="nav.home.bn"]');
  await page.click('.str-row:has(input[name="nav.home.bn"]) .btn-sm');
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  await expect(page.locator('.links a').first()).toHaveText('হোম');
});
test('✏️ লেখা — search filters rows by key', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#strings');
  await page.waitForSelector('input[name="nav.home.bn"]');
  await page.fill('input[type=search]', 'nav.donate');
  await expect(page.locator('.str-row:visible')).toHaveCount(1);
});
test('🏺 সংস্কৃতি — publish a card, it appears on home', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#culture/new');
  await page.fill('input[name="title.bn"]', 'ই২ই কার্ড');
  await page.fill('input[name="title.en"]', 'E2E card');
  await page.click('#adm-main button[type=submit]'); // publish
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  await expect(page.locator('.ccard')).toHaveCount(4);
  await expect(page.locator('.ccard', { hasText: 'ই২ই কার্ড' })).toBeVisible();
});
// The Storage emulator (unlike production Storage) only ever serves http://127.0.0.1:9199/...
// download URLs — never https. js/media-slots.js's httpsUrl() guard (spec §4: every
// admin-controlled URL passes httpsUrl() before it is set as src/href) rejects any non-https
// scheme by design, so a real emulator upload can never itself render as the public hero photo
// in this test environment. The write path (real resize + Storage upload + Firestore save) is
// still verified end-to-end via the emulator's REST API; the *rendering* assertion instead checks
// that the security gate does its job — the drawn-art fallback stays up rather than an http:// url
// ever reaching an <img src>.
async function mediaField(field) {
  const res = await fetch('http://127.0.0.1:8080/v1/projects/demo-trust/databases/(default)/documents/content/media', { headers: { Authorization: 'Bearer owner' } });
  const body = await res.json();
  return body.fields?.[field]?.stringValue;
}
test('🖼️ UI ছবি — upload the hero image, the httpsUrl() gate keeps drawn art up, then remove it', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#media');
  const heroCard = page.locator('.slot-card[data-slot="hero"]');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAk+Uzr4AAAAASUVORK5CYII=', 'base64');
  await heroCard.locator('input[type=file]').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: png });
  await expect(heroCard.locator('img.thumb')).toBeVisible();
  page.on('dialog', d => d.accept('password12345')); // reauth prompt on save
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  expect(await mediaField('hero')).toMatch(/^http:\/\/127\.0\.0\.1:9199\//); // real Storage round-trip landed in Firestore
  await page.goto('/index.html');
  await expect(page.locator('.hero svg.ganesh')).toBeVisible(); // non-https url never reaches an <img src>
  await expect(page.locator('.hero.photo')).toHaveCount(0);
  await page.goto('/admin/#media');
  await page.locator('.slot-card[data-slot="hero"] .btn-sm.secondary').click();
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  expect(await mediaField('hero')).toBeUndefined();
  await page.goto('/index.html');
  await expect(page.locator('.hero svg.ganesh')).toBeVisible();
});
