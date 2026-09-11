import { test, expect } from '@playwright/test';

// Phase 6 ("nothing static"): overrides live in content/strings, content/media, and
// settings/site.{designOverrides,homeSections}. Each test writes directly against the running
// Firestore emulator's REST API as the reserved 'owner' bearer token (bypasses security rules —
// same pattern as tests/e2e/theme.spec.js's audit-row read and admin.spec.js's soft-delete read),
// reloads the public page to see the override rendered, then restores the seeded default in a
// `finally` so later specs (and re-runs of this file) see the same starting state every time.
const BASE = "http://127.0.0.1:8080/v1/projects/demo-trust/databases/(default)/documents";
const HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

/** Full-document PATCH (no updateMask): Firestore's PATCH-without-mask replaces every field, so
 * this is exactly a `set()` for the two small always-a-plain-map content docs. */
async function setDoc(path, fields) {
  const res = await fetch(`${BASE}/${path}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}: ${await res.text()}`);
}

/** Merge-PATCH just the named top-level fields of settings/site, leaving every other seeded
 * field (name, contacts, upiId, …) untouched — a full-document overwrite would need to restate
 * the whole settings doc for every test. */
async function patchSettings(fields) {
  const qs = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const res = await fetch(`${BASE}/settings/site?${qs}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`PATCH settings/site -> ${res.status}: ${await res.text()}`);
}

const sv = s => ({ stringValue: s });
const bv = b => ({ booleanValue: b });
const mv = fields => ({ mapValue: { fields } });
const av = values => ({ arrayValue: { values } });
const bnEn = (bn, en) => mv({ bn: sv(bn), en: sv(en) });

test('content/strings override replaces the default nav label', async ({ page }) => {
  try {
    await setDoc('content/strings', { 'nav.home': bnEn('শুরু', 'Start') });
    await page.goto('/index.html');
    await expect(page.locator('.nav .links a').first()).toHaveText('শুরু');
  } finally {
    await setDoc('content/strings', {});
  }
});

test('content/media hero slot switches the hero into photo mode', async ({ page }) => {
  try {
    await setDoc('content/media', { hero: sv('https://placehold.co/600x600') });
    await page.goto('/index.html');
    await expect(page.locator('.hero.photo .art img')).toBeVisible();
    await expect(page.locator('svg.ganesh')).toHaveCount(0);
  } finally {
    await setDoc('content/media', {});
  }
});

test('settings.homeSections can turn a section off', async ({ page }) => {
  try {
    await patchSettings({ homeSections: av([mv({ key: sv('culture'), on: bv(false) })]) });
    await page.goto('/index.html');
    await expect(page.locator('.culture')).toHaveCount(0);
  } finally {
    await patchSettings({ homeSections: av([]) });
  }
});

test('settings.designOverrides.sindoor becomes a computed custom property on <html>', async ({ page }) => {
  try {
    await patchSettings({ designOverrides: mv({ sindoor: sv('#112233') }) });
    await page.goto('/index.html');
    // A one-shot page.evaluate() races mountShell()'s own async settings fetch — unlike Playwright's
    // locator-based assertions (toHaveText/toBeVisible/…), it does not auto-retry, so it can read
    // the DOM a beat before applyOverrides() has run. toHaveCSS polls until it matches (or times
    // out), which is what every other assertion in this file gets for free via locators.
    await expect(page.locator('html')).toHaveCSS('--sindoor', '#112233');
  } finally {
    await patchSettings({ designOverrides: mv({}) });
  }
});

test('culture cards render from the seeded culture collection (published only)', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.ccard')).toHaveCount(3); // cu1-cu3 published, cu4 draft excluded
  // " (seed)" suffix (tests/seed/seed.js) proves this came from Firestore, not js/pages/home.js's
  // identical-looking CULTURE[0] fallback that renders when the collection is empty.
  await expect(page.locator('.ccard h3').first()).toHaveText('কাঠের মুখা (seed)');
});
