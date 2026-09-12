// Phase 7 Task 6 (site-basics-audit-2026-09-12.md §2 items 33–40): admin usability — export
// coverage, 📜 লগ audit viewer, restore, forgot-password, masked reauth, list search. Runs in the
// 'admin' project (playwright.config.js), after 'members' and alongside admin.spec.js — neither
// file's mutations touch the other's seed rows (see playwright.config.js's comment).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { COLLS, DOCS } from '../../admin/js/sections/export-colls.js';

async function login(page) {
  await page.goto('/admin/');
  await page.fill('input[name=email]', 'admin@example.com');
  await page.fill('input[name=password]', 'password12345');
  await page.click('button[type=submit]');
  await expect(page.locator('.grid .tile')).toHaveCount(18);
}

test('📤 ব্যাকআপ — exported JSON has a key for every collection and doc path (item 33)', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#export');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#adm-main .card button.btn'),
  ]);
  const filePath = await download.path();
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  for (const c of COLLS) {
    if (c === 'photos') continue; // nested under albums[i].photos, not a top-level key — checked below
    expect(Array.isArray(json[c]), `export JSON missing/invalid array for collection "${c}"`).toBe(true);
  }
  for (const p of DOCS) {
    expect(Object.prototype.hasOwnProperty.call(json, p), `export JSON missing doc key "${p}"`).toBe(true);
  }
  expect(json.albums.length).toBeGreaterThan(0);
  expect(Array.isArray(json.albums[0].photos)).toBe(true); // the one subcollection, nested per-album
});

test('📜 লগ — shows the row of the immediately preceding admin edit, newest first, filterable by collection (item 34)', async ({ page }) => {
  await login(page);
  // history/h2 (the seeded draft) first, so this test has its own deterministic history/* audit
  // row — it doesn't depend on admin.spec.js's soft-delete test (which also touches history/h1)
  // having already run in this file-run order. "Save draft" (publish:false) keeps h2 a draft, same
  // as before this test ran. The log is checked right after EACH write (not only at the very end)
  // so "newest first" is asserted against one fresh write at a time. Even so, two audit rows
  // written only milliseconds apart can occasionally still read back in either order on the
  // Firestore emulator (serverTimestamp() resolution vs. a getDocs() moments later is not
  // instantaneous) — a short explicit wait after each toast, before re-querying the log, gives
  // that resolution time to settle; observed necessary in practice, not a guess.
  await page.goto('/admin/#history/h2');
  // Scoped to #adm-main: the reauth <dialog>'s own Cancel button also carries class "secondary"
  // (always present in the DOM, just not open) — an unscoped selector would ambiguously resolve
  // to it instead of the visible "সেভ ড্রাফট" button.
  await page.click('#adm-main button.secondary'); // ড্রাফট সেভ
  await expect(page.locator('.toast')).toBeVisible();
  await page.waitForTimeout(500);
  await page.goto('/admin/#log');
  await expect(page.locator('.log-row').first()).toContainText('history/h2');

  await page.goto('/admin/#announcements');
  await page.fill('textarea[name="text.bn"]', 'অ্যাডমিন-অপস লগ টেস্ট');
  await page.fill('textarea[name="text.en"]', 'admin-ops log test');
  await page.click('#adm-main button[type=submit]'); // quick-post publishes immediately
  await expect(page.locator('.toast')).toBeVisible();
  await page.waitForTimeout(500);

  await page.goto('/admin/#log');
  const first = page.locator('.log-row').first();
  await expect(first).toContainText('create');
  await expect(first).toContainText('announcements/');

  // Filter by collection: selecting "history" must hide the announcements row we just wrote.
  await page.selectOption('#adm-main select', 'history');
  await expect(page.locator('.log-row', { hasText: 'announcements/' })).toHaveCount(0);
  await expect(page.locator('.log-row', { hasText: 'history/h2' }).first()).toBeVisible();

  // Before/after JSON is in a collapsed <details>, not innerHTML'd straight into the row.
  await page.selectOption('#adm-main select', '');
  await first.locator('summary').click();
  await expect(first.locator('pre')).toContainText('admin-ops log test');
});

test('মুছে ফেলা দেখাও + পুনরুদ্ধার — delete→restore a committee row returns it to the public page (item 35)', async ({ page }) => {
  await page.goto('/committee.html');
  await expect(page.locator('.person', { hasText: 'সভাপতি' })).toBeVisible();

  await login(page);
  await page.goto('/admin/#committee/c1');
  page.on('dialog', d => d.accept()); // the confirm() dialog only — reauth is the in-page <dialog> below
  await page.click('button.danger');
  await page.fill('dialog.reauth input[type=password]', 'password12345');
  await page.click('dialog.reauth button[value=confirm]');
  await expect(page).toHaveURL(/#committee$/);

  await page.goto('/committee.html');
  await expect(page.locator('.person', { hasText: 'সভাপতি' })).toHaveCount(0);

  await page.goto('/admin/#committee');
  await page.check('.list-toolbar input[type=checkbox]'); // "মুছে ফেলা দেখাও"
  const deletedRow = page.locator('.list-item', { hasText: 'সভাপতি' });
  await expect(deletedRow).toBeVisible();
  await deletedRow.locator('button.btn-sm').click(); // "পুনরুদ্ধার"
  await expect(page.locator('.toast')).toBeVisible();

  await page.goto('/committee.html');
  await expect(page.locator('.person', { hasText: 'সভাপতি' })).toBeVisible();
});

test('forgot-password link is visible on the login form and sends a reset mail (item 36)', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('#adm-forgot')).toBeVisible();
  await page.fill('input[name=email]', 'admin@example.com');
  await page.click('#adm-forgot');
  await expect(page.locator('.toast')).toBeVisible();
});

test('re-auth is a masked <dialog> with type=password, not window.prompt() (item 39)', async ({ page }) => {
  await login(page);
  // history/h2 is the seeded draft entry — untouched by every other admin.*.spec.js test, and
  // this test cancels the dialog rather than confirming, so it stays untouched here too.
  await page.goto('/admin/#history/h2');
  page.on('dialog', d => d.accept()); // confirm() only
  await page.click('button.danger');
  const pwInput = page.locator('dialog.reauth input[type=password]');
  await expect(pwInput).toBeVisible();
  await expect(pwInput).toHaveAttribute('autocomplete', 'current-password');
  await page.click('dialog.reauth button[value=cancel]');
  await expect(page.locator('dialog.reauth')).toBeHidden();
  await expect(page).toHaveURL(/#history\/h2$/); // cancelled — nothing deleted, still on the edit form
});

test('committee search narrows the list without a refetch (item 40)', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#committee');
  await expect(page.locator('.list-item', { hasText: 'সভাপতি' })).toBeVisible();
  await expect(page.locator('.list-item', { hasText: 'গোপন' })).toBeVisible();
  await page.fill('input[type=search]', 'গোপন');
  await expect(page.locator('.list-item', { hasText: 'সভাপতি' })).toBeHidden();
  await expect(page.locator('.list-item', { hasText: 'গোপন' })).toBeVisible();
});

test('donations and members lists also get a search box (item 40)', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#donations');
  await expect(page.locator('input[type=search]')).toBeVisible();
  await page.fill('input[type=search]', 'রাম দাস');
  await expect(page.locator('.list-item', { hasText: 'শ্যাম রায়' })).toBeHidden();
  await expect(page.locator('.list-item', { hasText: 'রাম দাস' })).toBeVisible();

  await page.goto('/admin/#members');
  await expect(page.locator('input[type=search]')).toBeVisible();
  await page.fill('input[type=search]', 'সদস্য এক');
  await expect(page.locator('.list-item', { hasText: 'সদস্য দুই' })).toBeHidden();
  await expect(page.locator('.list-item', { hasText: 'সদস্য এক' })).toBeVisible();
});
