import { test, expect } from '@playwright/test';
test('stored design reaches <html data-theme> and the ?theme= override wins without persisting', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'siddhi'); // seed: design 'siddhi'
  await page.goto('/index.html?theme=mukha');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mukha');
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
  await expect(page.locator('.grid .tile')).toHaveCount(13);
  await page.goto('/admin/#design');
  await expect(page.locator('.theme-tile')).toHaveCount(5);
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
  page.on('dialog', d => d.accept('password12345'));
  await page.click('.theme-tile[data-theme-name="atreyee"] button.apply');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'atreyee');
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atreyee');
  // restore for the other specs (theme.spec runs inside the 'public' project before 'admin')
  await page.goto('/admin/#design');
  await page.click('.theme-tile[data-theme-name="siddhi"] button.apply');
  await expect(page.locator('.theme-tile.current')).toHaveAttribute('data-theme-name', 'siddhi');
});
