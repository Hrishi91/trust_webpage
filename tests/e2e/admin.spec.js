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
  await expect(page.locator('.grid .tile')).toHaveCount(8);
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
  await expect(page.locator('.event h3', { hasText: 'ই২ই অনুষ্ঠান' })).toBeVisible();
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
