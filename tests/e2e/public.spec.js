import { test, expect } from '@playwright/test';
test('home shows name, countdown, hero art, next event tile, latest album', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.brand')).toContainText('গণেশ পুজো ট্রাস্ট');
  await expect(page.locator('.countdown b').first()).toHaveText(/[০-৯]+/);
  await expect(page.locator('.hero svg.ganesh')).toBeVisible();
  const painted = await page.locator('canvas#heroBg').evaluate(c => c.width > 0 && c.height > 0);
  expect(painted).toBe(true);
  await expect(page.locator('.bento .tile b').nth(1)).toHaveText('আগামী');       // next event
  await expect(page.locator('a[href^="gallery.html?album=a1"]')).toBeVisible();
  await expect(page.locator('.donate .upi code')).toHaveText('trust@upi');
});
test('language toggle switches to English and persists', async ({ page }) => {
  await page.goto('/index.html');
  await page.click('.lang');
  await expect(page.locator('.brand')).toContainText('Ganesh Puja Trust');
  await page.goto('/events.html');
  await expect(page.locator('.ph h1')).toHaveText('Upcoming events');
});
test('drafts and hidden rows never render publicly', async ({ page }) => {
  await page.goto('/about.html');  await expect(page.locator('article')).toHaveCount(1);
  await page.goto('/events.html'); await expect(page.locator('.ev')).toHaveCount(1);
  await page.goto('/gallery.html'); await expect(page.locator('.albums a')).toHaveCount(1);
  await page.goto('/committee.html'); await expect(page.locator('.person')).toHaveCount(1);
  await page.goto('/committee.html'); await expect(page.locator('.officers .officer, .mgrid .mrow')).toHaveCount(1);
  await page.goto('/gallery.html?album=a2'); await expect(page.locator('h1')).toHaveCount(0);
});
test('no horizontal overflow on mobile', async ({ page }) => {
  for (const p of ['index', 'about', 'committee', 'gallery', 'events']) {
    await page.goto(`/${p}.html`);
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(w, p).toBeLessThanOrEqual(0);
  }
});
// about.js's ?preview mode runs an unfiltered (no `published` filter) Firestore query so admins can
// see drafts. Firestore security rules require every possibly-matched document in a list query to
// satisfy the read rule; since history/h2 is unpublished, an anonymous (non-admin) reader fails the
// whole query with permission-denied. The page must surface that as the shared error state, not
// hang on the '…' loader.
test('anonymous preview request shows the error state, not the loader', async ({ page }) => {
  await page.goto('/about.html?preview=1');
  // Scoped to #main: the site footer also renders a p.muted (the copyright line), so an
  // unscoped 'p.muted' locator is ambiguous (strict-mode violation) once the shell has mounted.
  await expect(page.locator('#main p.muted')).toHaveText(/কিছু ভুল হয়েছে|Something went wrong/);
  await expect(page.locator('#main p.muted')).not.toHaveText('…');
});
