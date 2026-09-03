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
gh repo create Hrishi91/trust-webpage --public --source=. --remote=origin --push
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
gh api -X POST repos/Hrishi91/trust-webpage/pages -f build_type=legacy \
  -f 'source[branch]=main' -f 'source[path]=/'
```

409 "already exists" দিলে `-X PUT` দিয়ে আবার চালান।

Verify:

```bash
gh api repos/Hrishi91/trust-webpage/pages --jq .status
curl -sI https://hrishi91.github.io/trust-webpage/
```

200 status এবং `<h1>গণেশ পুজো ট্রাস্ট</h1>` পাওয়া গেলে ঠিক আছে (deploy হতে
~1–2 মিনিট লাগতে পারে)।

**routine কাজ — সাইট বদলালে:** শুধু `git push` করলেই Pages auto-deploy করে
(~1–2 মিনিটের মধ্যে লাইভ হয়)। আলাদা কিছু করার দরকার নেই।

**Path note:** project-pages URL-এ সাইট থাকে `/trust-webpage/`-এর নিচে;
custom domain-এ থাকে `/`-এ। তাই HTML-এর সব internal link অবশ্যই
**relative** হতে হবে (যেমন `css/site.css`, `../js/firebase.js`) — কখনও
root-absolute (`/css/...`) না।

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

Firebase console → Authentication → Settings → Authorized domains → নতুন
domain add করুন। GCP console → APIs & Services → Credentials → API key →
referrer list-এ `https://<domain>/*` add করুন।

**routine কাজ — domain বদলালে:** উপরের DNS + CNAME + Authorized domains +
referrer list — এই চারটাই আবার করতে হবে নতুন domain-এর জন্য।

## Step 5: App Check enforce ⏳ Task 21-এর live verify পাশ হলে

Real domain-এ Task 21-এর live verification পাশ করার **পরেই** এটা on
করবেন — তার আগে না। Firebase console → App Check → Firestore/Storage →
Enforce।

---

## সংক্ষেপে — কবে কী করতে হবে

| পরিবর্তন | কমান্ড |
|---|---|
| সাইটের কোড/content বদল | `git push` |
| Firestore/Storage rules বদল | `scripts/deploy-rules.sh` |
| Custom domain সেটআপ/বদল | CNAME file + DNS + Authorized domains + referrer list (Step 4) |
| App Check enforce | শুধু Task 21 live-verify পাশ হওয়ার পরে (Step 5) |
