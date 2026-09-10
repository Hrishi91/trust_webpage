# Design reference scan — 2026-09-10

Purpose: ground the "5 selectable designs" feature (Phase 5) in what real puja
mandals and modern Indian trusts actually do, and decide what to take and what
to avoid. Sites were opened in a 1280×900 browser on 2026-09-10.

## What was looked at

| Site | Kind | Take | Avoid |
|---|---|---|---|
| lalbaugcharaja.com (Lalbaugcha Raja Mandal, Mumbai) | Puja mandal, official | Language switch; committee page; "live darshan" as a first-class nav item; donation page | WordPress blog homepage (news list as the landing), saffron band + tiny text, cluttered sidebar, no hero |
| gsbsevamandal.org (GSB Seva Mandal — registered trust, 1951) | Puja trust | **Trust registration line at the very top** ("registered under Bombay Public Trust Act 1950") — credibility before anything else; two clear CTAs top-right (Donate / Seva booking); idol photo as hero | Autoplay carousel; template card row; social icons stuck to the left edge |
| mumbaicharaja.co (Mumbaicha Raja, est. 1928) | Puja mandal | Cleanest of the three: white ground, one idol cut-out with an aura, "Established 1928" eyebrow, mega-menu grouped as Mandal / Initiatives / Media | Hero is a static cut-out with no copy or action; menus hide everything behind hover |
| akshayapatra.org | Large NGO | One big photo hero + one Donate CTA; sticky nav with contact line; WhatsApp float; "How we work" section immediately after the hero | Slogan-heavy copy; stock-photo energy; too many partner logos in the hero |
| giveindia.org | Donation platform | **Legal & financial page**: reg no, 12A/80G approvals, FCRA, address, annual reports as an accordion — exactly our Transparency page's job | Everything else is plain to the point of empty |
| goonj.org | NGO | **Ticker for an urgent appeal** ("Rahat floods — contribute now") — the same idea as our live-announcement strip; mission block with bold display type | Marquee is easy to overdo; hero slider |
| hrishi91.github.io/trust_webpage (ours, today) | — | Structure and content are right (hero, countdown, live strip, transparency) | Cream ground + red header + saffron nav reads as a 2015 template; system fonts; no photography in the hero; no credibility line; nav is a coloured bar, not part of the design |

## Patterns to adopt (all themes)

1. **Credibility first.** A thin strip under the hero: `Est. <year> · Reg. no. <no> · 80G` — populated only from settings that exist (no fake numbers).
2. **One hero, one job.** A real photograph (idol / pandal / crowd) with the Trust name and a single CTA that changes with the calendar: before puja → "দান করুন", during → "🔴 লাইভ", after → "গ্যালারি".
3. **Sticky, translucent nav** that belongs to the design, not a coloured bar.
4. **Typography does the modernising.** System Bengali fonts are the biggest reason the current site feels old. Each theme pairs a characterful Bengali display face with a clean body face (Google Fonts; we already allow that origin).
5. **Photography-led sections** (gallery preview, committee) with generous whitespace; cards with soft radius, no drop-shadow soup.
6. **Motion, once.** One page-load reveal on the hero; scroll-reveal on section headings; `prefers-reduced-motion` respected. Nothing else moves.
7. **Transparency as a first-class page** (GiveIndia pattern) — already built; the redesign only restyles it.
8. **Mobile first** — every reference was worse on a phone than on desktop; our audience is phone-first.

## Patterns to avoid

Autoplay carousels · homepage-as-news-list · hover-only mega-menus · marquee everywhere · stock imagery · three competing CTAs · text under 16px on phones · decorative numbering (01/02/03) where nothing is a sequence · the three "AI-default" looks (cream + high-contrast serif + terracotta; near-black + acid accent; hairline broadsheet).

## Five directions (each is a full token system; admin picks one)

Every theme shares the same HTML/JS and content. A theme changes: palette tokens, two typefaces, hero treatment, card/nav treatment, and **one signature element**. Names are Bengali because the committee will choose among them.

### 1. উৎসব · Utsav — festive, modern (proposed default)
- **Palette:** marigold `#F2A93B` · kumkum `#B3261E` · plum ink `#3B1F2B` · ivory `#FFF8EE` · leaf `#2F6B4F` (accent for success/links)
- **Type:** display *Tiro Bangla* (Bengali serif with real character) + *Fraunces* for Latin; body *Hind Siliguri* + *Inter*
- **Layout:** full-bleed hero photo with a thin repeating marigold-garland SVG border; countdown set as a *torana* strip under the hero; sections separated by an **alpona line-pattern** (Bengali floor art) at very low contrast
- **Signature:** the alpona divider — unmistakably Bengali, never seen on a template

### 2. নির্মল · Nirmal — trust-grade minimal
- **Palette:** white `#FFFFFF` · graphite `#1F2933` · teal `#0E7C86` · mist `#E6F1F2` · one saffron dot `#E8871E` reserved for the single primary CTA
- **Type:** *Manrope* (Latin, light headings at large size) + *Noto Sans Bengali*
- **Layout:** left-aligned editorial grid, wide margins, credibility bar directly under the hero, transparency numbers shown as a quiet "at a glance" row (real figures only)
- **Signature:** a single thin vertical **ledger line** running down the left edge of every section — the visual promise of accountability

### 3. রাত্রি · Ratri — puja night, lamp-lit
- **Palette:** midnight indigo `#0F1A2E` (never pure black) · lamp gold `#E3B341` · warm white `#F5EFE3` · ember `#C9502A` · slate `#8A94A6`
- **Type:** *Baloo Da 2* (rounded, festive Bengali) for display + *Manrope* body
- **Layout:** dark hero with a soft radial **diya glow** behind the idol photo; cards with a faint gold hairline; the live strip glows instead of flashing
- **Signature:** the diya glow + countdown digits rendered as lamp-lit numerals

### 4. মাটি · Mati — earthy, handloom
- **Palette:** clay `#6B4A2E` · indigo `#2B3A67` · sand `#EFE6D3` · river green `#4E7C59` · chalk `#FBF9F4` (deliberately *not* cream + terracotta)
- **Type:** *Atma* (hand-drawn Bengali display) + *Source Sans 3* body
- **Layout:** brochure feel — big Bengali display headings, photos in rounded-square masks, generous line-height
- **Signature:** a **gamcha stripe** (thin red–green handloom stripe) as the header and footer border

### 5. প্রভাত · Prabhat — bold civic
- **Palette:** royal blue `#1E3A8A` · sunrise yellow `#FFC93C` · white · ink `#111827` · coral `#FF6B57`
- **Type:** *Baloo Da 2* extra-bold display + *Inter* body; oversized scale
- **Layout:** asymmetric colour-block sections; the Trust name itself is the hero graphic; nav sits inside the first block
- **Signature:** an oversized Bengali letterform (**গ**) as a translucent background glyph on the hero and footer

## How the admin will choose

- New card **🎨 ডিজাইন** in `/admin/`: five thumbnails (static SVG previews shipped with the site), a **Preview** button per theme (opens the public site with `?theme=<name>` — visible only to that browser, visitors unaffected) and **Apply** (writes `settings/site.theme`, audit row).
- Public pages read `settings.theme`; a `?theme=` override wins for preview. Theme = `css/themes/<name>.css` (token overrides + a few `[data-theme=…]` structural rules) + the theme's Google Fonts link injected by `shell.js`. No JS branching per theme beyond the signature element.
- Switching is instant for visitors on their next load; no deploy.

## Next

Spec addition (§4a "Themes") → plan (theme engine and token refactor → 5 themes, each verified on phone + desktop with screenshots → admin card + preview/apply → e2e) → build with per-task reviews, as before.
