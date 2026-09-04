import { test, expect } from '@playwright/test';

// Signs in via the Auth emulator's phone OTP flow (production test number / Auth emulator config
// don't matter locally — the emulator hands out a real code for ANY phone via this endpoint). Any
// phone number works even if no Auth user was pre-created for it: phone auth auto-creates one on
// first sign-in, same as production.
async function signInByPhone(page, phone) {
  await page.goto('/members.html');
  await page.fill('input[type=tel]', phone);
  await page.click('button:has-text("OTP পাঠান")');
  await expect(page.locator('input[inputmode=numeric]')).toBeVisible();
  const res = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-trust/verificationCodes');
  const { verificationCodes } = await res.json();
  const match = verificationCodes.filter(c => c.phoneNumber === phone).pop();
  await page.fill('input[inputmode=numeric]', match.code);
  await page.click('button:has-text("যাচাই করুন")');
}

// See docs/PROJECT_CONTEXT.md "State as of 2026-09-04" and task-13-report.md for the investigation
// into task-12's reported "session torn down ~1s after sign-in" concern: not reproducible against
// the committed js/pages/members.js (which already clears the RecaptchaVerifier and guards stale
// onAuthStateChanged invocations) — verified here with a real, unskipped reload assertion below.
test('OTP sign-in shows the member card, notices, and duty roster', async ({ page }) => {
  await signInByPhone(page, '+919999999999');
  await expect(page.locator('.card h2')).toHaveText('সদস্য এক');
  const stat = page.locator('.stats .stat b');
  await expect(stat.nth(0)).toHaveText('₹৫,০০০'); // pledge
  await expect(stat.nth(1)).toHaveText('₹৩,৫০০'); // paid (2000+1500)
  await expect(stat.nth(2)).toHaveText('₹১,৫০০'); // due
  await expect(page.locator('main')).toContainText('পুজোর মিটিং'); // notices/n1
  await expect(page.locator('main')).toContainText('গেট ডিউটি');   // roster/r1 (memberPhones has this phone)
});

test('inactive member sees empty notices and duties, but their own pledge/balance', async ({ page }) => {
  await signInByPhone(page, '+917777777777'); // members/+917777777777, active:false
  await expect(page.locator('.card h2')).toHaveText('সদস্য তিন');
  await expect(page.locator('.stats .stat b').first()).toHaveText('₹১,০০০'); // pledge
  // Rules gate notices/roster reads to activeMember(); getMyMember() itself isn't — the doc still
  // loads, but content.js's list calls catch the permission-denied and return []. Member Three
  // also has payments:[] in the seed, so the empty state renders 3 times here (payments, notices,
  // duties), not 2.
  await expect(page.locator('main').locator('p.muted', { hasText: 'এখনও কিছু নেই' })).toHaveCount(3);
});

test('a phone with no members doc sees the not-a-member message', async ({ page }) => {
  await signInByPhone(page, '+911234567890');
  await expect(page.locator('main')).toContainText('এই নম্বর সদস্য তালিকায় নেই');
});

test('reload after sign-in keeps the session (investigation: not reproducible, see task-13-report.md)', async ({ page }) => {
  await signInByPhone(page, '+919999999999');
  await expect(page.locator('.card h2')).toHaveText('সদস্য এক');
  await page.reload();
  await expect(page.locator('.card h2')).toHaveText('সদস্য এক');
});

test('change number returns to an editable phone field with the OTP row hidden', async ({ page }) => {
  await page.goto('/members.html');
  const phoneInput = page.locator('input[type=tel]');
  await phoneInput.fill('+919999999999');
  await page.click('button:has-text("OTP পাঠান")');
  const otpInput = page.locator('input[inputmode=numeric]');
  await expect(otpInput).toBeVisible();
  await expect(phoneInput).toBeDisabled();
  await page.click('a:has-text("নম্বর বদলান")');
  await expect(otpInput).toBeHidden();
  await expect(phoneInput).toBeEnabled();
});

test('resend requests a second verification code for the same number', async ({ page }) => {
  const phone = '+916000000001'; // distinct number: keeps this test's code count independent of others
  await page.goto('/members.html');
  await page.fill('input[type=tel]', phone);
  await page.click('button:has-text("OTP পাঠান")');
  await expect(page.locator('input[inputmode=numeric]')).toBeVisible();
  const resendBtn = page.locator('button:has-text("আবার OTP পাঠান")');
  await resendBtn.click();
  await expect(resendBtn).toBeEnabled({ timeout: 10000 }); // re-enabled in sendOtp's finally when the resend completes
  const res = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-trust/verificationCodes');
  const { verificationCodes } = await res.json();
  const codesForPhone = verificationCodes.filter(c => c.phoneNumber === phone);
  expect(codesForPhone.length).toBeGreaterThanOrEqual(2);
});

test('logout returns to the phone entry form', async ({ page }) => {
  await signInByPhone(page, '+919999999999');
  await expect(page.locator('.card h2')).toHaveText('সদস্য এক');
  await page.click('button:has-text("লগআউট")');
  await expect(page.locator('input[type=tel]')).toBeVisible();
  await expect(page.locator('input[type=tel]')).toBeEnabled();
});
