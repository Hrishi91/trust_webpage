# Site basics audit — 2026-09-12

What a complete, user-friendly public site should have, checked item by item against the
**live** site (`https://hrishi91.github.io/trust_webpage/`) and the code on `main` at
commit `d1e2e30`. Every ❌ below was verified (curl / headless Chromium / Lighthouse), not assumed.

Method: `curl -sI` for every candidate URL; a headless Chromium pass over all 8 public pages at
390×844 with an iPhone UA (DOM, landmarks, heading order, computed input font-size, meta tags);
`npx lighthouse … --only-categories=performance,accessibility,best-practices,seo` (mobile
emulation, Lighthouse 13.4.1, fetched 2026-09-12T04:56Z).

Status key: ✅ present · ⚠️ partial · ❌ missing · n/a not applicable.

---

## 1. Pages & content

| Item | Status | Evidence | Action |
|---|---|---|---|
| Home | ✅ | `index.html`, `curl` → 200; hero + countdown + 11 admin-orderable sections | — |
| History / about | ✅ | `about.html` → 200, h1 "ইতিহাস", year-by-year timeline | — |
| "About the trust" — purpose, trustees, what we do | ⚠️ | No page states the trust's purpose in prose; the closest is `settings.donatePurposes` cards on `donate.html` (`js/pages/donate.js:78`) and the committee list | Build in Phase 7 — a donor deciding whether to give has nowhere to read what the trust is for |
| Committee | ✅ | `committee.html` → 200, officer ring cards + member grid | — |
| Gallery | ✅ | `gallery.html` → 200, albums + lightbox | — |
| Events | ✅ | `events.html` → 200, day tabs + past accordion | — |
| Donate | ✅ | `donate.html` → 200, UPI link/QR + WhatsApp confirm + donor wall | — |
| Transparency (হিসাব) | ✅ | `transparency.html` → 200, bars/donut ledger + documents + legal block | — |
| Members portal | ✅ | `members.html` → 200, phone-OTP dashboard | — |
| Maintenance page | ✅ | `js/shell.js:152` — `settings.maintenance` replaces `#main`, fails closed | — |
| Contact page (with form) | ❌ | `curl …/contact.html` → 404. Contact is footer-only: tel/WhatsApp/map/email (`js/shell.js:136-139`) | Build in Phase 7 — a neighbour with a question has no addressable page to land on or share |
| FAQ | ❌ | `curl …/faq.html` → 404 | Build in Phase 7 — deflects the repeated "is 80G ready / where does the money go / how do I join" WhatsApp questions |
| Privacy policy | ❌ | `curl …/privacy.html` → 404 | Build in Phase 7 — the site collects donor names/amounts and member phone numbers; India's DPDP Act expects a published notice |
| Terms of use | ❌ | `curl …/terms.html` → 404 | Build in Phase 7 — pairs with the privacy notice; one short page covers both |
| Donation / refund policy | ❌ | `curl …/…` → 404; no refund copy anywhere in `js/i18n.js` | Build in Phase 7 — UPI transfers do happen by mistake; the trust needs a stated position |
| 404 page | ❌ | `curl …/404.html` → 404; any bad path serves GitHub's own `<title>Page not found · GitHub Pages</title>` (9379 B, English, no nav back) | Build in Phase 7 — a mistyped WhatsApp link currently dead-ends on a GitHub-branded English page |
| Thank-you after donation | ❌ | `js/pages/donate.js:64` opens `wa.me` in a new tab; the donate page itself never changes state | Build in Phase 7 — the donor gets no on-site confirmation that anything happened |
| Downloads (audit PDFs, trust deed) | ⚠️ | PDFs live inside the transparency documents accordion (`js/pages/transparency.js`); no dedicated page, no trust-deed slot | Build in Phase 7 — an auditor or a government office wants one URL listing every document |
| News / updates page | ⚠️ | Ticker only (`js/shell.js:62`), capped at 5 items, no archive; `curl …/news.html` → 404 | Build in Phase 7 — yesterday's announcement is unreachable once a sixth is posted |

## 2. Findability & SEO

| Item | Status | Evidence | Action |
|---|---|---|---|
| Unique `<title>` per page | ⚠️ | Static titles are English and generic — `<title>History</title>`, `<title>Donate</title>` (`about.html:6`, `donate.html:6`). JS rewrites to Bengali + trust name at runtime (`js/shell.js:89`), which crawlers that don't run JS never see | Build in Phase 7 |
| Unique `<meta name=description>` per page | ✅ | Distinct on all 8 (verified in each file head); English-only | — |
| `rel=canonical` | ❌ | Headless check: `canonical: null` on all 8 pages | Build in Phase 7 |
| `hreflang` | n/a | Both languages live at one URL behind a JS toggle (`js/i18n.js` `setLang`); there are no per-language URLs to declare | Not needed — see §"Not needed" |
| `lang` attribute | ✅ | `<html lang="bn">` static; set to the active language at runtime (`js/shell.js:60`) | — |
| `robots.txt` | ❌ | `curl …/robots.txt` → 404 | Build in Phase 7 |
| `sitemap.xml` | ❌ | `curl …/sitemap.xml` → 404 | Build in Phase 7 |
| OG / Twitter meta (static per page) | ❌ | Headless check: `og: false` on all 8. An OG image slot exists in admin but no page reads it (`docs/pending.md:127`) | Build in Phase 7 — this site's main distribution channel is a WhatsApp link, which shows no preview card today |
| Structured data (Organization / NGO / Event) | ❌ | Headless check: `script[type="application/ld+json"]` count = 0 on all 8 | Build in Phase 7 |
| Favicon set (ico / png / apple-touch-icon) | ❌ | `curl …/favicon.ico` → 404, `…/apple-touch-icon.png` → 404; no static `<link rel=icon>` in any HTML file — one is injected at runtime only if the admin uploaded a `favicon` media slot (`js/shell.js:54-59`). Lighthouse `errors-in-console` logs the resulting `favicon.ico` 404 | Build in Phase 7 |
| Web manifest | ❌ | `curl …/manifest.json` and `…/site.webmanifest` → both 404 | Build in Phase 7 |
| `theme-color` meta | ❌ | Headless check: `themeColor: null` on all 8 (Android Chrome shows a default grey address bar) | Build in Phase 7 |
| Readable URLs | ✅ | `/about.html`, `/donate.html`, `/transparency.html` — no query-string routing | — |
| Internal linking | ✅ | 22–39 links per page; footer carries a full page list + trust block (`js/shell.js:140-143`) | — |
| Google Search Console readiness | ❌ | No verification file, no sitemap to submit (both verified above) | Owner-only — verification requires the owner's Google account |
| 404 handling on GitHub Pages (`404.html`) | ❌ | See §1 | Build in Phase 7 |

## 3. Sharing & contact

| Item | Status | Evidence | Action |
|---|---|---|---|
| Share buttons (WhatsApp / Facebook / copy link) | ❌ | `grep -rn "navigator.share\|share"` over `js/` — no page-share affordance anywhere; the only clipboard use is copying the UPI ID (`js/pages/donate.js:42`) | Build in Phase 7 — the audience shares by WhatsApp; making them copy the address bar on a phone is the friction point |
| Click-to-chat WhatsApp | ✅ | `js/shell.js:137`, `js/pages/donate.js:31,64`, `js/pages/home.js:82` | — |
| `tel:` link | ✅ | `js/shell.js:136` | — |
| `mailto:` link | ✅ | `js/shell.js:139` | — |
| Map link | ✅ | `js/shell.js:138` — `settings.mapUrl`, `httpsUrl()`-gated | — |
| Map embed (iframe) | n/a | A Google Maps iframe costs ~200 KB and a third-party cookie on a page already at LCP 7.1 s; the link opens the user's own maps app | Not needed |
| Social profile links | ✅ | `js/shell.js:123-129` — facebook/youtube/instagram/whatsappGroup, admin-set, blank = hidden, `https://`-validated in rules (`firestore.rules:67`) | — |
| Add-to-calendar (.ics) for events | ❌ | `grep -rn "\.ics\|dtend\|VCALENDAR" js/` — no match. `events` docs already carry `start`/`end` (`js/pages/events.js:26`), so the data exists | Build in Phase 7 |
| Print stylesheet for হিসাব | ❌ | `grep -rn "print" css/` → no match; no `@media print` anywhere | Build in Phase 7 — committee members and auditors print the ledger; today it prints with nav, ticker and footer |

## 4. Accessibility

| Item | Status | Evidence | Action |
|---|---|---|---|
| Skip link | ❌ | Headless check: `skipLink: false` on all 8 pages (no `a[href="#main"]`, no `.skip-link`) — despite `<main id="main">` already existing | Build in Phase 7 — a keyboard or screen-reader user tabs through 8 nav links on every page |
| Landmarks | ⚠️ | `<nav>`, `<main>`, `<footer>` present on all 8. `<header>` only on `index.html` (the hero). `#site-header` is a bare `<div>` with no `role="banner"` (headless: `banner: false` on all 8) | Build in Phase 7 |
| Heading order | ⚠️ | `about.html` skips `h1 → h3` (headless `headingSkips: ["1->3"]`, from `js/pages/about.js`); the other 7 pages are clean | Build in Phase 7 |
| Alt text on real images | ⚠️ | 29 of 36 images across the 8 pages carry `alt=""`, including committee portraits (`js/pages/committee.js:21`, `js/pages/home.js:147`), album covers (`js/pages/gallery.js:34`) and page-header photos (`js/shell.js:36`). No image is missing the attribute (`imgNoAlt: 0`) | Build in Phase 7 — a person's photo is content, not decoration |
| Focus rings | ✅ | `css/site.css:11` and `:306` — `:focus-visible{outline:3px solid var(--focus)}` | — |
| Keyboard — burger menu | ✅ | `js/shell.js:109-111` — real `<button>` with `aria-expanded` toggled | — |
| Keyboard — gallery lightbox | ❌ | `js/pages/gallery.js:64` — a `<div class="lightbox">` closed only by `onclick`, opened from `<img onclick>` (`:71`). No Escape handler, no `role="dialog"`, no focus move or trap, no close button, and the trigger image is not focusable | Build in Phase 7 — a keyboard user cannot open it, and cannot close it if it opens |
| Keyboard / ARIA — event day tabs | ❌ | `js/pages/events.js:37` — `role="tablist"` wrapping buttons that use `aria-pressed`, with no `role="tab"`, `aria-selected`, `aria-controls` or `role="tabpanel"` (headless: `tablist: 1`, `tabRoles: 0`). Invalid ARIA is worse than none | Build in Phase 7 |
| ARIA on the live ticker | ⚠️ | `js/shell.js:62` has `aria-label` but no `aria-live` (headless: `liveRegions: 0` on all 8) — the whole point is that it updates while someone is looking, and a screen reader announces nothing | Build in Phase 7 |
| Accordion keyboard (past events, documents) | ✅ | Native `<details>/<summary>` (`js/pages/events.js:40`) | — |
| Reduced motion | ✅ | `css/site.css:12` — global `@media (prefers-reduced-motion:reduce)` kills all animation/transition, which covers the marquee ticker | — |
| Colour contrast | ⚠️ | `tests/unit/contrast.test.js` (6 assertions) guards the tokens, but Lighthouse finds 6 real failures on the live home page: ticker `small` 3.09:1, `.pulse` 3.69:1, brand `.t` 2.56:1, brand `.s` 1.83:1, `.eyebrow` 3.5:1. The known dhokra-theme gap is already logged at `docs/pending.md:110` | Build in Phase 7 |
| Input font ≥ 16px (iOS zoom) | ❌ | Measured computed `font-size: 13.3333px` on all three donate-page inputs. Cause: `css/site.css:249` scopes `font:16px` to `.form input`, but the confirm form is built inside `class: 'card'` (`js/pages/donate.js:55`), so the rule never matches. Members page is correct (16px / 22px) | Build in Phase 7 — iOS Safari zooms the whole donate page on first tap, on the one page that must not fight the user |
| Form labels | ⚠️ | Every input has `aria-label` (`js/pages/donate.js:75-77`, `js/pages/members.js:53,57`), but there are zero `<label>` elements site-wide (headless: `labels: 0`), so nothing is click-to-focus and the placeholder disappears on typing | Build in Phase 7 |
| Form error messages | ⚠️ | `js/pages/donate.js:62` — a single generic `toast(t('common.error'))` for any bad input, not attached to the field and not in a live region | Build in Phase 7 |
| Language attribute | ✅ | See §2 | — |
| RTL | n/a | Bengali and English are both LTR | Not needed |
| Mobile horizontal overflow | ✅ | Headless at 390 px: `scrollWidth === clientWidth` on all 8 pages; `scripts/shots.mjs` gate is zero warnings | — |

## 5. Performance

| Item | Status | Evidence | Action |
|---|---|---|---|
| Lighthouse mobile performance | ⚠️ | **39** — FCP 2.9 s, LCP 7.1 s, TBT 30 ms, CLS 0.997, SI 7.8 s, TTI 7.2 s | Build in Phase 7 |
| First paint without Firestore | ❌ | With JS disabled the body renders exactly `…` and **0 links** (`index.html:17` `<main id="main"><p id="loading">…</p></main>`). Even with JS, `lcp-breakdown-insight` attributes 4.68 s of the 7.1 s LCP to element render delay — the page is blank until Firestore answers | Build in Phase 7 |
| Cumulative layout shift | ❌ | **0.997**, essentially all of it from one shift: Lighthouse `cls-culprits-insight` names `1,HTML,1,BODY,1,MAIN` — the `…` placeholder being replaced wholesale by the real page | Build in Phase 7 |
| Image lazy-load | ✅ | 26 of 36 images carry `loading="lazy"` (`js/pages/*.js`); the excluded ones are above the fold | — |
| Explicit `width`/`height` on images | ❌ | 25 of 36 images lack both (Lighthouse `unsized-images` 0.5). Only the UPI QR sets them (`js/pages/home.js:83`) | Build in Phase 7 |
| `srcset` / `sizes` | ❌ | `grep -rn "srcset\|sizes=" js/ admin/js/` → no match; full-size Storage uploads are served to 390 px phones | Build in Phase 7 |
| Font loading (`display=swap`) | ✅ | `index.html:12` — one Google Fonts link, four families, `&display=swap` | — |
| Render-blocking resources | ⚠️ | Lighthouse `render-blocking-insight`: est. 1,720 ms across `tokens.css`, `site.css`, `themes.css`, the Google Fonts stylesheet (987 ms) and the DOMPurify CDN script (937 ms) | Build in Phase 7 |
| Caching headers | ⚠️ | `curl -sI` → `cache-control: max-age=600` on HTML **and** on `css/site.css`. GitHub Pages fixes this and offers no override; Lighthouse `cache-insight` est. 45 KiB | Not needed to fix — see §"Not needed" |
| JS weight (Firebase SDK) | ⚠️ | 647 KiB total page weight; `firebase-firestore.js` 179 KB + `firebase-auth.js` 41 KB, of which Lighthouse reports 150 KiB unused. Pinned SDK from gstatic, no build step to tree-shake | Build in Phase 7 (load `firebase-auth` only where used) |
| Offline / PWA service worker | ❌ | `curl …/sw.js` → 404; no manifest (§2) | Build in Phase 7 — Balurghat phones on patchy data get a blank `…` page, not a cached one |
| Back/forward cache | ✅ | Lighthouse `bf-cache` audit score 1 | — |
| Main-thread work | ⚠️ | Lighthouse `mainthread-work-breakdown` scores 0, but TBT is only 30 ms — the cost is network wait, not script execution | Build in Phase 7 (covered by the LCP/CLS work) |

## 6. Security & privacy

| Item | Status | Evidence | Action |
|---|---|---|---|
| HTTPS | ✅ | `curl -sI https://…` → HTTP/2 200 | — |
| HTTP → HTTPS redirect | ✅ | `curl -sI http://…` → `301 Moved Permanently` | — |
| No mixed content | ✅ | `grep -rn "http://" *.html css/ js/ admin/` → only a code comment (`admin/js/sections/media.js:27`) | — |
| CSP / security headers | ❌ | `curl -sI` shows no `content-security-policy`, `x-frame-options` or `strict-transport-security`. GitHub Pages does not let a site set response headers | Owner-only — a `<meta http-equiv="CSP">` is possible but would need auditing against the gstatic/cdnjs/fonts origins; real headers need a different host or Cloudflare in front |
| App Check | ❌ | `js/firebase-config.js:11` — `export const APPCHECK_SITE_KEY = "PASTE";` on `main`, i.e. App Check is not enforced on production | Owner-only — already tracked at `docs/pending.md:64` |
| Firestore rules — public read scope | ✅ | Re-confirmed in `firestore.rules`: world-readable = `settings/site`, `content/{strings,media}`, and published-and-not-deleted rows of `history`/`events`/`culture`/`albums`/`photos`/`transparency`/`announcements`, public committee rows, and `donations` only where `showOnWall == true`. `members`/`notices`/`roster`/`audit`/`admins` are gated; `match /{document=**} { allow read, write: if false }` closes the rest (`:193`) | — |
| Donor phone never stored | ✅ | `firestore.rules:160` — `!('phone' in request.resource.data)` rejects the field on every donation write | — |
| Members data private | ✅ | `firestore.rules:175` — own-doc only, `request.auth.token.phone_number == docId` | — |
| Admin route unlisted | ✅ | `admin/index.html:6` — `<meta name="robots" content="noindex, nofollow">`; `/admin/` is absent from `NAV` (`js/shell.js:10-19`) | — |
| No secrets in client | ✅ | `js/firebase-config.js` holds only the public web config (documented as public by design in `CLAUDE.md`); no service-account key or token anywhere in the repo | — |
| Subresource integrity on CDN script | ✅ | `index.html:19` — DOMPurify 3.2.4 pinned with `integrity="sha384-…"` + `crossorigin` | — |
| Cookie / consent banner | n/a | No analytics, no ad tech, no third-party cookies. Only `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `www.gstatic.com` are contacted, and storage use is first-party functional (`localStorage('design')`, Firebase persistence) | Not needed |

## 7. Trust & credibility

| Item | Status | Evidence | Action |
|---|---|---|---|
| Registration number shown | ✅ | Footer (`js/shell.js:134`) and transparency legal block (`js/pages/transparency.js:93`) | — |
| Registration number is real | ❌ | Live value is the demo placeholder `WB/2026/DEMO` (`docs/pending.md:66`) | Owner-only |
| 80G status | ⚠️ | Rendered conditionally with an honest "রেজিস্ট্রেশনের পরে / after registration" fallback (`js/pages/transparency.js:94`) — correct behaviour, but registration is still in progress | Owner-only |
| Address | ✅ | Footer + transparency legal block (`js/pages/transparency.js:95`) | — |
| Trustees identified | ⚠️ | `committee.html` lists names and posts; nothing distinguishes a legal trustee from a committee volunteer, and the trust deed is not published | Build in Phase 7 (page) + Owner-only (deed PDF) |
| Audit reports | ⚠️ | The documents accordion works, but every PDF currently live is a generated dummy (`docs/pending.md:66`) | Owner-only |
| Contact details | ✅ | tel / WhatsApp / email / map in the footer of all 8 pages | — |
| Last-updated dates | ❌ | `grep -rn "updatedAt\|lastUpdated\|শেষ আপডেট" js/pages/ js/shell.js` → no match; no page shows when its content was last changed | Build in Phase 7 — a ledger with no date next to it is hard to trust |
| Real photos | ❌ | All committee/album/hero imagery is placeholder (`docs/pending.md:103`); drawn art is the fallback everywhere else | Owner-only |
| Consistent naming | ✅ | "গণেশ পুজো ট্রাস্ট" from `settings.name` everywhere — nav brand, `document.title`, footer, transparency block | — |
| Bengali spelling (spot-check, 20+ strings) | ⚠️ | Sampled `js/i18n.js:150-215` — `mem.*`, `home.*`, `nav.*`, `footer.*`, `donate.*`, `tr.*`, `committee.*`, `gallery.*`, `admin.*`. Spelling, conjuncts and register are correct throughout; no typos found. One defect: `cred.registered` (`js/i18n.js:161`) has `bn: 'Registered Trust'` — untranslated English sitting in the Bengali slot, on the home credibility strip | Build in Phase 7 |

## 8. Admin usability

| Item | Status | Evidence | Action |
|---|---|---|---|
| Login | ✅ | `admin/js/admin.js:48` — `signInWithEmailAndPassword` | — |
| Forgot-password path | ❌ | `grep -rn "sendPasswordResetEmail\|forgot" admin/ js/` → no match. A locked-out single admin has no self-service route back in | Build in Phase 7 |
| Session persistence | ✅ | `browserLocalPersistence` fixed at construction via `initializeAuth` (`docs/PROJECT_CONTEXT.md` §4) | — |
| Help link to the admin guide | ❌ | `grep -rn "admin-guide\|user-guide\|help" admin/index.html admin/js/admin.js` → no match; `docs/user-guide/admin-guide.md` exists but is unreachable from the panel | Build in Phase 7 |
| Preview before publish | ⚠️ | Only 3 of 16 sections offer one: albums (`albums.js:55`), history (`history.js:46`), transparency (`transparency.js:185`). Events, committee, culture, strings, media, settings, design, donations, notices, roster have none | Build in Phase 7 |
| Image upload from phone | ✅ | `admin/js/upload.js` + client-side downscale in `admin/js/resize.js` (unit-tested) | — |
| Undo / restore soft-deleted items | ❌ | Every section writes `deleted: true`, but no section renders deleted rows or offers a restore control (`grep -rn "restore\|undelete" admin/js/` → no match). The data is recoverable only via the Firebase console | Build in Phase 7 |
| Backup / export | ⚠️ | `admin/js/sections/export.js:7` — `const COLLS = ['history', 'committee', 'albums', 'events', 'audit']` plus `settings/site`. **Misses 9 collections/docs**: `donations`, `transparency`, `announcements`, `members`, `notices`, `roster`, `culture`, `content/strings`, `content/media` — i.e. everything Phases 2–6 added, including the ledger and the member register | Build in Phase 7 — highest-value admin fix; the backup button silently produces an incomplete backup |
| Audit-log viewer | ❌ | `admin/js/audit.js` only writes; rules allow `isAdmin()` read (`firestore.rules:139`); no section registers an audit UI (16 `registerSection` calls enumerated, none for `audit`) | Build in Phase 7 |
| 2-step / re-auth strength | ⚠️ | No MFA. Sensitive actions re-prompt via an unmasked `prompt()` (`admin/js/admin.js:91`) — already logged at `docs/pending.md:37` | Build in Phase 7 (masked re-auth) + Owner-only (MFA enrolment) |
| Search / filter in long lists | ⚠️ | Only ✏️ লেখা has a filter (`admin/js/sections/strings.js:47`); committee, donations and members lists are unfiltered | Build in Phase 7 |
| Email verified | ❌ | No `emailVerified` check on the admin gate (`admin/js/admin.js:77` checks only the `admins/{uid}` doc) | Owner-only — verify the admin address in the Firebase console |

## 9. Ops

| Item | Status | Evidence | Action |
|---|---|---|---|
| Uptime / availability monitoring | ❌ | Nothing in the repo or docs; no external check configured | Owner-only — needs an account on a monitoring service |
| Client error reporting | ❌ | Errors reach `console.error` / `toast()` only (`js/pages/*.js`, `admin/js/audit.js:8`); no Sentry/Crashlytics and no `window.onerror` hook. Nobody learns that a visitor's page broke | Build in Phase 7 |
| Automated backups | ❌ | Backup is a manual button press (`admin/js/sections/export.js:14`) producing a browser download; no schedule, no off-site copy | Build in Phase 7 (scheduled export) + Owner-only (where it is stored) |
| Budget alert | ✅ | ₹100 Blaze budget alert set (`docs/PROJECT_CONTEXT.md` §3) | Owner-only to keep current |
| Dependency pinning | ✅ | Firebase SDK pinned to 12.18.0 from gstatic; DOMPurify pinned to 3.2.4 with SRI; `package.json` is dev-tooling only (no build step) | — |
| Test coverage | ✅ | 93 unit (`node --test tests/unit/`), 27 rules with mutation checks, 38 Playwright e2e across 3 projects, plus `scripts/shots.mjs` (8 pages × 5 themes × 3 widths, zero-overflow gate) — counts from `docs/PROJECT_CONTEXT.md` §7 | — |
| CI | ❌ | `ls .github` → does not exist; nothing runs the suite on push | Build in Phase 7 |
| Deploy process documented | ✅ | `docs/user-guide/deploy.md`, `docs/user-guide/go-live-checklist.md`, `scripts/deploy-rules.sh` (runs the full suite before deploying), `scripts/pre-commit-docs.sh` | — |

---

## Counts

| Status | Count |
|---|---|
| ✅ present | 47 |
| ⚠️ partial | 24 |
| ❌ missing | 43 |
| n/a | 4 |
| **Total** | **118** |

---

## 1. Lighthouse mobile scores

`npx lighthouse https://hrishi91.github.io/trust_webpage/ --only-categories=performance,accessibility,best-practices,seo`
— Lighthouse 13.4.1, mobile emulation, fetched 2026-09-12T04:56:54Z.

| Category | Score |
|---|---|
| Performance | **39** |
| Accessibility | **95** |
| Best Practices | **96** |
| SEO | **100** |

Metrics: FCP 2.9 s · LCP 7.1 s · TBT 30 ms · **CLS 0.997** · Speed Index 7.8 s · TTI 7.2 s.
Total transfer 647 KiB.

Read the two high scores carefully. **SEO 100 does not mean the site is findable** — Lighthouse's
SEO category checks title/description/viewport/crawlable-links and treats a missing `robots.txt` as
valid; it never checks sitemap, canonical, OG or structured data, all of which are absent.
**Accessibility 95 is an automated subset** — it still flagged 6 contrast failures, an `svg[role=img]`
with no accessible name, and a brand link whose `aria-label` does not contain its visible text, and
it cannot see the keyboard-inaccessible lightbox or the invalid tablist at all.

The performance score has one dominant cause: the page is an empty `…` until Firestore answers,
so LCP is 4.68 s of element-render-delay and CLS is 0.997 from a single `<main>` replacement.

## 2. Phase 7 build list (prioritised)

### Pages & legal
1. **`404.html`** — a bad path serves the bilingual site 404 with nav and a home link, not GitHub's English page. *Accept:* `curl -sI …/nonsense` returns the site's own 404 body.
2. **Privacy policy + terms page** — one bilingual page stating what donor and member data is held and for how long. *Accept:* `/privacy.html` → 200, linked from the footer on all 8 pages.
3. **Donation / refund policy** — stated position on mistaken UPI transfers, linked from `donate.html`. *Accept:* `donate.html` shows a policy link above the confirm form.
4. **"About the trust" page** — purpose, founding, trustees vs volunteers, what donations fund. *Accept:* `/trust.html` → 200 with a bilingual purpose section and a named trustee list.
5. **Thank-you state after donation** — the donate page confirms on-site after the WhatsApp handoff. *Accept:* submitting the confirm form leaves a visible bilingual acknowledgement on the page.
6. **Contact page with a form** — WhatsApp-backed, no new backend. *Accept:* `/contact.html` → 200 with tel/WhatsApp/email/map and a message field that pre-fills `wa.me`.
7. **Downloads page** — every PDF (deed, audits, certificates) on one URL. *Accept:* `/downloads.html` lists every published `transparency` document.
8. **News/updates archive** — announcements past the ticker's 5. *Accept:* `/news.html` lists all non-deleted announcements, newest first.
9. **FAQ page** — the 8–10 questions the committee actually gets. *Accept:* `/faq.html` → 200, linked from the footer.

### SEO & share
10. **Static OG/Twitter tags per page** (+ wire the existing unused OG image slot). *Accept:* pasting any page URL into WhatsApp shows a title, description and image.
11. **Favicon set + web manifest + `theme-color`** — `.ico`, 192/512 PNG, apple-touch-icon. *Accept:* `curl -sI …/favicon.ico` → 200 and Lighthouse's console-404 error clears.
12. **`robots.txt` + `sitemap.xml`** (sitemap excluding `/admin/`). *Accept:* both return 200 and the sitemap lists all 8 public pages plus the new ones.
13. **Bengali static `<title>` per page + `rel=canonical`.** *Accept:* view-source on each page shows a Bengali title and a self-canonical, with no JS.
14. **JSON-LD `Organization`/`NGO` sitewide and `Event` on `events.html`.** *Accept:* Google's Rich Results test passes on `/` and `/events.html`.
15. **Share row (WhatsApp / Facebook / copy link) on home, gallery, events, donate, transparency.** *Accept:* the WhatsApp button opens a share sheet with the page URL on a real phone.
16. **`.ics` download per event.** *Accept:* the file opens in Google Calendar with the correct start/end.
17. **`@media print` stylesheet for `transparency.html`.** *Accept:* print preview shows the ledger and legal block only — no nav, ticker or footer.

### Accessibility
18. **Skip link to `#main`** on all pages. *Accept:* first Tab press on every page reveals a visible "মূল অংশে যান" link that jumps to `<main>`.
19. **Fix donate-form input font-size to 16px** (`js/pages/donate.js:55` / `css/site.css:249`). *Accept:* computed `font-size` is 16px on all three inputs and iOS Safari does not zoom on focus.
20. **Make the lightbox accessible** — `role="dialog"`, Escape to close, a close button, focus moved in and restored out, and a focusable trigger. *Accept:* a keyboard-only user can open, navigate and close it.
21. **Fix the event day tabs' ARIA** — real `role="tab"`/`aria-selected`/`aria-controls`/`role="tabpanel"` with arrow-key movement, or drop `role="tablist"` and keep `aria-pressed`. *Accept:* axe reports no ARIA-role violation on `events.html`.
22. **`aria-live="polite"` on the ticker** and on toast/error output. *Accept:* a new announcement is announced by VoiceOver without a reload.
23. **Fix the 6 live contrast failures** (ticker `small`, `.pulse`, brand `.t`/`.s`, `.eyebrow`) plus the dhokra pairs at `docs/pending.md:110`, and add each pair to `tests/unit/contrast.test.js`. *Accept:* Lighthouse `color-contrast` scores 1 on home in all five themes.
24. **Real `alt` text for committee portraits, album covers and header photos.** *Accept:* no content image on any page has `alt=""`.
25. **`<label>` elements + field-level error messages** on the donate and members forms. *Accept:* tapping a label focuses its input; an invalid amount shows an inline message linked by `aria-describedby`.
26. **`role="banner"` on `#site-header`; fix `about.html`'s `h1 → h3` skip.** *Accept:* the headless landmark check reports `banner: true` and `headingSkips: []` on all 8 pages.
27. **Fix `cred.registered`'s Bengali value** (`js/i18n.js:161`). *Accept:* the home credibility strip reads Bengali in Bengali mode.

### Performance & PWA
28. **Render a static above-the-fold shell before Firestore answers** — real nav, hero and footer markup in the HTML, hydrated on data arrival, replacing the `…` placeholder. *Accept:* CLS ≤ 0.1 and LCP ≤ 2.5 s on the Lighthouse mobile run.
29. **Service worker + manifest** — cache-first for the app shell, stale-while-revalidate for Firestore reads. *Accept:* the home page renders usable content with the network offline after one visit.
30. **`width`/`height` on every image + `srcset`/`sizes` for Storage uploads.** *Accept:* Lighthouse `unsized-images` scores 1.
31. **Load `firebase-auth` only on `members.html` and `/admin/`.** *Accept:* the home page network log shows no `firebase-auth.js`.
32. **Self-host or `preload` the four fonts and defer DOMPurify.** *Accept:* Lighthouse `render-blocking-insight` savings drop below 500 ms.

### Admin usability
33. **Fix the backup to cover all 15 collections/docs** (`admin/js/sections/export.js:7`), with a unit test asserting the list matches the rules' collection set. *Accept:* the exported JSON contains `donations`, `transparency`, `announcements`, `members`, `notices`, `roster`, `culture`, `content/strings` and `content/media`.
34. **Audit-log viewer section** — newest-first, filterable by collection. *Accept:* a 📜 লগ tile shows the row written by the immediately preceding admin edit.
35. **Restore for soft-deleted items** — a "মুছে ফেলা" toggle per list section. *Accept:* deleting then restoring a committee row returns it to the public page.
36. **Forgot-password link** on the admin login (`sendPasswordResetEmail`). *Accept:* submitting the admin address sends a reset mail.
37. **Help link to `docs/user-guide/admin-guide.md`** from the dashboard and each section header. *Accept:* every admin card has a "?" that opens the relevant guide section.
38. **Preview for the remaining 13 sections.** *Accept:* every content section with a public surface has a working `?preview=1` link.
39. **Masked re-auth** replacing `prompt()` (`admin/js/admin.js:91`). *Accept:* the re-auth field is `type="password"`.
40. **Search/filter on the committee, donations and members lists.** *Accept:* typing a name narrows the list without a refetch.

### Ops
41. **GitHub Actions CI** running unit + rules + e2e on every push. *Accept:* a PR with a deliberately broken rules test shows a red check.
42. **`window.onerror`/`unhandledrejection` reporting** to a Firestore `errors` collection (admin-read-only) or a free error service. *Accept:* a thrown error on a public page appears in the admin log within a minute.
43. **Scheduled automated backup** — a GitHub Action calling the export path on a schedule, committing to a private repo or writing to Storage. *Accept:* a dated backup artifact exists without anyone pressing a button.
44. **Last-updated timestamp** on transparency, committee and about. *Accept:* each shows a bilingual "শেষ আপডেট: <date>" drawn from the newest `updatedAt` in that collection.

## 3. Owner-only list

These cannot be done from a code session; they need the owner's accounts, money, or real documents.

1. **Replace all dummy data** — `regNo: WB/2026/DEMO`, `upiId: ganeshpujatrust@upi`, the placeholder QR, the generated audit PDFs, and every placeholder photo (`docs/pending.md:66`, `:103`).
2. **App Check** — obtain the real reCAPTCHA Enterprise site key, replace `APPCHECK_SITE_KEY = "PASTE"` (`js/firebase-config.js:11`), and confirm verified traffic in the console.
3. **Upload real photos and a logo** — hero, committee portraits, album covers, brand mark, favicon source (`docs/pending.md:103`).
4. **Trust deed + real audit PDFs** — upload once registration completes.
5. **Registration number and 80G certificate** — enter in ⚙️ সেটিংস when they arrive.
6. **Custom domain** — purchase, point DNS, then re-run `node scripts/auth-config.mjs --domain <name>` (`docs/pending.md:65`).
7. **Google Search Console** — verify ownership and submit the sitemap once Phase 7 ships it.
8. **Phone OTP on a real device** — never yet exercised end-to-end against production (`docs/pending.md:63`).
9. **Uptime monitoring** — create the account and point a check at the home page.
10. **Where automated backups are stored** — decide the private repo or bucket before item 43 is built.
11. **Admin MFA and email verification** — enrol in the Firebase console.
12. **Keep the ₹100 Blaze budget alert current** as traffic grows.
13. **Security headers beyond GitHub Pages** — only possible by putting Cloudflare (or another host) in front; a hosting decision, not a code change.

## 4. Not needed, and why

1. **`hreflang`** — both languages live at one URL behind a JS toggle; there are no alternate language URLs to declare, so the tag would point at itself.
2. **RTL support** — Bengali and English are both left-to-right.
3. **Cookie / consent banner** — no analytics, no ad tech, no third-party cookies; the only external origins are cdnjs, Google Fonts and gstatic (Firebase), and all storage is first-party functional. A banner would add friction and consent-fatigue for nothing to consent to.
4. **Google Maps iframe embed** — ~200 KB and a third-party cookie on a page already at LCP 7.1 s; the existing map link opens the visitor's own maps app, which is what a phone user wants anyway.
5. **Fixing GitHub Pages' `max-age=600` caching** — the platform sets it and offers no override. It is a real Lighthouse deduction (45 KiB) but not an actionable one without changing host; a service worker (build item 29) addresses the same symptom from the client side.
6. **Online payment gateway / donation checkout** — deliberately out of scope until 80G registration completes, so the trust can issue a proper tax receipt (`docs/PROJECT_CONTEXT.md` §5).
7. **Minifying / bundling the site's own JS** — the no-build-step rule is a deliberate maintainability decision, and the site's own JS is ~35 KB of the 647 KiB page. The weight is the Firebase SDK and the fonts, addressed by build items 31–32.
