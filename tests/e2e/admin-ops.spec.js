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
  // Fix round 1 (finding 4): the action word is translated now (admin.log.action.create) — the
  // admin UI's default language is bn (js/i18n.js), so this checks the Bengali label, not the raw
  // 'create' string logAudit() actually writes to Firestore.
  await expect(first).toContainText('তৈরি');
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

test('📜 লগ → ত্রুটি tab shows a client error report, lazily loaded (item 42)', async ({ page }) => {
  // Seeded directly via the emulator's REST API (owner bearer, bypasses rules) rather than
  // triggering a real thrown error — tests/e2e/basics.spec.js's own error-report test already
  // covers js/errors.js's write path end-to-end; this test only needs a known row for the admin
  // viewer to display.
  const BASE = 'http://127.0.0.1:8080/v1/projects/demo-trust/databases/(default)/documents';
  const HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
  const marker = `admin-log-errors-test-${Date.now()}`;
  const createRes = await fetch(`${BASE}/errors`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      fields: {
        message: { stringValue: marker },
        url: { stringValue: 'https://example.com/about.html' },
        ua: { stringValue: 'test-ua' },
        stack: { stringValue: 'at test (about.js:1)' },
        at: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  expect(createRes.ok).toBe(true);

  await login(page);
  await page.goto('/admin/#log');
  // Default pane is অডিট (audit), same as before this task — the ত্রুটি row must not appear
  // until its own tab is clicked (lazy fetch, item 42's own render() comment).
  await expect(page.locator('.log-row', { hasText: marker })).toHaveCount(0);
  await page.click('.log-tabs button:has-text("ত্রুটি")');
  await expect(page.locator('.log-row', { hasText: marker })).toBeVisible();
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

// Fix round 1 (finding 1): donations/members/notices/roster's own custom list panes (not
// forms.js's listView()) gained the same "মুছে ফেলা দেখাও" + "পুনরুদ্ধার" round trip committee/c1
// already proved above — this exercises it on a notice and a member, the two collections whose
// admin list has no public anonymous page to cross-check against, so the round trip is asserted
// entirely against the admin list itself (disappears on delete, shows under "মুছে ফেলা দেখাও",
// reappears in the normal list after Restore).
test('মুছে ফেলা দেখাও + পুনরুদ্ধার — delete→restore round trip on a notice and a member (fix round 1, finding 1)', async ({ page }) => {
  await login(page);

  // notices/n1
  await page.goto('/admin/#notices');
  await page.locator('.list-item', { hasText: 'পুজোর মিটিং' }).locator('a').click();
  await expect(page).toHaveURL(/#notices\/n1$/);
  page.on('dialog', d => d.accept()); // confirm() only — reauth is the in-page <dialog> below
  await page.click('button.danger');
  await page.fill('dialog.reauth input[type=password]', 'password12345');
  await page.click('dialog.reauth button[value=confirm]');
  await expect(page).toHaveURL(/#notices$/);
  await expect(page.locator('.list-item', { hasText: 'পুজোর মিটিং' })).toHaveCount(0);

  await page.check('#adm-main input[type=checkbox]'); // "মুছে ফেলা দেখাও"
  const deletedNotice = page.locator('.list-item', { hasText: 'পুজোর মিটিং' });
  await expect(deletedNotice).toBeVisible();
  await deletedNotice.locator('button.btn-sm').click(); // "পুনরুদ্ধার"
  await expect(page.locator('.toast').last()).toBeVisible();
  await expect(deletedNotice).toHaveCount(0); // gone from the deleted list — restored means deleted:false again
  await page.uncheck('#adm-main input[type=checkbox]');
  await expect(page.locator('.list-item', { hasText: 'পুজোর মিটিং' })).toBeVisible();

  // members/+918888888888
  await page.goto('/admin/#members');
  await page.locator('.list-item', { hasText: 'সদস্য দুই' }).locator('a').click();
  await expect(page).toHaveURL(/#members\/\+918888888888$/);
  await page.click('button.danger');
  await page.fill('dialog.reauth input[type=password]', 'password12345');
  await page.click('dialog.reauth button[value=confirm]');
  await expect(page).toHaveURL(/#members$/);
  await expect(page.locator('.list-item', { hasText: 'সদস্য দুই' })).toHaveCount(0);

  await page.check('#adm-main input[type=checkbox]');
  const deletedMember = page.locator('.list-item', { hasText: 'সদস্য দুই' });
  await expect(deletedMember).toBeVisible();
  await deletedMember.locator('button.btn-sm').click();
  await expect(page.locator('.toast').last()).toBeVisible();
  await expect(deletedMember).toHaveCount(0);
  await page.uncheck('#adm-main input[type=checkbox]');
  await expect(page.locator('.list-item', { hasText: 'সদস্য দুই' })).toBeVisible();
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

// Fix round 1 (finding 2): Confirm is now the dialog's only `type=submit` button (admin/index.html
// / admin.js), so the browser's implicit form submission on Enter always confirms — before this
// fix Cancel (first in DOM) would have "won" instead. Reuses the same committee/c1 delete flow the
// item-35 test above uses, restoring it at the end so every later test still finds c1 intact.
test('re-auth Enter key confirms (not cancels) the dialog (fix round 1, finding 2)', async ({ page }) => {
  await login(page);
  await page.goto('/admin/#committee/c1');
  page.on('dialog', d => d.accept()); // confirm() only
  await page.click('button.danger');
  await page.fill('dialog.reauth input[type=password]', 'password12345');
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page).toHaveURL(/#committee$/); // Enter confirmed the delete, same as clicking Confirm would

  // Restore c1 so the rest of the suite (and this file's own earlier committee assertions, on a
  // re-run) still find it. Asserting the row's own disappearance (not just ".toast" again) matters
  // here: the delete's toast from a moment ago can still be on screen (toast() auto-removes after
  // 3s, js/ui.js), so a bare ".toast" check can pass instantly against that stale element without
  // ever waiting for restoreDoc()'s updateDoc()+re-render to actually land — and a test that ends
  // right after would let Playwright tear the page down mid-write. Waiting for the deleted-view row
  // to disappear can only happen after renderRows() re-queries post-restore, which can only happen
  // after the write actually committed.
  await page.check('.list-toolbar input[type=checkbox]');
  const deletedRow = page.locator('.list-item', { hasText: 'সভাপতি' });
  await expect(deletedRow).toBeVisible();
  await deletedRow.locator('button.btn-sm').click();
  await expect(deletedRow).toHaveCount(0);
  await page.uncheck('.list-toolbar input[type=checkbox]');
  await expect(page.locator('.list-item', { hasText: 'সভাপতি' })).toBeVisible();
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

// Fix round 1 (finding 3): item 38 shipped four `?preview=1` branches (committee.html, events.html,
// index.html's culture card, and the shell-wide announcements ticker) with no e2e coverage at
// all — task-6-report.md's own item 38 evidence was a manual screenshot, not a passing test. Login
// carries the admin's Auth session across the plain page.goto() navigations below (same as the
// item-35 test above, which already relies on this).
test('?preview=1 shows admin-only draft/hidden content on committee, events, and the home page+ticker (fix round 1, finding 3)', async ({ page }) => {
  await login(page);

  await page.goto('/committee.html?preview=1');
  await expect(page.locator('.person', { hasText: 'গোপন' })).toBeVisible(); // committee/c2, isPublic:false

  await page.goto('/events.html?preview=1');
  // toHaveCount, not toBeVisible: events/e2 (start=now at seed time) may have drifted into the
  // "past" <details> accordion by the time this test runs, which collapses it out of view without
  // removing it from the DOM — this only needs to prove the unfiltered query reached it at all.
  await expect(page.locator('.ev', { hasText: 'ড্রাফট' })).toHaveCount(1); // events/e2, published:false

  await page.goto('/index.html?preview=1');
  await expect(page.locator('.ccard', { hasText: 'ড্রাফট' })).toBeVisible(); // culture/cu4, published:false
  await expect(page.locator('.ticker')).toContainText('ড্রাফট ঘোষণা'); // announcements/an4, published:false
});

test('anonymous ?preview=1 request on committee.html shows the error state, never the hidden row (fix round 1, finding 3)', async ({ page }) => {
  // No login(page) here — deliberately anonymous. firestore.rules requires every possibly-matched
  // document in the unfiltered ?preview=1 query to satisfy the read rule; committee/c2 is
  // isPublic:false, so an anonymous reader fails the whole query with permission-denied, same
  // "surfaced as the shared error state, never a hang" contract public.spec.js already proves for
  // about.html's own ?preview=1 branch.
  await page.goto('/committee.html?preview=1');
  await expect(page.locator('#main p.muted')).toHaveText(/কিছু ভুল হয়েছে|Something went wrong/);
  await expect(page.locator('.person', { hasText: 'গোপন' })).toHaveCount(0);
});

// Fix round 1 (finding 5): #adm-help is shared chrome (admin/js/admin.js's route()) whose href
// tracks the current section — asserted here on the dashboard itself (key='' -> '#dashboard').
test('dashboard help link points at the admin guide and opens in a new tab (fix round 1, finding 5)', async ({ page }) => {
  await login(page); // login() already asserts the dashboard's 18 tiles, i.e. we're on it now
  const help = page.locator('#adm-help');
  await expect(help).toHaveAttribute('href', /^https:\/\/github\.com\/Hrishi91\/trust_webpage\/blob\/main\/docs\/user-guide\/admin-guide\.md#dashboard$/);
  await expect(help).toHaveAttribute('target', '_blank');
});
