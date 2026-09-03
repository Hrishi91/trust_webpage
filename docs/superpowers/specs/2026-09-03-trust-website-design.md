# Ganesh Puja Trust Website — Design Spec

*Date: 2026-09-03 · Status: approved in brainstorming, awaiting Hrishi's spec review*

## 1. What this is

A public website for the Ganesh Puja committee (a charitable Trust, registration
in progress) with a single-admin content panel, so the admin can change every
dynamic part of the site from a phone without touching code.

**Totally separate from the Chanda Collection PWA.** No shared data, backend,
users or code. Hrishi's decision: "no chanda app, totally different."

## 2. Scope — all five, in this priority

| # | Feature | Summary |
|---|---|---|
| A | Public showcase | Trust identity, history, committee, gallery, events, location |
| B | Donation | UPI/QR donation page, manual donation records, donor wall |
| C | Transparency | Year-wise income/expense summary, uploaded documents (deed, audit, certificates) |
| D | Live event hub | Realtime announcements, live banner, today's schedule during puja days |
| E | Member portal | Committee members log in (phone OTP), see own pledge/balance, internal notices, duty roster |

Built phase-wise (§8). Each phase gets its own spec → plan → build → live cycle.

## 3. Decisions and their causes

| Decision | Cause |
|---|---|
| Firebase (Firestore + Auth + Storage) backend, vanilla HTML/CSS/JS frontend, no build step | Three of five features (gallery upload, live updates, member login) need file upload + auth + realtime; Google Sheet is weak at all three, Firebase native at all three. No-build keeps it one-developer maintainable (Chanda lesson). |
| GitHub Pages hosting + custom domain (to be purchased) | Free HTTPS, known pattern; custom domain for credibility as a Trust |
| Single admin | Hrishi's requirement. Admin identity = `admins/{uid}` doc, not custom claims (no Admin SDK needed) |
| Registration no., 80G status, UPI ID, section visibility are all admin-editable settings | Trust registration is in progress; these arrive later and must not need a code change |
| Members = committee members only, phone OTP, admin pre-registered phone list, no approval queue | Small known group; only numbers the admin adds can log in — no spam registration surface |
| Member doc id = E.164 phone number | Rule becomes one line (`request.auth.token.phone_number == docId`); no uid↔phone mapping table to get wrong |
| Donor phone numbers are never stored in the website DB | Public collection + PII = one wrong rule away from a leak. Name/amount/receipt only; phone stays with admin offline |
| Bilingual bn/en, every text field `{bn, en}`, default bn, fallback to whichever exists | Same audience as Chanda app |
| Admin panel online-only (no offline queue) | One admin, edits when network exists; Chanda's offline queue complexity not justified |
| Soft delete + append-only audit log | Chanda lesson: "who did what, when" for a money-adjacent app; admin cannot erase history |
| Security is a first-class requirement | Hrishi: "remember the security" |

## 4. Architecture

```
Visitor phone ──HTTPS──► GitHub Pages (custom domain), static files
                            │
                            ├─► Firestore  content + data; direct browser reads, rules-gated
                            ├─► Storage    photos/PDFs under public/, admin-write only
                            └─► Auth       admin: email+password · members: phone OTP
Admin phone ──► same site /admin/ ──► same Firebase; writes allowed only for isAdmin()
```

- **Pages (multi-page for SEO):** `index` · `about` · `committee` · `gallery` ·
  `events` · `donate` · `transparency` · `members/` · `admin/` (not linked anywhere)
- **Shared modules:** `js/firebase.js` (init, pinned CDN modular SDK v10+),
  `js/i18n.js`, `js/content.js` (Firestore reads + cache), `js/ui.js`
- Firestore offline persistence enabled → repeat visits paint instantly
- **Images:** client-side resize before upload (max 1600px, WebP, ~150KB) — the
  main tactic for staying inside free quota
- **Rich text:** admin editor output sanitized with pinned DOMPurify before
  render; no raw `innerHTML` anywhere

### Firebase plan — open item, decided at setup

Belief (to verify with WebSearch on setup day): new Firebase projects since
late 2024 need the **Blaze** (pay-as-you-go) plan to use Storage and phone
OTP. Free quotas still apply, so expected bill is ₹0 at this scale; a **₹100
budget alert** will be set. If Hrishi declines to add a card: photos →
Cloudinary free tier, member login → email link instead of OTP. Hrishi's call.

## 5. Data model (Firestore)

| Collection | Fields | Public read |
|---|---|---|
| `settings/site` | name, tagline, logoUrl, address, mapUrl, contacts{phone, whatsapp, email}, regNo, has80G, upiId, upiQrUrl, pujaDate, sectionVisibility{}, maintenance, defaultLang | yes |
| `history/{id}` | year, title, body, images[], order, published, deleted | if published |
| `committee/{id}` | name, post, photoUrl, order, isPublic, deleted — **no phone** | if isPublic |
| `albums/{id}` | title, year, coverUrl, order, published, deleted | if published |
| `albums/{id}/photos/{id}` | url, thumbUrl, caption, order, deleted | if parent published |
| `events/{id}` | start, end, title, venue, desc, published, deleted | if published |
| `announcements/{id}` | text, pinned, isLive, expiresAt, createdAt, deleted | if not expired |
| `donations/{id}` | donorName, amount, date, mode, receiptNo, year, isAnonymous, showOnWall, deleted — **no phone** | only where `showOnWall == true` |
| `transparency/{year}` | income[{category, amount}], expense[{category, amount}], documents[{title, url}], published | if published |
| `members/{phoneE164}` | name, role, pledge, payments[{date, amount}], active | own doc only |
| `notices/{id}` | title, body, createdAt, deleted | active members |
| `roster/{id}` | date, duty, memberPhones[], note | active members |
| `admins/{uid}` | createdAt | admin |
| `audit/{id}` | uid, action, path, before, after, at | admin; append-only |

All text fields shown to visitors are `{bn, en}` objects.

## 6. Security

1. **Firestore rules: default deny.** Reads per the table above with field
   conditions; every write requires `isAdmin()` =
   `exists(/databases/$(db)/documents/admins/$(request.auth.uid))`. No client
   write path to `donations`, `audit`, `admins` except admin. `audit`: create
   only, no update/delete, even for admin.
2. **Storage rules:** `public/**` read all; write admin only; ≤ 5 MB;
   content-type must be `image/*` or `application/pdf`.
3. **App Check (reCAPTCHA v3) enforced** on Firestore and Storage.
4. **Web config is public by design — not a secret.** API key restricted by
   HTTP referrer to our domain in GCP console. Service-account JSON never in
   the repo (`.gitignore` from day 1).
5. **Admin auth:** email + password (≥ 12 chars), verified email, `/admin/`
   unlinked, re-auth prompt before delete/settings changes.
6. **Member isolation:** phone OTP; `members/{phone}` readable only by that
   phone; `active:false` locks out immediately; `notices`/`roster` readable
   only when caller's member doc is active.
7. **Rules test suite** (`tests/rules/`, emulator): every collection × {anon,
   member, other member, admin} × {read, write}. Rules are never deployed
   with a red suite. Each rule has a mutation check (break the rule, confirm
   the test fails).
8. **Backup:** admin "Export all JSON" button; guide for mirroring Storage to
   Drive.
9. **XSS:** DOMPurify on all admin-authored HTML.

## 7. Admin panel UX

- `/admin/` → login → one dashboard of cards: Announcements, Gallery, Events,
  Committee, Donations, Transparency, Members, History, Settings, Export.
- Card → list (search, draft/published badge) → edit form.
- Every form: bn + en fields side by side; **Save draft** / **Publish**.
- Photo upload: phone picker, multi-select, client resize, progress, preview,
  caption. Reorder with ↑↓ buttons (drag-drop unreliable on phones).
- Delete = soft delete + audit row. Preview button opens the public page with
  drafts (admin-only query).
- Settings → section toggles (e.g. hide Transparency until registered),
  maintenance mode, default language.

## 8. Phases

| Phase | Ships | Admin cards |
|---|---|---|
| 0 Foundation | Repo + docs discipline, Firebase project, rules + tests, App Check, auth, admin shell, i18n, deploy, custom domain | Login, Settings, Export |
| 1 Showcase (A) | Home hero + countdown, About/History, Committee, Gallery, Events | those five |
| 2 Donation + Transparency (B, C) | Donate page (UPI/QR + WhatsApp confirm), donor wall, Transparency page | Donations, Transparency |
| 3 Live hub (D) | Realtime announcements, live banner, today's schedule strip | Announcements |
| 4 Members (E) | Phone OTP login, my pledge/balance, notices, roster | Members, Notices, Roster |

Phases 0 + 1 form the first public release.

## 9. Testing

- `tests/rules/` — emulator rules matrix (dev-only npm; the site itself has no npm).
- `tests/unit/` — pure logic: i18n fallback, resize dims, countdown, donation
  totals, transparency sums (`node tests/run.js` style).
- Playwright e2e against emulator seed: public pages render; admin
  create → publish → visible publicly.
- Live verification before any "done": browser-pane checklist per phase;
  Hrishi tests OTP and upload on a real phone.
- Lighthouse mobile performance ≥ 90.

## 10. Repo discipline

`docs/PROJECT_CONTEXT.md` (decisions + causes) · `docs/pending.md` (roadmap) ·
`docs/build-log.md` (append-only) · `docs/user-guide/admin-guide.md` (Bengali)
· one subject per commit with docs in the same commit, pre-commit hook ·
secrets never in the repo.

## 11. Inputs needed from Hrishi

**Before Phase 0/1:** Trust name (bn + en); logo (or text-logo ok); this
year's puja date; colour direction (traditional vs modern) or a reference
site; domain choice (`.in` / `.org.in` / `.org`).

**Entered later via admin panel:** history text, committee list + photos,
past-year photos, address + map pin, WhatsApp number.

**When available:** registration number, 80G status, Trust UPI ID, deed/audit
PDFs, member phone list.

**Hrishi does (accounts/payments):** create Firebase project, create GitHub
repo, buy domain, decide Blaze plan at setup.
