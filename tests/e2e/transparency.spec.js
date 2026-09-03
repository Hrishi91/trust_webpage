import { test, expect } from '@playwright/test';

// transparency/2025 (published) income = 42000+8000+5000 = 55000, expense = 20000+15000 = 35000,
// balance = 20000. transparency/2024 (published:false) must never appear for an anonymous visitor.
test('2025 is visible with correct totals and a document link (anonymous)', async ({ page }) => {
  await page.goto('/transparency.html');
  await expect(page.locator('.tabs button')).toHaveCount(1);
  await expect(page.locator('.tabs button.active')).toHaveText('২০২৫');
  const summary = page.locator('.summary');
  await expect(summary).toContainText('৫৫,০০০'); // income
  await expect(summary).toContainText('৩৫,০০০'); // expense
  await expect(summary).toContainText('২০,০০০'); // balance
  await expect(page.locator('a', { hasText: 'অডিট ২০২৫' })).toHaveAttribute('href', 'https://example.com/audit-2025.pdf');
});

test('2024 (draft) is absent for anonymous visitors', async ({ page }) => {
  await page.goto('/transparency.html');
  await expect(page.locator('.tabs button', { hasText: '২০২৪' })).toHaveCount(0);
});

test('admin preview (?preview=1) shows the unpublished 2024 year', async ({ page }) => {
  // Own admin login inside this test/context — not the shared 'admin' project — so this file's
  // ordering relative to public.spec.js/admin.spec.js doesn't matter.
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(12);

  await page.goto('/transparency.html?year=2024&preview=1');
  await expect(page.locator('.tabs button.active')).toHaveText('২০২৪');
  const summary = page.locator('.summary');
  await expect(summary).toContainText('৩০,০০০'); // income
  await expect(summary).toContainText('১৮,০০০'); // expense
});
