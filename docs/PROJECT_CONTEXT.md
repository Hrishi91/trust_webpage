*Last updated: 2026-09-03 (Task 1 scaffold)*

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
| Blaze plan from day 1 | Storage needs Blaze since 2026-02-03 and phone OTP needs Blaze; free quotas unchanged; ₹100 budget alert set |
