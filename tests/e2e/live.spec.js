import { test, expect } from '@playwright/test';

// announcements/an1 (pinned:true) sorts before an2 (isLive:true, not pinned) despite a lower
// `order`; an3 is expired (expiresAt in the past) and must never render.
test('home shows the pinned announcement first and the live badge', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.live-strip .pulse')).toHaveText('🔴 লাইভ');
  await expect(page.locator('.live-strip .ann').first()).toContainText('স্বাগতম');
  await expect(page.locator('.live-strip')).not.toContainText('গতকালের ঘোষণা'); // an3, expired
});

test('admin posting a new announcement appears on the public home page without reload', async ({ browser }) => {
  // Two independent contexts in one test: a public visitor left open and polled, and an admin
  // session posting a new announcement — home.js's onAnnouncements() is a live onSnapshot
  // listener, so the public page must pick this up on its own, no page.reload() involved.
  const pubCtx = await browser.newContext();
  const pubPage = await pubCtx.newPage();
  await pubPage.goto('/index.html');
  await expect(pubPage.locator('.live-strip')).toBeVisible();

  const admCtx = await browser.newContext();
  const admPage = await admCtx.newPage();
  await admPage.goto('/admin/');
  await admPage.fill('input[name=email]', 'admin@example.com');
  await admPage.fill('input[name=password]', 'password12345');
  await admPage.click('button[type=submit]');
  await expect(admPage.locator('.grid .tile')).toHaveCount(12);
  await admPage.goto('/admin/#announcements');
  await admPage.fill('textarea[name="text.bn"]', 'ই২ই লাইভ ঘোষণা');
  await admPage.fill('textarea[name="text.en"]', 'E2E live announcement');
  await admPage.click('#adm-main button[type=submit]');
  await expect(admPage.locator('.toast')).toBeVisible();

  await expect.poll(() => pubPage.locator('.live-strip .ann', { hasText: 'ই২ই লাইভ ঘোষণা' }).count()).toBe(1);

  await pubCtx.close();
  await admCtx.close();
});
