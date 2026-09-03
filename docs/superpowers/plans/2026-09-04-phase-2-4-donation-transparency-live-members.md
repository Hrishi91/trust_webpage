# Phase 2 + 3 + 4 — Donation, Transparency, Live Hub, Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the spec's scope B–E on the live site: a Donate page (UPI/QR + WhatsApp confirmation + donor wall), a Transparency page (year-wise income/expense + documents), realtime announcements with a live banner, and a committee-members portal (phone OTP; own pledge/balance, notices, duty roster) — each with its admin section, rules, tests, and demo data on production.

**Architecture:** Same as Phase 0/1 — static ES-module pages read Firestore directly (rules-gated), `/admin/` sections self-register through `registry.js`, shared toolkit in `admin/js/forms.js` + `admin/js/upload.js`, public reads in `js/content.js`. New: `onSnapshot` for announcements; Firebase phone auth on `members.html` (members are a second auth population — the admin gate is untouched); per-member rules keyed by `request.auth.token.phone_number`.

**Tech Stack:** unchanged (Firebase 12.18.0 CDN modular, Firestore, Auth email+password for admin / phone OTP for members, Storage, Playwright, emulators). Production project `ganesh-puja-trust` on Blaze.

Spec: `docs/superpowers/specs/2026-09-03-trust-website-design.md` §2 (B–E), §5 (data model), §6 (security), §7, §8. Phase 0/1 plan (conventions, toolkit): `docs/superpowers/plans/2026-09-03-phase-0-1-foundation-showcase.md`.

## Global Constraints

- Everything in the Phase 0/1 plan's Global Constraints still binds: no build step, SDK pinned 12.18.0 via `js/firebase.js` only, `{bn,en}` text fields, `deleted` always boolean + `hasDeletedFlag()` on writes, no hard deletes, no raw `innerHTML` except `js/rich.js`, relative paths, docs in the same commit, rules never deployed with a red suite (`npm test`), `--test-concurrency=1` for rules tests.
- **Donor phone numbers are never stored in the website DB** (spec §3). `donations` docs carry name/amount/date/mode/receiptNo only.
- **Member doc id = E.164 phone** (`+919…`); member rules compare `request.auth.token.phone_number == phone`. Members are never admins by virtue of being members; admin identity stays `admins/{uid}` + verified email.
- `members`, `notices`, `roster`: readable only by the owning/active member or admin — never public. `donations`: public read only where `showOnWall == true && deleted == false`. `transparency`: public read only where `published == true && deleted == false`. `announcements`: public read only where `published == true && deleted == false` (expiry filtered client-side).
- Every new public list query gets a composite index in `firestore.indexes.json` (emulator auto-creates them; production does not — this bit us in Phase 1).
- Phone OTP: production test number `+919999999999` → code `123456` (Identity Toolkit config `testPhoneNumbers`) so demo/e2e never send SMS; the Auth emulator returns codes via `GET http://127.0.0.1:9099/emulator/v1/projects/demo-trust/verificationCodes`.
- Section visibility keys `donate`, `transparency`, `members` gate nav + pages (already in `DEFAULT_SETTINGS`, default `false` → flip to `true` on production when the phase ships).
- Demo data on production is written with the owner OAuth REST pattern used in Phase 1 (dummy only; real content goes through `/admin/`).

---

## File structure (new / modified)

```
donate.html · transparency.html · members.html         public pages
js/pages/{donate,transparency,members}.js
js/pages/home.js                                       + live strip (onSnapshot), today's schedule
js/content.js                                          + listDonorWall, listTransparencyYears, getTransparency, onAnnouncements, member reads
js/shell.js                                            + nav: donate / transparency / members (visibility-gated)
js/firebase.js                                         + re-exports: RecaptchaVerifier, signInWithPhoneNumber, limit, arrayUnion, onSnapshot (exists)
js/i18n.js                                             + keys for phases 2–4
admin/js/upload.js                                     + fileField (PDF ≤ 5 MB)
admin/js/sections/{donations,transparency,announcements,members,notices,roster}.js
admin/js/admin.js                                      + six imports (dashboard order: announcements first)
firestore.rules · storage.rules (unchanged) · firestore.indexes.json (+7)
tests/rules/firestore.test.js                          + matrix for the six collections
tests/unit/money.test.js  + js/money.js                pure: sums, INR formatting, balance
tests/seed/seed.js                                     + demo docs for phases 2–4, member test phone
tests/e2e/{donate,transparency,live,members}.spec.js
docs/user-guide/admin-guide.md (+ sections) · docs/PROJECT_CONTEXT.md · pending.md · build-log.md
```

---

### Task 1: Rules + tests + indexes for the six new collections

**Files:**
- Modify: `firestore.rules`, `tests/rules/_env.js`, `tests/rules/firestore.test.js`, `firestore.indexes.json`

**Interfaces:**
- Produces rule helpers `isMember()` (signed in with a phone claim), `myPhone()`, `activeMember()` (member doc exists and `active == true`); test contexts `member` (phone `+919999999999`, has an active `members` doc), `otherMember` (phone `+918888888888`, active doc), `inactive` (phone `+917777777777`, doc with `active:false`).

- [ ] **Step 1: Extend `tests/rules/_env.js`** — add after the admin seed inside `withSecurityRulesDisabled`:

```js
    await ctx.firestore().doc('members/+919999999999').set({ name: { bn: 'ম', en: 'M' }, role: { bn: '', en: '' }, pledge: 5000, payments: [], active: true, deleted: false, order: 1 });
    await ctx.firestore().doc('members/+918888888888').set({ name: { bn: 'অ', en: 'O' }, role: { bn: '', en: '' }, pledge: 1000, payments: [], active: true, deleted: false, order: 2 });
    await ctx.firestore().doc('members/+917777777777').set({ name: { bn: 'ই', en: 'I' }, role: { bn: '', en: '' }, pledge: 0, payments: [], active: false, deleted: false, order: 3 });
```
and to the returned object:
```js
    member: testEnv.authenticatedContext('member-uid-1', { phone_number: '+919999999999' }),
    otherMember: testEnv.authenticatedContext('member-uid-2', { phone_number: '+918888888888' }),
    inactive: testEnv.authenticatedContext('member-uid-3', { phone_number: '+917777777777' }),
```

- [ ] **Step 2: Write the failing tests** (append to `tests/rules/firestore.test.js`):

```js
// ---- Phase 2: donations ----
test('donations: public reads only wall rows; admin all; no phone field ever; no delete', async () => {
  const row = { donorName: 'X', amount: 500, date: '2026-09-01', mode: 'upi', receiptNo: 'R1', year: 2026, isAnonymous: false, showOnWall: true, deleted: false, order: 1 };
  await E.seed(async db => { await db.doc('donations/w').set(row); await db.doc('donations/h').set({ ...row, showOnWall: false }); await db.doc('donations/g').set({ ...row, deleted: true }); });
  const a = E.anon.firestore();
  await assertSucceeds(a.doc('donations/w').get());
  await assertFails(a.doc('donations/h').get());
  await assertFails(a.doc('donations/g').get());
  await assertSucceeds(a.collection('donations').where('showOnWall', '==', true).where('deleted', '==', false).get());
  await assertFails(a.collection('donations').where('deleted', '==', false).get());
  await assertFails(E.member.firestore().doc('donations/h').get());
  await assertSucceeds(E.admin.firestore().collection('donations').get());
  await assertFails(a.doc('donations/new').set(row));
  await assertFails(E.admin.firestore().doc('donations/p').set({ ...row, phone: '9800000000' }));   // phone field forbidden
  await assertSucceeds(E.admin.firestore().doc('donations/new').set(row));
  await assertFails(E.admin.firestore().doc('donations/new').delete());
});

// ---- Phase 2: transparency ----
test('transparency: published only for public; admin all', async () => {
  const doc = { year: 2025, income: [{ category: { bn: 'চাঁদা', en: 'Donations' }, amount: 100 }], expense: [], documents: [], notes: { bn: '', en: '' }, published: true, deleted: false, order: 2025 };
  await E.seed(async db => { await db.doc('transparency/2025').set(doc); await db.doc('transparency/2024').set({ ...doc, year: 2024, published: false }); });
  await assertSucceeds(E.anon.firestore().doc('transparency/2025').get());
  await assertFails(E.anon.firestore().doc('transparency/2024').get());
  await assertSucceeds(E.anon.firestore().collection('transparency').where('published', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('transparency').get());
  await assertFails(E.other.firestore().doc('transparency/2025').update({ published: false }));
  await assertSucceeds(E.admin.firestore().doc('transparency/2024').update({ published: true }));
  await assertFails(E.admin.firestore().doc('transparency/2024').delete());
});

// ---- Phase 3: announcements ----
test('announcements: published only; admin writes; no delete', async () => {
  const an = { text: { bn: 'x', en: 'x' }, pinned: false, isLive: false, expiresAt: '', published: true, deleted: false, order: 1 };
  await E.seed(async db => { await db.doc('announcements/p').set(an); await db.doc('announcements/d').set({ ...an, published: false }); });
  await assertSucceeds(E.anon.firestore().doc('announcements/p').get());
  await assertFails(E.anon.firestore().doc('announcements/d').get());
  await assertSucceeds(E.anon.firestore().collection('announcements').where('published', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('announcements').get());
  await assertFails(E.member.firestore().doc('announcements/new').set(an));
  await assertSucceeds(E.admin.firestore().doc('announcements/new').set(an));
  await assertFails(E.admin.firestore().doc('announcements/new').delete());
});

// ---- Phase 4: members / notices / roster ----
test('members: own doc only; inactive still reads own; nobody else; admin writes only', async () => {
  await assertSucceeds(E.member.firestore().doc('members/+919999999999').get());
  await assertFails(E.member.firestore().doc('members/+918888888888').get());
  await assertSucceeds(E.inactive.firestore().doc('members/+917777777777').get());
  await assertFails(E.anon.firestore().doc('members/+919999999999').get());
  await assertFails(E.other.firestore().doc('members/+919999999999').get());          // email-only user
  await assertFails(E.member.firestore().collection('members').get());
  await assertSucceeds(E.admin.firestore().collection('members').get());
  await assertFails(E.member.firestore().doc('members/+919999999999').update({ pledge: 0 }));
  await assertSucceeds(E.admin.firestore().doc('members/+919999999999').update({ pledge: 6000 }));
  await assertFails(E.admin.firestore().doc('members/+919999999999').delete());
});
test('notices + roster: active members and admin read; inactive/anon denied; admin writes', async () => {
  await E.seed(async db => {
    await db.doc('notices/n1').set({ title: { bn: 'x', en: 'x' }, body: { bn: '', en: '' }, published: true, deleted: false, order: 1 });
    await db.doc('roster/r1').set({ date: '2026-09-15', duty: { bn: 'গেট', en: 'Gate' }, memberPhones: ['+919999999999'], note: '', published: true, deleted: false, order: 1 });
  });
  for (const c of ['notices', 'roster']) {
    await assertSucceeds(E.member.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertSucceeds(E.otherMember.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.inactive.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.anon.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.member.firestore().doc(`${c}/x`).set({ published: true, deleted: false, order: 9 }));
    await assertSucceeds(E.admin.firestore().collection(c).get());
  }
  await assertSucceeds(E.member.firestore().collection('roster').where('memberPhones', 'array-contains', '+919999999999').where('published', '==', true).where('deleted', '==', false).get());
});
```

- [ ] **Step 3: Run** `npm run test:rules` → the new tests FAIL (catch-all denies).

- [ ] **Step 4: Rules** — add inside the `documents` match, before the catch-all:

```
    function isMember() { return signedIn() && request.auth.token.phone_number is string; }
    function myPhone() { return request.auth.token.phone_number; }
    function activeMember() {
      return isMember()
        && exists(/databases/$(db)/documents/members/$(myPhone()))
        && get(/databases/$(db)/documents/members/$(myPhone())).data.active == true;
    }

    match /donations/{id} {
      allow read: if isAdmin() || (resource.data.showOnWall == true && resource.data.deleted == false);
      allow create, update: if isAdmin() && hasDeletedFlag() && !('phone' in request.resource.data);
      allow delete: if false;
    }
    match /transparency/{year} {
      allow read: if isAdmin() || isLive();
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }
    match /announcements/{id} {
      allow read: if isAdmin() || isLive();
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }
    match /members/{phone} {
      allow read: if isAdmin() || (isMember() && myPhone() == phone);
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }
    match /notices/{id} {
      allow read: if isAdmin() || (activeMember() && isLive());
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }
    match /roster/{id} {
      allow read: if isAdmin() || (activeMember() && isLive());
      allow create, update: if isAdmin() && hasDeletedFlag();
      allow delete: if false;
    }
```

- [ ] **Step 5: Run** → all green (15 + 5 = 20). **Mutation checks** (each: apply → run → named tests fail → revert): (1) drop `resource.data.showOnWall == true` → donations test fails; (2) `activeMember()` without the `active == true` clause → inactive assertions fail; (3) `myPhone() == phone` → `members/+918888888888` cross-read succeeds → fails.

- [ ] **Step 6: Indexes** — append to `firestore.indexes.json` (all `COLLECTION`, ASC unless noted):
  `donations` (showOnWall, deleted, date DESC) · `donations` (year, deleted, date DESC) · `transparency` (published, deleted, year DESC) · `transparency` (deleted, year DESC) · `announcements` (published, deleted, order DESC) · `announcements` (deleted, order DESC) · `notices` (published, deleted, order DESC) · `notices` (deleted, order DESC) · `roster` (published, deleted, date) · `roster` (deleted, date) · `roster` (memberPhones ARRAY_CONTAINS, published, deleted, date) · `members` (deleted, order).

- [ ] **Step 7: Commit** `feat: rules, tests and indexes for donations, transparency, announcements, members, notices, roster` (build-log line with the 3 mutation results).

---

### Task 2: Shared plumbing — i18n keys, content reads, nav, money helpers, PDF upload

**Files:**
- Create: `js/money.js`, `tests/unit/money.test.js`
- Modify: `js/i18n.js`, `js/content.js`, `js/shell.js`, `js/firebase.js`, `admin/js/upload.js`

**Interfaces produced:**
- `js/money.js` (pure): `sum(items)` (array of `{amount}` → number), `inr(n, lang)` → `'₹১২,৩৪৫'` / `'₹12,345'` (Indian grouping, no decimals), `balance(pledge, payments)` → `pledge − sum(payments)`.
- `js/content.js`: `listDonorWall(limitN=50)` (showOnWall+!deleted, date desc), `listTransparencyYears()` (published+!deleted, year desc), `getTransparency(year)` (published only, else null), `onAnnouncements(cb)` (onSnapshot on published+!deleted order desc limit 20; cb receives non-expired rows, pinned first, and `{ live: boolean }`), `getMyMember(phone)`, `listNotices()`, `listMyRoster(phone)`.
- `js/shell.js`: NAV gains `['donate','donate.html','nav.donate','donate']`, `['transparency','transparency.html','nav.transparency','transparency']`, `['members','members.html','nav.members','members']`.
- `js/firebase.js`: re-export `limit` (already), `onSnapshot` (already), `arrayUnion`, `RecaptchaVerifier`, `signInWithPhoneNumber`, `connectAuthEmulator` unchanged.
- `admin/js/upload.js`: `fileField(ctx, label, currentUrl, { folder, accept='application/pdf', maxBytes=5*1024*1024 })` → `{node, read()}` — uploads the raw file (no resize) via `uploadPublic` with the file's `type`; rejects larger files with an error toast.

- [ ] **Step 1: TDD `js/money.js`** — tests:

```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { sum, inr, balance } from '../../js/money.js';
test('sum', () => assert.equal(sum([{ amount: 100 }, { amount: 250.5 }, {}]), 350.5));
test('inr en indian grouping', () => assert.equal(inr(1234567, 'en'), '₹12,34,567'));
test('inr bn digits', () => assert.equal(inr(1234567, 'bn'), '₹১২,৩৪,৫৬৭'));
test('inr rounds', () => assert.equal(inr(99.6, 'en'), '₹100'));
test('balance', () => assert.equal(balance(5000, [{ amount: 2000 }, { amount: 500 }]), 2500));
test('balance never negative display', () => assert.equal(balance(100, [{ amount: 150 }]), -50));
```
Implementation: `inr` uses `Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })` then `bnDigits` (import from `./ui.js`) when `lang === 'bn'`.

- [ ] **Step 2: i18n keys** (add to `STRINGS`): `nav.donate` {দান, Donate}, `nav.transparency` {হিসাব, Transparency}, `nav.members` {সদস্য, Members}; `donate.*`: title {দান করুন, Donate}, upi {UPI দিয়ে দিন, Pay via UPI}, scan {QR স্ক্যান করুন, Scan the QR}, confirm {WhatsApp-এ জানান, Confirm on WhatsApp}, confirmMsg {আমি ₹{amount} দান করেছি (UPI ref: {ref})। নাম: {name}, I donated ₹{amount} (UPI ref: {ref}). Name: {name}}, wall {দাতাদের তালিকা, Donor wall}, anonymous {নাম প্রকাশে অনিচ্ছুক, Anonymous}, soon {অনলাইন দান শীঘ্রই চালু হবে — WhatsApp-এ যোগাযোগ করুন, Online donation opens soon — contact us on WhatsApp}, tax80g {80G-এর আওতায় কর ছাড়যোগ্য, Tax-deductible under 80G}; `tr.*`: title {আয়-ব্যয়ের হিসাব, Income & expense}, income {আয়, Income}, expense {ব্যয়, Expense}, balance {উদ্বৃত্ত, Balance}, docs {নথি, Documents}, year {বছর, Year}, regNo {রেজিস্ট্রেশন নং, Reg. no.}; `live.*`: badge {🔴 লাইভ, 🔴 LIVE}, today {আজকের সূচি, Today's schedule}, announcements {ঘোষণা, Announcements}; `mem.*`: title {সদস্যদের পাতা, Members' page}, phone {মোবাইল নম্বর, Mobile number}, sendOtp {OTP পাঠান, Send OTP}, otp {OTP, OTP}, verify {যাচাই করুন, Verify}, notMember {এই নম্বর সদস্য তালিকায় নেই, This number is not on the members list}, pledge {প্রতিশ্রুতি, Pledge}, paid {দেওয়া হয়েছে, Paid}, due {বাকি, Due}, notices {নোটিশ, Notices}, duties {আমার দায়িত্ব, My duties}, logout {লগআউট, Logout}; `admin.*` for new sections: donations {দান, Donations}, transparency {হিসাব, Transparency}, announcements {ঘোষণা, Announcements}, members {সদস্য, Members}, notices {নোটিশ, Notices}, roster {দায়িত্ব তালিকা, Duty roster}, addRow {+ সারি, + Row}, addPayment {+ পেমেন্ট, + Payment}.

- [ ] **Step 3: content.js additions** — follow the existing `rows()` helper and try/catch + `console.warn` pattern. `onAnnouncements(cb)`:
```js
export function onAnnouncements(cb) {
  const q = query(collection(db, 'announcements'), where('published', '==', true), where('deleted', '==', false), orderBy('order', 'desc'), limit(20));
  return onSnapshot(q, snap => {
    const now = Date.now();
    const list = rows(snap).filter(a => !a.expiresAt || new Date(a.expiresAt).getTime() > now).sort((x, y) => (y.pinned - x.pinned) || (y.order - x.order));
    cb(list, { live: list.some(a => a.isLive) });
  }, err => { console.warn('[content] announcements', err); cb([], { live: false }); });
}
```
Member reads take `phone` explicitly (the page passes `auth.currentUser.phoneNumber`).

- [ ] **Step 4: shell.js NAV + firebase.js re-exports + upload.js `fileField`.** `fileField` mirrors `imageField` minus resize: `accept` on the input, size check (`file.size > maxBytes` → `toast(t('common.error'),'err')`, reset input), progress bar, link preview (`<a target=_blank>` with the file name) instead of a thumbnail.

- [ ] **Step 5: Verify** — `npm run test:unit` (25 + 6); browser smoke against the emulator: nav shows the three new links only when the seed's `sectionVisibility` flags are true (seed update comes in Task 9; for now toggle via REST).

- [ ] **Step 6: Commit** `feat: shared plumbing for phases 2-4 (i18n, content reads, nav, money helpers, pdf upload)`.

---

### Task 3: Admin — Donations section

**Files:** Create `admin/js/sections/donations.js`; modify `admin/js/admin.js` (import).

**Interfaces:** Donation doc `{ donorName: string, amount: number, date: 'YYYY-MM-DD', mode: 'cash'|'upi'|'bank', receiptNo: string, year: number, isAnonymous: boolean, showOnWall: boolean, note: string, order: number (= date epoch ms), published: true, deleted }`. **No phone field.**

- [ ] **Step 1: Section** — pattern: `history.js`. Route `#donations` → year selector (`<select>` of years present + current year) + summary card (count, total, by mode — computed client-side with `sum()` from `js/money.js`) + list (`listView` is `order`-based ascending; here use a local query `where('year','==',Y) + where('deleted','==',false) + orderBy('date','desc')` and render rows `date · name · ₹amount · mode`, badge `wall` when `showOnWall`). `#donations/new|<id>` → form: `textField` donorName (required), `textField` amount (type number, min 1), `textField` date (type date, default today), `<select>` mode, `textField` receiptNo (default suggestion `R-${year}-${Date.now().toString(36).toUpperCase()}`, editable), `boolField` isAnonymous (default false), `boolField` showOnWall (default true), `textField` note. Save via `saveDoc(ctx, 'donations', id, data, { publish: true })` with `year = Number(date.slice(0,4))`, `order = new Date(date).getTime()`; guard empty name/amount/date → toast + return. Delete via `softDelete`.
- [ ] **Step 2: Verify (Playwright, emulator)** — create 3 donations (one anonymous, one hidden from wall), summary totals correct, year filter works, soft delete hides. REST read-back: no `phone` key anywhere.
- [ ] **Step 3: Commit** `feat: donations admin section (records, year summary, wall visibility)`.

### Task 4: Public — donate.html

**Files:** Create `donate.html`, `js/pages/donate.js`.

- [ ] **Step 1: Page** — `mountShell('donate', t('nav.donate'))`; if `s.sectionVisibility.donate === false` render `t('common.empty')`. Content:
  - If `s.upiId`: card with `t('donate.upi')`, big UPI id (copy button → `navigator.clipboard`), QR image (`s.upiQrUrl` if set, else generate nothing — no external QR API), and a button `upi://pay?pa=<upiId>&pn=<encodeURIComponent(pick(s.name))>&cu=INR` (opens the UPI app on phones).
  - Else: `t('donate.soon')` + WhatsApp link.
  - `t('donate.confirm')`: small form (name, amount, UPI ref) → builds `https://wa.me/<s.contacts.whatsapp>?text=<encoded t('donate.confirmMsg') with placeholders replaced>` — nothing is stored; opens WhatsApp.
  - `s.has80G` → `t('donate.tax80g')` line; `s.regNo` → `t('tr.regNo') s.regNo`.
  - Donor wall: `listDonorWall()` → list `name (or t('donate.anonymous')) · inr(amount) · fmtDate(date)`; empty → `t('common.empty')`.
- [ ] **Step 2: Verify** — with/without `upiId`; wall shows only `showOnWall` rows; anonymous row shows the anonymous label; WhatsApp href encodes the message; mobile no overflow.
- [ ] **Step 3: Commit** `feat: donate page (upi/qr, whatsapp confirmation, donor wall)`.

### Task 5: Admin — Transparency section (with PDF upload)

**Files:** Create `admin/js/sections/transparency.js`; modify `admin/js/admin.js`.

**Interfaces:** Doc id = year string. `{ year: number, income: [{category:{bn,en}, amount:number}], expense: [{category:{bn,en}, amount:number}], documents: [{title:{bn,en}, url:string}], notes:{bn,en}, order: year, published, deleted }`.

- [ ] **Step 1: Section** — list by year (query `deleted==false` orderBy `year desc`; badge draft/published). Form: year (number, required; the doc id), two dynamic tables (income/expense) with `biField` category + amount + remove button and `t('admin.addRow')`; documents list: each row `biField` title + `fileField(ctx, …, {folder:`public/transparency/${year}`})` + remove; `biField` notes (multiline); totals preview (`sum`); Save draft / Publish / Delete / Preview (`../transparency.html?year=<y>&preview=1`). `saveDoc(ctx,'transparency', String(year), data, {publish})` — id is the year, so create uses `setDoc` on that id (saveDoc handles an explicit id).
- [ ] **Step 2: Verify** — create 2025 with 3 income + 2 expense rows and one uploaded PDF (generate a tiny valid PDF in the test: `%PDF-1.4 … %%EOF` bytes ≥ 100 B), publish; totals match; PDF publicly downloadable from Storage (`curl` 200 `application/pdf`); >5 MB file rejected client-side.
- [ ] **Step 3: Commit** `feat: transparency admin section (income/expense tables, documents, publish)`.

### Task 6: Public — transparency.html

**Files:** Create `transparency.html`, `js/pages/transparency.js`.

- [ ] **Step 1: Page** — year tabs from `listTransparencyYears()` (newest default, `?year=` param honoured, `?preview=1` reads the doc directly for admin); tables income/expense with `inr()`, totals, `t('tr.balance')` = income − expense (highlight negative), documents as links (`target=_blank rel=noopener`), notes via `renderRich`? — notes are plain text: render with `textContent`. Header badge: `s.regNo` and `s.has80G`.
- [ ] **Step 2: Verify** — unpublished year absent for anon, present with `?preview=1` as admin; numbers in bn digits; mobile table scrolls inside `.table-wrap{overflow-x:auto}` (add to `css/site.css`), body has no horizontal overflow.
- [ ] **Step 3: Commit** `feat: transparency page (year tabs, income/expense, documents)`.

### Task 7: Admin — Announcements section

**Files:** Create `admin/js/sections/announcements.js`; modify `admin/js/admin.js` (this import FIRST so the card is first on the dashboard).

**Interfaces:** `{ text:{bn,en}, pinned:boolean, isLive:boolean, expiresAt: ISO|'', order: createdAt ms, published, deleted }`.

- [ ] **Step 1: Section** — top: quick-post form (biField text multiline, boolField pinned, boolField isLive, textField expiresAt datetime-local via `toLocalInput`) with one button `t('admin.publish')` (announcements are published immediately; `saveDoc(..., {publish:true})`); below: list newest first (query `deleted==false` orderBy `order desc`) with badges `📌`/`🔴`/expired, buttons Unpublish/Publish toggle (`updateDoc` + audit) and Delete (`softDelete`).
- [ ] **Step 2: Verify** — post → appears in list; toggle; expired one shows badge.
- [ ] **Step 3: Commit** `feat: announcements admin section (quick post, pin, live, expiry)`.

### Task 8: Public — live strip on home (realtime) + today's schedule

**Files:** Modify `js/pages/home.js`, `css/site.css`.

- [ ] **Step 1** — Above the hero: `onAnnouncements((list, {live}) => …)` renders `.live-strip` (hidden when empty): when `live`, a pulsing `t('live.badge')` chip; then up to 5 announcements (pinned first) as `.ann` rows (text via `pick`, time via `fmtDate`). Below the hero, when any published event's `start` is today (local date), a `t('live.today')` strip listing today's events with times (`HH:MM` local). Unsubscribe on `pagehide`. CSS: `.live-strip{background:#fff3cd;border-left:4px solid #b91c1c;…} .pulse{animation:pulse 1.2s infinite}`.
- [ ] **Step 2: Verify (two browser contexts)** — admin posts an announcement in context A; context B's home shows it within ~2 s without reload; toggling `isLive` shows/hides the badge; an event starting today appears in the today strip.
- [ ] **Step 3: Commit** `feat: realtime announcements strip and today's schedule on home`.

### Task 9: Phone auth enablement + seed/e2e groundwork

**Files:** Create `scripts/auth-config.mjs` (owner-run, uses the firebase-tools OAuth token like the Phase-1 seed scripts — prints nothing secret); modify `tests/seed/seed.js`, `js/firebase.js` (already re-exports phone auth from Task 2).

- [ ] **Step 1: `scripts/auth-config.mjs`** — reads `~/.config/configstore/firebase-tools.json` refresh token, exchanges it (firebase-tools public client id/secret as in the Phase-1 scripts), then `PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/ganesh-puja-trust/config?updateMask=signIn.phoneNumber,authorizedDomains` with body `{ signIn: { phoneNumber: { enabled: true, testPhoneNumbers: { '+919999999999': '123456' } } }, authorizedDomains: ['localhost', 'ganesh-puja-trust.firebaseapp.com', 'ganesh-puja-trust.web.app', 'hrishi91.github.io'] }` — first GET the config and MERGE existing `authorizedDomains` rather than replacing. Prints the resulting `signIn.phoneNumber.enabled` and the domain list. Document in `docs/user-guide/deploy.md` ("custom domain → re-run this script after adding the domain to the list").
- [ ] **Step 2: Seed** — add to `tests/seed/seed.js`: members `+919999999999` (active, pledge 5000, payments [2000, 1500]) and `+918888888888` (active), `+917777777777` (inactive); notices ×2 (1 draft); roster ×2; donations ×4 (1 hidden, 1 anonymous); transparency 2025 published + 2024 draft; announcements ×3 (1 pinned, 1 live, 1 expired); settings `sectionVisibility` donate/transparency/members `true`, `upiId: 'trust@upi'`. Auth emulator: create the phone user via `auth.createUser({ uid: 'member-1', phoneNumber: '+919999999999' })`.
- [ ] **Step 3: Verify** — `npm run seed` clean twice; run `scripts/auth-config.mjs` against production (owner-run in this session) and confirm the printed state.
- [ ] **Step 4: Commit** `chore: phone auth config script, seed data for phases 2-4`.

### Task 10: Admin — Members section (+ payments)

**Files:** Create `admin/js/sections/members.js`; modify `admin/js/admin.js`.

**Interfaces:** Doc id = E.164 phone. `{ name:{bn,en}, role:{bn,en}, pledge:number, payments:[{date:'YYYY-MM-DD', amount:number, note:string}], active:boolean, order:number, published:true, deleted }`.

- [ ] **Step 1: Section** — list (`deleted==false` orderBy `order`), row `name · phone · due ₹` (`balance()`), badge inactive. Form: `textField` phone (required; normalise: strip spaces/dashes, if 10 digits prefix `+91`, must match `/^\+\d{10,14}$/` else toast) — **phone is the doc id, immutable after create** (disable the field on edit); `biField` name, `biField` role, `textField` pledge (number), `boolField` active (default true); payments table (date, amount, note, remove) + `t('admin.addPayment')`; totals (paid, due). `saveDoc(ctx,'members', phone, data, {publish:true})`; soft delete.
- [ ] **Step 2: Verify** — create with `98000 00000` → id `+919800000000`; add 2 payments → due correct; inactive badge; invalid phone rejected.
- [ ] **Step 3: Commit** `feat: members admin section (pre-registered phones, pledge, payments, active flag)`.

### Task 11: Admin — Notices + Roster sections

**Files:** Create `admin/js/sections/notices.js`, `admin/js/sections/roster.js`; modify `admin/js/admin.js`.

- [ ] **Step 1: Notices** — like history without year/images: `biField` title, `biField` body (multiline; rendered with `renderRich` on the member page), draft/publish, soft delete, order = createdAt ms.
- [ ] **Step 2: Roster** — form: `textField` date (type date, required), `biField` duty, members multi-select (checkbox list of active members: `name · phone`) → `memberPhones: string[]`, `textField` note; list by date (`deleted==false` orderBy `date`), publish/unpublish, soft delete; `order = new Date(date).getTime()`.
- [ ] **Step 3: Verify** — create both; a roster with 2 members; REST read-back shape.
- [ ] **Step 4: Commit** `feat: notices and duty roster admin sections`.

### Task 12: Public — members.html (phone OTP portal)

**Files:** Create `members.html`, `js/pages/members.js`; modify `css/site.css`, `js/rich.js` usage (DOMPurify script tag on the page).

- [ ] **Step 1: Page** — `mountShell('members', t('nav.members'))`; if `sectionVisibility.members === false` → empty. States:
  - **Logged out:** phone input (placeholder `+91…`, same normalisation as admin) + `t('mem.sendOtp')` → `signInWithPhoneNumber(auth, phone, new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' }))` (a `<div id="recaptcha">` must exist; on the emulator `auth.settings.appVerificationDisabledForTesting = true` when `IS_LOCAL`); then OTP input + `t('mem.verify')` → `confirmationResult.confirm(code)`. Error codes → generic `common.error`; `auth/invalid-phone-number` → field error.
  - **Logged in:** `getMyMember(user.phoneNumber)` → if null (or permission-denied) → `t('mem.notMember')` + logout; else "my card": name, role, `pledge / paid / due` (`inr`), payments list; `t('mem.notices')`: `listNotices()` (`renderRich` body); `t('mem.duties')`: `listMyRoster(phone)` (date, duty, note); `t('mem.logout')` → `signOut`. Inactive member: the member doc read succeeds but notices/roster queries are denied → show the card and `t('common.empty')` for the lists (catch per-query).
  - Auth persistence is already `browserLocalPersistence` via `initializeAuth`.
- [ ] **Step 2: Verify (emulator)** — seed member `+919999999999`: send OTP → read the code from `http://127.0.0.1:9099/emulator/v1/projects/demo-trust/verificationCodes` → verify → card shows pledge ৫,০০০ / paid ৩,৫০০ / due ১,৫০০; notices show only published; roster shows only rows containing the phone; `+917777777777` (inactive) → card shown, lists empty; a non-member phone → `mem.notMember`; logout returns to the phone form; `/admin/` is unaffected (email login still works — the two auth populations coexist because members never have an `admins` doc).
- [ ] **Step 3: Commit** `feat: members portal (phone otp, pledge/balance, notices, duty roster)`.

### Task 13: e2e specs for phases 2–4 + docs

**Files:** Create `tests/e2e/{donate,transparency,live,members}.spec.js`; modify `playwright.config.js` (projects order: public → members → admin), `docs/user-guide/admin-guide.md` (sections for the six new cards), `docs/PROJECT_CONTEXT.md`, `docs/pending.md`.

- [ ] **Step 1: Specs (non-vacuous, exact counts)** — donate: wall shows exactly the 2 visible seeded rows, anonymous label present, hidden row absent, WhatsApp link contains the encoded amount; transparency: 2025 visible with correct totals (bn digits), 2024 absent for anon and present with `?preview=1` after admin login (own project so ordering holds), PDF link present; live: home shows the pinned announcement first and the 🔴 badge; admin posts a new one (admin project) → public context sees it without reload (`expect.poll`); members: OTP flow through the emulator code endpoint → card values; inactive → empty lists; non-member → notMember text. Total after: 8 + ≥10.
- [ ] **Step 2: Run twice** `npm run seed && npm run e2e`; `npm test` green.
- [ ] **Step 3: Docs** — admin guide sections (Bengali), PROJECT_CONTEXT state + decisions (member id = phone, test phone, announcements realtime, no gateway), pending: Phase 2–4 done, Phase 5 ideas (payment gateway when 80G lands).
- [ ] **Step 4: Commit** `test: e2e for donate, transparency, live strip, members portal; docs`.

### Task 14: Production rollout — rules/indexes deploy, auth config, demo data, live verification

- [ ] **Step 1** `scripts/deploy-rules.sh` (tests gate → rules + indexes); poll the new indexes via REST `runQuery` until no "requires an index".
- [ ] **Step 2** `node scripts/auth-config.mjs` (phone provider + test number + authorized domain `hrishi91.github.io`).
- [ ] **Step 3** Demo data via the owner-OAuth REST pattern (`.tmp-demo2.mjs`, deleted after): settings `sectionVisibility` donate/transparency/members `true`, `upiId 'ganeshpujatrust@upi'` (dummy), `upiQrUrl` = a generated placeholder image in Storage; donations ×12 across 2025/2026 (3 anonymous, 2 hidden); transparency 2024 + 2025 published (income: chanda/road/bus/toto; expense: idol/pandal/lights/prasad/culture) + one generated PDF "audit-2025.pdf" in Storage; announcements ×4 (1 pinned, 1 live, 1 expired); members ×6 incl. `+919999999999` (pledge/payments) — **demo names only, no real phone numbers except the test one**; notices ×3; roster ×4.
- [ ] **Step 4** Live verification in the browser pane: donate (UPI card, wall count), transparency (2025 totals, PDF link 200), home live strip (post an announcement via REST → strip updates without reload), members (login with `+919999999999` / `123456` → card, notices, duties; `/admin/` still works).
- [ ] **Step 5** Build-log + pending + PROJECT_CONTEXT ("Phases 2–4 live 2026-09-04"), push, tag `v2.0.0`.

## Self-review against the spec

§2 B (UPI/QR, records, donor wall) → Tasks 3–4 · C (year summary, documents) → 5–6 · D (realtime announcements, live banner, today's schedule) → 7–8 · E (phone OTP, pledge/balance, notices, roster) → 9–12 · §5 collections donations/transparency/announcements/members/notices/roster → Task 1 (+indexes) · §6.6 member isolation, active lock-out → Task 1 rules + mutation checks, Task 12 UI · §7 admin cards Announcements/Donations/Transparency/Members (+Notices/Roster) → 3, 5, 7, 10, 11 · §3 "donor phone never stored" → rule `!('phone' in request.resource.data)` + test · §9 tests → 1, 2, 13 · §10 docs → 13, 14. Type consistency: `saveDoc/softDelete/biField/textField/boolField/listView/toLocalInput` from forms.js; `fileField/imageField` from upload.js; `sum/inr/balance` from money.js; `onAnnouncements/listDonorWall/listTransparencyYears/getTransparency/getMyMember/listNotices/listMyRoster` from content.js — names used identically across tasks.
