import { test, expect } from '@playwright/test';

// Phase 7 Task 1 — pages & legal (audit items 1-9). Seed (tests/seed/seed.js) gives:
// committee/c1 isPublic+officer (trust.html's trustee fallback), transparency/2025 published
// with one document (downloads.html), announcements an1/an2/an3 all published (news.html
// archive — 3, unlike the home ticker which also shows 3 but would cap at 5 regardless).

test('every new public page loads with a real heading', async ({ page }) => {
  for (const [path, h1] of [
    ['/privacy.html', 'গোপনীয়তা ও শর্তাবলী'],
    ['/trust.html', 'ট্রাস্ট সম্পর্কে'],
    ['/contact.html', 'যোগাযোগ'],
    ['/faq.html', 'সচরাচর জিজ্ঞাসা'],
    ['/news.html', 'খবর ও ঘোষণা'],
    ['/downloads.html', 'ডাউনলোড'],
  ]) {
    const res = await page.goto(path);
    expect(res.status(), path).toBe(200);
    await expect(page.locator('.ph h1'), path).toHaveText(h1);
  }
});

test('footer on the home page links to every new page', async ({ page }) => {
  await page.goto('/index.html');
  for (const href of ['privacy.html', 'trust.html', 'contact.html', 'faq.html', 'news.html', 'downloads.html']) {
    await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
  }
});

test('privacy page has a #refund section with the refund policy', async ({ page }) => {
  await page.goto('/privacy.html');
  const refund = page.locator('#refund');
  await expect(refund).toBeVisible();
  await expect(refund).toContainText('৭ দিনের মধ্যে');
});

test('donate page: refund link above the confirm form, and an on-site thank-you after submit', async ({ page }) => {
  await page.addInitScript(() => { window.__openedUrl = null; window.open = url => { window.__openedUrl = url; return null; }; });
  await page.goto('/donate.html');
  // .card is unique on donate.html: the confirm card (upiCard renders .upibig/.notice, the donor
  // wall renders .form.wall-card — a different class token from .card).
  const card = page.locator('.card');
  const refundLink = card.locator('a[href="privacy.html#refund"]');
  await expect(refundLink).toBeVisible();
  // the link sits above the confirm form/heading within the same card
  const linkBox = await refundLink.boundingBox();
  const formBox = await card.locator('form').boundingBox();
  expect(linkBox.y).toBeLessThan(formBox.y);

  await page.fill('input[placeholder="পরিমাণ (₹)"]', '501');
  await page.click('button:has-text("WhatsApp-এ জানান")');
  const url = await page.evaluate(() => window.__openedUrl);
  expect(url).toContain('https://wa.me/919800000000?text=');
  await expect(card.locator('h2')).toHaveText('ধন্যবাদ!');
  await expect(card).toContainText('আপনার বার্তা WhatsApp-এ পাঠানো হয়েছে');
  // "আবার" brings the form back
  await card.locator('button:has-text("আবার")').click();
  await expect(card.locator('h2')).toHaveText('WhatsApp-এ জানান');
});

test('trust page lists a named trustee (falls back to committee officers)', async ({ page }) => {
  await page.goto('/trust.html');
  await expect(page.locator('.wall div')).toHaveCount(1);
  await expect(page.locator('.wall')).toContainText('সভাপতি');
});

test('contact page shows tel/WhatsApp/email and pre-fills wa.me from the message field', async ({ page }) => {
  await page.addInitScript(() => { window.__openedUrl = null; window.open = url => { window.__openedUrl = url; return null; }; });
  await page.goto('/contact.html');
  await expect(page.locator('a[href^="https://wa.me/919800000000"]')).toBeVisible();
  await page.fill('textarea', 'আমার একটা প্রশ্ন আছে');
  await page.click('button:has-text("WhatsApp-এ পাঠান")');
  const url = await page.evaluate(() => window.__openedUrl);
  expect(url).toContain('https://wa.me/919800000000?text=');
  expect(decodeURIComponent(url.split('text=')[1])).toContain('আমার একটা প্রশ্ন আছে');
});

test('downloads page lists every published transparency document', async ({ page }) => {
  await page.goto('/downloads.html');
  await expect(page.locator('.donor')).toHaveCount(1);
  await expect(page.locator('.donor')).toContainText('অডিট ২০২৫');
});

test('news page lists announcements past the home ticker, newest first', async ({ page }) => {
  await page.goto('/news.html');
  await expect(page.locator('.acc .card')).toHaveCount(3);
  await expect(page.locator('.acc .card').first()).toContainText('এখন লাইভ: সন্ধ্যা আরতি'); // an2 has the highest `order`
});

test('/404.html renders the shell with a home link', async ({ page }) => {
  const res = await page.goto('/404.html');
  expect(res.status()).toBe(200);
  await expect(page.locator('.nav .brand')).toBeVisible();
  await expect(page.locator('.ph h1')).toHaveText('পাতাটি পাওয়া যায়নি');
  await expect(page.locator('a[href="index.html"]', { hasText: 'হোমে ফিরুন' })).toBeVisible();
});
