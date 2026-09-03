import { test, expect } from '@playwright/test';

// Seed (tests/seed/seed.js) has 4 donations: d1/d2/d4 have showOnWall:true (d4 isAnonymous:true),
// d3 has showOnWall:false — so the public wall shows exactly 3 rows, one of them anonymous, and
// d3's donor name never renders. (The plan's Step 1 wording says "2 visible rows" — the actual
// committed seed has 3; this asserts the real seeded count, not a stale plan figure.)
test('donor wall shows exactly the visible seeded rows, anonymous label used, hidden row absent', async ({ page }) => {
  await page.goto('/donate.html');
  await expect(page.locator('.donor')).toHaveCount(3);
  await expect(page.locator('.donor', { hasText: 'নাম প্রকাশে অনিচ্ছুক' })).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText('গোপন দাতা'); // d3's donor name — showOnWall:false
});

test('WhatsApp confirm message is pre-filled with the encoded amount', async ({ page }) => {
  // window.open (not a real <a href>) carries the wa.me link, so it's captured via an override
  // rather than read off a DOM attribute — a real popup would try to hit the network for wa.me,
  // which the emulator/offline test harness has no route to.
  await page.addInitScript(() => { window.__openedUrl = null; window.open = url => { window.__openedUrl = url; return null; }; });
  await page.goto('/donate.html');
  await page.fill('input[placeholder="পরিমাণ (₹)"]', '777');
  await page.click('button:has-text("WhatsApp-এ জানান")');
  const url = await page.evaluate(() => window.__openedUrl);
  expect(url).toContain('https://wa.me/919800000000?text=');
  expect(url).toContain(encodeURIComponent('₹777')); // donate.confirmMsg's {amount} substitution
});
