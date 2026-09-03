# Firebase setup (একবারই, Hrishi করবেন)

1. https://console.firebase.google.com → Add project → নাম: `ganesh-puja-trust`
   (Analytics off)।
2. **Upgrade to Blaze** (Storage-এর জন্য বাধ্যতামূলক)। Card add করুন। তারপর
   Google Cloud console → Billing → Budgets → নতুন budget ₹100, email alert 50/90/100%।
3. Build → Firestore Database → Create (production mode, region `asia-south1` Mumbai)।
4. Build → Storage → Get started (production mode, same region)।
5. Build → Authentication → Sign-in method → Email/Password enable।
   Users → Add user: আপনার admin email + ≥12-char password। **UID copy করুন।**
6. Firestore → Data → Start collection `admins` → Document ID = ওই UID →
   field `createdAt` (timestamp, now)। এটাই admin gate।
7. Project settings → General → Your apps → Web app (</>) → নাম `trust-site`,
   Hosting off → **firebaseConfig object copy করে আমাকে দিন** (এটা public,
   secret নয়)।
8. Build → App Check → Apps → Register (reCAPTCHA v3) → site key copy করে দিন।
   Enforcement এখনই ON করবেন না — Task 11-এ live verify-র পরে।
9. Google Cloud console → APIs & Services → Credentials → Browser key
   (auto-created) → Application restrictions: HTTP referrers →
   `https://<domain>/*`, `https://hrishi91.github.io/*`, `http://127.0.0.1:5500/*`।
