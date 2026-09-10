# Phase 5 — Design system, all-page redesign, admin-selectable theme

Addendum to `2026-09-03-trust-website-design.md` (§8 Phases). Approved direction: the owner
reviewed five proposals and the full-site concept and said "take it as one" (2026-09-10).

## 1. What ships

- **One visual language** for every public page, taken from
  `docs/design/concept/full-site-concept.html`: Ganesh's own colours (sindoor, pitambar, durva,
  modak-white, gold) + Dakshin Dinajpur culture (Kushmandi mukha, Dhokra, Atreyee, Bangarh)
  + 2026 UI (expressive Bengali display type, bento "at a glance", restrained motion).
- **Five themes** as token sets — `siddhi` (default), `mukha`, `dhokra`, `atreyee`, `bangarh` —
  switchable by the admin from a new **🎨 ডিজাইন** dashboard card. Same markup, same JS; only
  CSS custom properties (and the hero/header canvas art) change.
- **Page anatomy** per `docs/design/page-patterns-2026-09-10.md` §2: home (hero + credibility
  strip + at-a-glance bento + this-year theme + culture cards + gallery + schedule + ledger
  summary + donate band + committee row + members teaser), about as a year timeline, committee
  as officers + member grid, gallery as best strip + album tiles, events as day tabs with a
  live row, donate as UPI card + purpose cards + WhatsApp confirm + donor wall, transparency
  as year tabs + summary strip + bars + donut + documents accordion + legal block, members as
  OTP card + dashboard.
- **Hand-drawn art component** (`js/art.js`): Ganesh line-art SVG, marigold garland, theme
  mandala/mask/coil/river/frieze hero backgrounds, page-header glow — all drawn in-browser,
  no image assets. Real photos (albums, history, committee) sit inside this frame.

## 2. Decisions and their causes

| Decision | Cause |
|---|---|
| Theme is stored as `settings/site.design` (string), **not** `settings.theme` | `theme` already means "this year's puja theme" (bilingual text shown on the hero). Reusing it would silently break the hero copy. |
| Firestore rule: if `design` is present on a settings write it must be one of the five names | Security-first (owner: "remember the security"). A stray value cannot reach `<html data-theme>` and pull in un-audited CSS. |
| Theme applied by `js/theme.js` from settings; `?theme=<name>` on public pages overrides for that page load only (admin Preview) | Admin needs to see a theme before switching the whole site. Query override never persists, so a shared link cannot re-skin the site for others. |
| Last applied theme cached in `localStorage('design')` and applied by a 1-line inline script in each page `<head>` before CSS paints | Settings load is async (Firestore). Without the cache the page would flash the default theme then swap. |
| One `css/themes.css` file holding the four non-default token blocks; default tokens live in `css/site.css` | No build step and five files of ~15 lines each is more HTTP round-trips than bytes saved. One extra stylesheet, always loaded. |
| One Google Fonts link (Baloo Da 2, Hind Siliguri, Tiro Bangla, Atma) shared by all themes | Per-theme font injection adds JS + FOUT for ~30 KB saved. Four families, `display=swap`. |
| Live announcements move from the home page to a **ticker in the shell** (all pages) | Belur Math's notice board is the most "alive" element on any reference site; a live aarti announcement should be visible from the donate page too. CSS classes `.live-strip .ann .pulse` are kept so `tests/e2e/live.spec.js` still holds. |
| New content flags: `committee.officer` (bool), `albums.featured` (bool), `settings.donatePurposes` (text, one purpose per line), `sectionVisibility.culture` | The page patterns need "officers first", "best moments strip", "purpose cards". Each is a checkbox/textarea in the existing admin forms — no new collections, no new indexes. |
| Culture cards (মুখা · ঢোকরা · আত্রেয়ী) are static bilingual copy in `js/culture.js`, hideable via `sectionVisibility.culture` | District facts (GI 2018, 2600+ artisans) do not change yearly; making them a collection is YAGNI. Admin can hide the section. |
| No photo placeholders drawn as canvas "scenes" in production | The concept's illustrated scenes stood in for photos during review. On the real site every image is a real upload; an album without a cover shows the theme's glow header, not a fake scene. |

## 3. Data model changes

```
settings/site  + design: 'siddhi'|'mukha'|'dhokra'|'atreyee'|'bangarh'   (absent → siddhi)
               + donatePurposes: string   // one per line: "bn title | en title | 501,1101,2101"
               + sectionVisibility.culture: bool (default true)
committee/{id} + officer: bool (default false)
albums/{id}    + featured: bool (default false)
```

No new collections, no new composite indexes (home's extra reads reuse the existing
committee `isPublic+deleted+order` and transparency `published+deleted+year desc` indexes).

## 4. Security

- `firestore.rules` `settings/site`: `allow create, update: if isAdmin() && validDesign()` where
  `validDesign()` is `!('design' in request.resource.data) || request.resource.data.design in
  ['siddhi','mukha','dhokra','atreyee','bangarh']`. Rules test covers accept + reject.
- `js/theme.js` `resolveTheme()` whitelists both the stored value and the `?theme=` query;
  anything else → `siddhi`.
- Applying a theme from the admin card requires re-auth (same as every settings write) and
  writes an audit row (`update`, `settings/site`, before/after).
- No new third-party origins besides `fonts.googleapis.com` / `fonts.gstatic.com`
  (`preconnect` added). No inline event handlers; the one inline `<script>` is the 1-line
  theme cache read.

## 5. Admin UX

Dashboard card **🎨 ডিজাইন** (13th tile, registered after ⚙️ সেটিংস): five tiles, each with a
CSS swatch drawn from that theme's tokens, its Bengali name and one-line description, a
**প্রিভিউ** link (opens `../index.html?theme=<name>` in a new tab) and a **চালু করুন** button
(disabled on the current theme). Apply → re-auth → `setDoc(settings/site, {design}, merge)`
→ audit → toast. Committee form gets "পদাধিকারী (সামনে দেখাও)"; album form gets "সেরা মুহূর্ত
strip-এ দেখাও"; settings form gets "দানের খাত" textarea and "দেখাও: culture".

## 6. Verification

- Unit: `resolveTheme`, `parsePurposes`, `donutArcs`, WCAG contrast ≥ 4.5:1 for
  `--ink`/`--ivory`, `--muted`/`--ivory`, `--hero-ink`/`--bg` (≥ 4.5:1) and `--cta-ink`/`--cta` (≥ 3:1, bold button text — WCAG large-text/UI floor) in all
  five token blocks (parsed from the CSS files, so CSS is the single source of truth).
- Rules: settings `design` accept/reject.
- e2e: theme from settings reaches `<html data-theme>`; `?theme=` override; admin apply →
  public reflects; existing 22 specs updated for new selectors and kept green; no horizontal
  overflow on every page at 390 px.
- Screenshot matrix: `scripts/shots.mjs` renders every page × five themes × 390/768/1366
  into `test-results/shots/` (git-ignored) for the owner's eyes and the reviewer's.

## 7. Out of scope

Payment gateway, per-viewer theme toggle, dark-mode media query (dhokra *is* the dark
theme), custom fonts hosted by us, image optimisation pipeline.
