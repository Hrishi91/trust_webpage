import { test, expect } from '@playwright/test';
test('stored design reaches <html data-theme> and the ?theme= override wins without persisting', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi'); // seed: design 'siddhi'
  await page.goto('/index.html?theme=mukha');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mukha');
  expect(await page.evaluate(() => localStorage.getItem('design'))).toBe('siddhi'); // preview must not persist
  await page.goto('/about.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi'); // preview did not persist
});
test('shell: sticky nav with brand, ticker with the seeded live announcement, 4-column footer', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('.nav .brand')).toContainText('গণেশ পুজো ট্রাস্ট');
  await expect(page.locator('.live-strip .pulse')).toHaveText('🔴 লাইভ');
  await expect(page.locator('footer .wrap > div')).toHaveCount(4);
});
// The about page still renders its own <h1> directly into #main (js/pages/about.js is Task 8's
// job); this assertion is split out so it can fail alone until Task 8 switches that page to
// shell.js's pageHeader(). See task-5-report.md.
test('about page uses the shared page header', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('.ph h1')).toHaveText('ইতিহাস');
});
test('admin applies a theme from the 🎨 card; the public site reflects it; audit row written', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(17);
  await page.goto('/admin/#design');
  await expect(page.locator('.theme-tile')).toHaveCount(5);
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
  page.on('dialog', d => d.accept('password12345'));
  await page.click('.theme-tile[data-theme-name="atreyee"] button.apply');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'atreyee');
  // logAudit(ctx, 'update', 'settings/site', {design: cur}, {design: 'atreyee'}) (admin/js/sections/
  // design.js) — assert the emulator actually persisted an audit row, same REST-read pattern as
  // admin.spec.js's soft-delete test.
  const auditRes = await fetch('http://127.0.0.1:8080/v1/projects/demo-trust/databases/(default)/documents/audit', { headers: { Authorization: 'Bearer owner' } });
  expect(auditRes.status).toBe(200);
  const auditBody = await auditRes.json();
  const wrote = (auditBody.documents ?? []).some(d =>
    d.fields?.path?.stringValue === 'settings/site' && d.fields?.after?.mapValue?.fields?.design?.stringValue === 'atreyee');
  expect(wrote).toBe(true);
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atreyee');
  // restore for the other specs (theme.spec runs inside the 'public' project before 'admin')
  await page.goto('/admin/#design');
  await page.click('.theme-tile[data-theme-name="siddhi"] button.apply');
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
});
// Phase 6 Task 6: 🎨 ডিজাইন colour override — one row's hex text input round-trips to the public
// site's inline <html> custom property, then "থিমের রং-এ ফেরাও" removes it back to the theme's
// own value (siddhi's --sindoor, from css/tokens.css). Runs after the theme-apply test above so
// the active theme is back to 'siddhi' by the time this asserts the reset value.
test('🎨 colour override — sindoor hex reaches <html> on the public site, then resets to the theme value', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(17);
  page.on('dialog', d => d.accept('password12345'));
  await page.goto('/admin/#design');
  const sindoorText = page.locator('.colour-row[data-key="sindoor"] input[type=text]');
  await sindoorText.fill('#112233');
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  expect((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sindoor'))).trim()).toBe('#112233');
  await page.goto('/admin/#design');
  await page.click('.colour-row[data-key="sindoor"] button.btn-sm.secondary');
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  expect((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sindoor'))).trim()).toBe('#c9361a');
});
// Phase 6 Task 6: হোম-এর section — toggling a section's checkbox off and saving actually removes
// it from the rendered home page; toggling it back on restores it (js/sections.js's orderSections()
// is unit-tested separately — this is the admin-write + public-render round trip).
test('🎨 home sections — turning off "culture" hides it on the home page; turning it back on restores it', async ({ page }) => {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(17);
  page.on('dialog', d => d.accept('password12345'));
  await page.goto('/admin/#design');
  await page.uncheck('input[name="sec.culture"]');
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  await expect(page.locator('.culture')).toHaveCount(0);
  await page.goto('/admin/#design');
  await page.check('input[name="sec.culture"]');
  await page.click('.savebar button.btn');
  await expect(page.locator('.toast')).toBeVisible();
  await page.goto('/index.html');
  await expect(page.locator('.culture')).toHaveCount(1);
});
