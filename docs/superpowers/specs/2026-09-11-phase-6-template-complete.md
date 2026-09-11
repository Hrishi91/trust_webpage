# Phase 6 — "Nothing static": every visible thing is admin-editable

Addendum to `2026-09-03-trust-website-design.md` and `2026-09-10-phase-5-design-system.md`.
Owner, 2026-09-11: "nothing static — user can change … we need UI as template." Code keeps
**layout + defaults**; every string, image, colour, font, section order and link on the public
site can be changed from `/admin/` on a phone. Defaults are what is live today, so an untouched
site looks exactly as it does now.

## 1. What becomes editable (and where it lives)

| Thing | Today | Phase 6 store | Admin card |
|---|---|---|---|
| Every UI string: nav, buttons, page titles/leads, section headings, hints, footer column titles, aria labels, messages (~130 keys) | `STRINGS` in `js/i18n.js` + ~30 inline `pick({bn,en})` literals | `content/strings` = `{ [key]: {bn,en} }` overrides; `STRINGS` becomes the default table (inline literals move into it) | **✏️ লেখা** |
| UI images: hero (idol/banner), brand mark, favicon, share (OG) image, per-page header background, donate-band image, members-teaser image, garland strip image | hand-drawn art / ॐ text / none | `content/media` = `{ [slot]: url }` for a fixed slot registry (`js/media-slots.js`); empty slot → drawn-art fallback | **🖼️ UI ছবি** |
| Culture cards (মুখা · ঢোকরা · আত্রেয়ী …) | static `js/culture.js` | `culture/{id}` collection `{title, tag, text:{bn,en}, imageUrl, order, published, deleted}`; empty collection → the three defaults from `js/culture.js` | **🏺 সংস্কৃতি** |
| Colours + fonts | five fixed token sets | `settings.designOverrides` = subset of `{bg,bg2,ivory,ivory2,ink,muted,sindoor,pitambar,durva,gold,cta,ctaInk,card,heroAccent}` as `#rrggbb`, plus `settings.fonts = {display, body}` from the four loaded families; applied as inline custom properties on `<html>` over the chosen theme | **🎨 ডিজাইন** (extended) |
| Home section order + on/off (hero, cred, glance, story, culture, gallery, schedule, ledger, donate, committee, members) | fixed order in `home.js` | `settings.homeSections = [{key, on}]` | **🎨 ডিজাইন** |
| Social links, established year, custom credibility items, meta description | none / derived | `settings.social = {facebook, youtube, instagram, whatsappGroup}`, `settings.estYear`, `settings.credItems=[{bn,en}]`, `settings.metaDescription={bn,en}` | **⚙️ সেটিংস** |

Not editable (by design): layout/markup, the theme token *names*, security rules, the admin
panel's own labels (they are also strings — editable via ✏️ লেখা like everything else, so the
only truly fixed text is the login form before any data loads).

## 2. Decisions and causes

| Decision | Cause |
|---|---|
| Overrides layered over code defaults (`t(key)` = override ?? default), never a blank-slate CMS | The owner must be able to change anything, but must never *have* to fill 130 fields to get a working site; defaults are the approved copy. |
| One `content/strings` doc, not a collection | ~130 small values read on every page load: one document read, one cache entry; a collection would be 130 reads. Doc stays far below the 1 MiB limit. |
| Media slots are a fixed registry in code | The layout decides where an image can go; the admin decides which image. Free-form slots would need layout editing, which is out of scope. |
| Drawn art stays as the fallback for every image slot | "Nothing static" must not mean "empty until uploaded". |
| Colour overrides are validated in rules (`#rrggbb`, whitelisted keys) and checked for contrast in the admin UI before save (warning, not a block) | Security-first: nothing but a colour literal can reach `style` on `<html>`; the admin sees the WCAG ratio and decides. |
| Fonts limited to the four families already loaded | Loading arbitrary Google Fonts from admin input is a new external-origin vector and a performance trap. |
| Head `<meta>`/OG tags stay static in HTML; JS sets `document.title`/description at runtime | GitHub Pages has no server render; social scrapers do not run JS. Documented limitation; the OG image slot is used by the pages we control (title/description shown in-page). |
| Culture cards seeded on production from the current three defaults (owner OAuth REST pattern, dummy-safe) | So the admin edits existing cards instead of starting from nothing. |

## 3. Data model additions

```
content/strings   { [key]: {bn: string, en: string} }            read: all · write: admin
content/media     { [slot]: string(url) }                         read: all · write: admin
culture/{id}      {title, tag, text:{bn,en}, imageUrl, order, published, deleted, createdAt, updatedAt}
settings/site     + designOverrides: {key: '#rrggbb'} (keys whitelisted) · fonts: {display, body} (whitelisted)
                  + homeSections: [{key, on}] (keys whitelisted) · social: {facebook,youtube,instagram,whatsappGroup}
                  + estYear: number · credItems: [{bn,en}] · metaDescription: {bn,en}
```
Indexes: `culture` needs `published + deleted + order` (add to `firestore.indexes.json`).

## 4. Security

- `content/{doc}`: `allow read: if true; allow create, update: if isAdmin() && doc in ['strings','media']; allow delete: if false`.
- `settings/site` write rule extends `validDesign()` with `validOverrides()` (every key in the whitelist, every value `matches('^#[0-9a-fA-F]{6}$')`), `validFonts()` (values in `['Baloo Da 2','Hind Siliguri','Tiro Bangla','Atma']`), `validHomeSections()` (list, keys in whitelist) — absent fields allowed.
- `culture`: same pattern as `committee` (`isAdmin() && hasDeletedFlag()`; public read only when `published && !deleted`).
- Public side: `applyOverrides()` re-validates keys and the hex regex before touching `style`; media URLs are set as `src`/`href` attributes only (never CSS `url()` from data, never `innerHTML`); strings go through `textContent`.
- Storage: media uploads go under `public/ui/` through the existing `imageField` (resize ≤ 1600, ≤ 5 MB rule).

## 5. Admin UX

- **✏️ লেখা**: grouped list (nav · buttons · হোম · ইতিহাস · কমিটি · গ্যালারি · অনুষ্ঠান · দান · হিসাব · সদস্য · footer · admin), search box, each row = key label + bn/en inputs prefilled with override ?? default, "default-এ ফেরাও" per row, one Save (re-auth + audit) writing only changed keys (`merge`).
- **🖼️ UI ছবি**: one row per slot: name + where it appears, thumbnail (or "আঁকা art দেখাচ্ছে"), upload, remove.
- **🏺 সংস্কৃতি**: list/edit/reorder like committee; image upload; publish toggle.
- **🎨 ডিজাইন** gains: colour rows (label, picker, hex, live contrast ratio against its ground with ✓/⚠), font selects, "থিমের রং-এ ফেরাও", home section list with ↑↓ and on/off; live preview link `?theme=<name>` keeps working (overrides also applied in preview).
- **⚙️ সেটিংস** gains social links, estYear, credItems (one per line, `bn | en`), metaDescription.

## 6. Verification

- Unit: `t()` precedence, `setOverrides` ignores unknown/malformed values, `applyOverrides` validation, `parseCredItems`, `orderSections`, contrast helper.
- Rules: content docs, overrides/fonts/sections validation accept + reject, culture read gate.
- e2e: string override visible on public + admin; media slot → hero photo mode; culture card from collection; section order/off; colour override on `<html>` style; existing 27 specs green.
- Shots matrix unchanged; admin screenshots for the four cards at 390/1366.

## 7. Out of scope

Editing layout/markup, per-viewer theme toggle, arbitrary fonts, server-side OG tags, versioning/rollback of content (audit log records before/after).
