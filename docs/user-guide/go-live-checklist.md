# Go-live checklist

কোড সম্পূর্ণ (Phase 0+1, Task 1–20 + Task 21-এর docs অংশ), কিন্তু সাইট এখনো লাইভ না। এই checklist অনুসরণ করে go-live করা হবে — এর বেশিরভাগ ধাপ শুধু owner (Hrishi) করতে পারবেন, কারণ এগুলোর জন্য real Firebase project, GitHub permission, বা domain লাগবে।

## Owner prerequisites (আগে এগুলো লাগবে)

- [ ] **real Firebase project** তৈরি করে **Blaze plan**-এ আপগ্রেড (Storage + phone OTP-র জন্য দরকার)
- [ ] `js/firebase-config.js`-এর `PASTE` placeholder-গুলো real config দিয়ে বদলানো
- [ ] **GitHub PAT-এ Administration permission** — বর্তমান token দিয়ে repo তৈরি/Pages enable করা যায়নি; নতুন token/permission লাগবে repo create + GitHub Pages enable করতে
- [ ] **Custom domain** কেনা এবং DNS GitHub Pages-এ পয়েন্ট করা

## Step 1 — Composite Firestore indexes

`firestore.indexes.json`-এ ন'টা composite index ইতিমধ্যে declare করা আছে (কোড-এ কমিট করা, console-এ ক্লিক করে বানাতে হবে না):

- [ ] `history` — `published, deleted, order`
- [ ] `history` — `deleted, order`
- [ ] `events` — `published, deleted, order`
- [ ] `events` — `deleted, order`
- [ ] `albums` — `published, deleted, order`
- [ ] `albums` — `deleted, order`
- [ ] `committee` — `isPublic, deleted, order`
- [ ] `committee` — `deleted, order`
- [ ] `photos` (প্রতিটা album-এর `photos` subcollection) — `deleted, order`

Deploy করতে:

```bash
npx firebase deploy --only firestore:indexes --project ganesh-puja-trust
```

`scripts/deploy-rules.sh` এখন `firestore:rules,firestore:indexes,storage` — সব একসাথে deploy করে (আগে `npm test` green হওয়া বাধ্যতামূলক)। Firebase console → Firestore → Indexes-এ ন'টা index "Enabled" status দেখা গেলে এই ধাপ শেষ।

### Owner-only: Authorized domains + API key referrer (custom domain লাইভ হওয়ার সাথেই করতে হবে)

- [ ] Firebase console → Authentication → Settings → **Authorized domains** → custom domain যোগ করুন (নাহলে সেই domain থেকে sign-in ব্লক হবে)
- [ ] GCP console → APIs & Services → Credentials → Browser API key → **HTTP referrers** list-এ `https://<domain>/*` যোগ করুন (`docs/user-guide/deploy.md`-এর Step 4-এও এটা আছে — এখানে repeat করা হলো যাতে go-live checklist একাই যথেষ্ট হয়)

## Step 2 — Live checklist (custom domain-এ, mobile emulation-এ)

- [ ] anon: পাঁচটা পাবলিক পেজই real Firestore থেকে render হচ্ছে, কনসোলে কোনো error নেই, Lighthouse mobile perf ≥ 90
- [ ] anon: DevTools console থেকে `settings/site`-এ `setDoc` চেষ্টা করলে permission-denied
- [ ] admin: Hrishi-র ফোনে লগইন, real camera দিয়ে একটা ছবি আপলোড → কয়েক সেকেন্ডে গ্যালারিতে দেখা যাচ্ছে
- [ ] admin: ফোনে Export JSON ডাউনলোড হচ্ছে
- [ ] `admins` ডকুমেন্ট নেই এমন দ্বিতীয় Google account দিয়ে লগইন চেষ্টা → reject হচ্ছে
- [ ] Maintenance toggle অন করলে পাবলিক সাইট বন্ধ, অ্যাডমিন প্যানেল স্বাভাবিক কাজ করছে; আবার টগল করে ফেরত
- [ ] Budget alert (GCP Billing-এ, ₹100) সেট করা আছে

## Step 3 — App Check enforcement (সবার শেষে)

উপরের সব ধাপ পাস করার **পরেই** এটা করুন — নাহলে ভুল থাকলে সাইট নিজেই আটকে যেতে পারে।

- [ ] Firebase console → App Check → Firestore + Storage-এর জন্য **Enforce** চালু করুন
- [ ] পাবলিক সাইট রিলোড করে দেখুন এখনও কাজ করছে (reCAPTCHA token issue হচ্ছে)
- [ ] `curl` দিয়ে সরাসরি Firestore REST endpoint-এ token ছাড়া রিকোয়েস্ট পাঠিয়ে দেখুন → 403 আসছে

## Step 4 — Members portal: real members + OTP (Phase 2–4, owner-only)

- [ ] **real members load করার আগে**: `node scripts/auth-config.mjs --remove-test-number`, তারপর Firebase console → Authentication → Sign-in method → Phone → 'Phone numbers for testing' খালি কিনা দেখুন
- [ ] প্রথম real সদস্যের নম্বর দিয়ে OTP login test করুন (send → real SMS আসছে → verify করে member card দেখা যাচ্ছে)
  - প্রথম real OTP login-এ devtools console-এ FAILED_PRECONDITION/index link এলে সেই index create করুন।

প্রোডাকশন SMS region policy India-only সেট করা হয়েছে (2026-09-04) — শুধু ভারতীয় নম্বরে SMS যাবে, অন্য দেশের নম্বর দিয়ে OTP পাঠানো ব্লক হবে।

## এরপর

সব ধাপ শেষ হলে `docs/build-log.md`-এ go-live entry লিখুন (checklist-এর ফলাফলসহ), `docs/PROJECT_CONTEXT.md`-এ "Live since ..." যোগ করুন, তারপর commit + `v1.0.0` tag + push (brief-এর Step 5, task-21-brief.md দ্রষ্টব্য)।
