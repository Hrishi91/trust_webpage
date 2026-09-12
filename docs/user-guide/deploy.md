# Deploy guide (Pages, rules, domain, App Check)

এই ফাইলটা re-runnable checklist — যখনই deploy করার দরকার হবে, এখানে এসে
সংশ্লিষ্ট section পড়ে করবেন।

## আগে যা লাগবে (owner action, একবারই)

`gh` login আছে (`Hrishi91`) কিন্তু repo তৈরি করতে পারছে না — কারণ ওই
fine-grained personal access token-এ **repo-create permission নেই**।
নিচের যেকোনো একটা করুন:

1. https://github.com/settings/tokens?type=beta → token edit → **Repository
   permissions → Administration: Read and write** add করুন। অথবা
2. নিজের terminal-এ চালান: `gh auth refresh -s repo,workflow`
   (browser device-flow খুলবে, নিজের account দিয়ে approve করুন)।

তারপর:

```bash
gh repo create Hrishi91/trust_webpage --public --source=. --remote=origin --push
```

Confirm: `git remote -v` এ origin দেখাবে, `git log origin/main --oneline | head -1`
local HEAD-এর সাথে মিলবে।

---

## Step 1: GitHub repo তৈরি + push

উপরের "আগে যা লাগবে" অংশ শেষ হলে, প্রতিটা নতুন clone/machine-এ এটা একবারই দরকার।
Repo-টা একবার তৈরি হয়ে গেলে সাধারণ কাজ শুধু `git push` (নিচে দেখুন)।

## Step 2: Pages enable (main root থেকে)

একবারই দরকার, repo তৈরি হওয়ার পরে:

```bash
gh api -X POST repos/Hrishi91/trust_webpage/pages -f build_type=legacy \
  -f 'source[branch]=main' -f 'source[path]=/'
```

409 "already exists" দিলে `-X PUT` দিয়ে আবার চালান।

Verify:

```bash
gh api repos/Hrishi91/trust_webpage/pages --jq .status
curl -sI https://hrishi91.github.io/trust_webpage/ | head -1           # expect: HTTP/2 200
curl -s https://hrishi91.github.io/trust_webpage/ | grep -o '<title>[^<]*</title>'   # static <title>
```

200 status এবং `<title>` ট্যাগ পাওয়া গেলে সার্ভার/deploy ঠিক আছে (deploy
হতে ~1–2 মিনিট লাগতে পারে)। কিন্তু `<h1>গণেশ পুজো ট্রাস্ট</h1>` heading-টা
**JS দিয়ে রেন্ডার হয়** (`mountShell` → `#main`), তাই প্লেইন `curl` কখনও
সেটা দেখতে পাবে না (JS চালায় না) — সেটা verify করতে হয় ব্রাউজারে সাইট
খুলে চোখে দেখে, অথবা `npx playwright` / headless Chromium দিয়ে।

**routine কাজ — সাইট বদলালে:** শুধু `git push` করলেই Pages auto-deploy করে
(~1–2 মিনিটের মধ্যে লাইভ হয়)। আলাদা কিছু করার দরকার নেই।

**Path note:** project-pages URL-এ সাইট থাকে `/trust_webpage/`-এর নিচে;
custom domain-এ থাকে `/`-এ। তাই HTML-এর সব internal link অবশ্যই
**relative** হতে হবে (যেমন `css/site.css`, `../js/firebase.js`) — কখনও
root-absolute (`/css/...`) না।

## CI — প্রতি push-এ automatic টেস্ট

`.github/workflows/ci.yml` প্রতিটা push/PR-এ নিজে থেকেই চলে (`ubuntu-latest`,
Java 21 + firebase-tools + Playwright Chromium ইনস্টল করে) — unit + rules
(emulator দিয়ে) + সব e2e টেস্ট রান করে, ঠিক লোকাল `npm test` + `npm run e2e`-এর
মতোই। README-র ওপরের badge-টাই এই workflow-এর সাম্প্রতিক status দেখায় (সবুজ
= পাশ)।

- Verify: `gh run list --workflow ci.yml --limit 1` (সাম্প্রতিক run + status),
  অথবা `gh run watch <run-id> --exit-status` (লাইভ ফলো করতে)।
- CI **rules deploy করে না** — শুধু rules test চালায় emulator-এ। আসল প্রোডাকশন
  rules deploy এখনও ম্যানুয়াল, `scripts/deploy-rules.sh` দিয়ে (Step 3)।
- CI fail করলে push নিজে থেকে আটকায় না (branch protection সেটআপ করা নেই,
  একা admin-এর repo) — কিন্তু badge লাল দেখাবে, সেটা দেখলে ঠিক করে আবার push
  করুন।

## Step 3: Firestore/Storage rules deploy ⏳ owner-এর Firebase project হলে

owner এখনও real Firebase project বানাননি (`js/firebase-config.js`-এ এখনও
`PASTE` placeholder)। Project তৈরি হওয়ার পরে প্রথমবার:

```bash
npx firebase login   # browser flow, Hrishi-র Google account
scripts/deploy-rules.sh
```

Expected: `npm test` সব green, তারপর "Deploy complete"। Firebase console →
Firestore → Rules-এ আমাদের ফাইল দেখা যাবে।

**routine কাজ — rules বদলালে:** শুধু `scripts/deploy-rules.sh` চালান (এটা
নিজে থেকেই `npm test` চালিয়ে green হলে তবেই deploy করে)। `firebase login`
আর দরকার হয় না, একবার করলেই চলে।

## Step 4: Custom domain ⏳ owner domain কিনলে

Registrar-এর DNS panel-এ:

- `A` records `@` →
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME www` → `hrishi91.github.io`

তারপর repo-তে:

```bash
echo "<domain>" > CNAME
git add CNAME
git commit -m "chore: custom domain"
git push
```

GitHub → repo Settings → Pages → Custom domain-এ domain দেখাবে; cert issue
হতে (~1 ঘণ্টা) সময় লাগতে পারে, হয়ে গেলে **Enforce HTTPS** tick করুন।

Firebase Authorized domains আপডেট করতে console-এ ম্যানুয়ালি ঢোকার দরকার
নেই — `scripts/auth-config.mjs` (owner-run, production project-এ
`signIn.phoneNumber.enabled` + `authorizedDomains` লেখে) নতুন domain সমেত
আবার চালান:

```bash
node scripts/auth-config.mjs --domain <domain>
```

এটা existing authorized domains-এর সাথে নতুন domain **merge** করে (কিছু
মুছে দেয় না), phone-auth test number (`+919999999999` → `123456`)
অপরিবর্তিত রাখে, এবং শেষে `signIn.phoneNumber.enabled`, test number,
আর পুরো domain list প্রিন্ট করে (কোনো token print করে না) — সেটা দিয়ে
verify করবেন। GCP console → APIs & Services → Credentials → API key →
referrer list-এ `https://<domain>/*` add করুন (এটা এখনও ম্যানুয়াল, script
এই অংশ করে না)।

**routine কাজ — domain বদলালে:** উপরের DNS + CNAME + `scripts/auth-config.mjs
--domain <domain>` (Authorized domains) + referrer list — এই চারটাই আবার
করতে হবে নতুন domain-এর জন্য।

## Step 5: App Check enforce ⏳ Task 21-এর live verify পাশ হলে

Real domain-এ Task 21-এর live verification পাশ করার **পরেই** এটা on
করবেন — তার আগে না। Firebase console → App Check → Firestore/Storage →
Enforce।

## Step 6: Scheduled backup ⏳ owner-এর Firebase project হলে (একবারই)

`.github/workflows/backup.yml` প্রতি রবিবার রাত ২টায় (IST)
`scripts/backup.mjs` চালিয়ে সব collection/doc একটা dated JSON ফাইলে
export করে GitHub Actions artifact হিসেবে রাখে (৯০ দিন retention)।
`FIREBASE_SA` secret না থাকলে workflow ব্যর্থ না হয়ে শুধু স্কিপ করে
(green থাকে) — যতক্ষণ না নিচের সেটআপ একবার করা হয়।

**একবারই দরকার — Firebase console-এ (owner action):**

1. Google Cloud Console → IAM & Admin → Service Accounts → project-টা
   বেছে নিন (owner-এর real Firebase project, `demo-trust` না) →
   **Create Service Account**।
2. Role হিসেবে **Cloud Datastore Viewer** (শুধু read — write/delete
   permission নেই) দিন। এর বেশি কোনো role লাগবে না, backup script শুধু
   পড়ে, কিছু লেখে না।
3. ওই service account-এর **Keys** ট্যাব → **Add Key → Create new key →
   JSON** → ডাউনলোড হবে একটা `.json` ফাইল।
4. GitHub repo → **Settings → Secrets and variables → Actions → New
   repository secret** → নাম `FIREBASE_SA`, value-তে ওই পুরো JSON
   ফাইলের content paste করুন (পুরো ফাইল, শুধু একটা field না)।

```bash
gh secret set FIREBASE_SA < path/to/service-account.json
```

(অথবা GitHub UI দিয়ে একই কাজ করুন)। JSON key ফাইলটা এরপর নিজের
কম্পিউটার থেকে মুছে ফেলুন — GitHub secret-এই যথেষ্ট, দুই জায়গায় রাখার
দরকার নেই।

Verify: repo → **Actions → Scheduled backup → Run workflow** (manual
trigger, `workflow_dispatch`) → সবুজ হলে, ওই run-এর **Artifacts** section-এ
`firestore-backup` (একটা `backup-YYYY-MM-DD.json`) দেখা যাবে। secret
এখনও যোগ না করা থাকলেও run সবুজ থাকবে, log-এ শুধু "FIREBASE_SA is not
set — skipping" লেখা দেখাবে।

**routine কাজ:** কিছু করার দরকার নেই — cron নিজে থেকেই প্রতি রবিবার
চলবে। Restore করতে হলে (কখনও দরকার পড়লে) — artifact download করে JSON
ফাইলটা দেখে ম্যানুয়ালি Firestore console/`firebase firestore:delete`
+ import script দিয়ে ফেরত আনতে হবে; এই workflow শুধু export করে,
কোনো automatic restore path নেই।

---

## সংক্ষেপে — কবে কী করতে হবে

| পরিবর্তন | কমান্ড |
|---|---|
| সাইটের কোড/content বদল | `git push` (CI নিজে থেকেই টেস্ট চালাবে) |
| Firestore/Storage rules বদল | `scripts/deploy-rules.sh` |
| Custom domain সেটআপ/বদল | CNAME file + DNS + `scripts/auth-config.mjs --domain <domain>` + referrer list (Step 4) |
| App Check enforce | শুধু Task 21 live-verify পাশ হওয়ার পরে (Step 5) |
| Scheduled backup সেটআপ (একবারই) | Service account তৈরি + `FIREBASE_SA` GitHub secret (Step 6) |
