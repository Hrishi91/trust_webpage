# Design thinking — culture × references × modern UI (2026-09-10)

Companion to `reference-scan-2026-09-10.md`. This is *how* the five themes are
derived, so the choices can be argued with rather than just liked.

## 1. The subject, pinned

- **Subject:** a neighbourhood Ganesh Puja run by a charitable Trust in Malda,
  West Bengal — five years old, three sides of town, hundreds of small donors.
- **Audience:** donors and neighbours on phones (bn first), committee members,
  and the occasional auditor/official on a desktop reading the Transparency page.
- **The page's single job:** make a stranger trust this committee with money
  in under ten seconds — then let them give, look, or join.
- **Voice:** warm, plain, specific. "দান করুন", not "Support our noble cause".

## 2. Cultural vocabulary → design material

Culture is not decoration here; each element is used only where it *means*
something the page also means.

| Vocabulary | What it is | What it means | Where it earns its place |
|---|---|---|---|
| **আলপনা** alpona | Rice-paste floor drawing at thresholds and rituals: creepers, paddy, lotus, Lakshmi's feet | Welcome, blessing, prosperity, drawn by hand each time | Section dividers and the hero threshold in **Utsav** — "you are entering the courtyard" |
| **গাঁদা** marigold | Garlands on the idol, the gate, the car | Festivity, the smell of puja days | Hero border strip; the accent colour, never the ground |
| **সিঁদুর / হলুদ** kumkum & haldi | Vermilion and turmeric on the idol and the invitation card | Auspicious beginning | Primary CTA reds/yellows — reserved for *actions* |
| **প্রদীপ** diya | Oil lamp, evening aarti, the glow on the idol's face | Devotion, the night the whole para gathers | The glow behind **Ratri**'s hero; the live badge's pulse |
| **কাঁথা / গামছা** kantha stitch, gamcha stripe | Running-stitch quilt lines; red-green checked cotton towel every volunteer carries | Everyday, hand-made, working-class Bengal | **Mati**'s header/footer stripe (gamcha) and the stitched underline on headings |
| **মোদক / লাড্ডু**, **পদ্ম**, শুঁড়ের বাঁক | Ganesh iconography: the sweet, the lotus, the curve of the trunk | The deity himself — remover of obstacles, patron of beginnings | One curved brush-stroke motif (trunk curve) used as the loader/ornament, never a cartoon Ganesh |
| **মালদার আম / রেশম** Malda mango & silk | The district's own — Fazli mango, mulberry silk, Gambhira masks | Local pride, "this is *our* town's puja" | Mango-leaf green as **Utsav**'s secondary; silk-like gradient on the credibility strip; a Gambhira mask line-icon for the culture section |
| **ঢাক** dhak rhythm | The drum that announces puja | Urgency, "it is happening now" | The live strip's one-beat pulse (not a marquee) |

Rule: at most **one** cultural signature per theme. Two becomes a poster.

## 3. What "modern" concretely means in 2026 (and what we keep)

From the trend scan, filtered through *this* audience (phone, mid-range
Android, sometimes 3G):

| 2026 pattern | Keep? | How it appears |
|---|---|---|
| Expressive / oversized typography | **Yes** — the cheapest way to look current, and Bengali display faces are gorgeous at size | Hero name at 44–64px on phone, one weight change per level |
| Warm minimalism, generous whitespace | **Yes** | 8-pt spacing scale, sections breathe; never more than 2 accents |
| Bento grid | **Partly** — for "at a glance" (countdown · donations · next event · live) on home only | A 2×2 that collapses to 1 column; never for prose |
| Restrained motion | **Yes** | One hero reveal, scroll-reveal on headings, the live pulse; `prefers-reduced-motion` honoured |
| Glassmorphism / blur nav | **Light touch** | Sticky nav with 8px blur on all themes except Mati (paper feel) |
| Broken grids, kinetic type, 3D | **No** — cost, phone performance, and it reads as an agency site, not a trust |
| Dark mode | **As a theme (Ratri), not a toggle** | Keeps admin choice simple |

## 4. The shared skeleton (identical in all five themes)

```
┌────────────────────────────────────────────────┐
│ ● logo  Trust name           বাং/EN  ☰          │  sticky, translucent
├────────────────────────────────────────────────┤
│                                                │
│   [ hero photo / theme treatment ]             │  one photo, one line, one CTA
│   গণেশ পুজো ট্রাস্ট · সবার পুজো, সবার উৎসব    │
│   [ দান করুন ]                                 │
│                                                │
├──── Est. ২০২১ · Reg. WB/… · 80G ──────────────┤  credibility strip (only real facts)
│ 🔴 লাইভ  মণ্ডপে আরতি চলছে…                     │  live strip (only when live)
├────────────┬───────────────────────────────────┤
│ countdown  │ next event                        │  bento "at a glance"
│ ১১ দিন    │ ১৬ সেপ্টে · মূল অনুষ্ঠান           │
├────────────┴───────────────────────────────────┤
│ এই বছরের থিম  · ইতিহাস teaser · গ্যালারি row   │  photography-led
│ কমিটি · হিসাবের সারাংশ (real numbers)          │
├────────────────────────────────────────────────┤
│ footer: address · WhatsApp · map · reg no      │
└────────────────────────────────────────────────┘
```

Type scale (all themes): 15/17 body · 20 lead · 28 h2 · 40–56 h1 (phone→desktop);
line-height 1.6 body, 1.15 display; Bengali display faces get +4% size to match
Latin x-height.

## 5. The five themes as decisions, not moods

For each: the one risk taken, and why it fits *this* Trust.

### উৎসব Utsav — "the courtyard on puja morning"
- Risk: an **alpona line-pattern** drawn as SVG (paddy + lotus creeper) at 6% ink,
  used as every section threshold. Nobody's template has it; every Bengali reads it.
- Tokens: marigold `#F2A93B` (accent) · kumkum `#B3261E` (CTA) · plum ink `#3B1F2B`
  · ivory `#FFF8EE` (ground) · mango-leaf `#2F6B4F` (links/success).
- Type: **Tiro Bangla** display (a book face — serious, not cute) + **Hind Siliguri** body.
- Hero: full-bleed photo, a 14px marigold-garland border along the top edge only.
- Why default: it is the only one that says "Bengali puja" *and* "modern" at once.

### নির্মল Nirmal — "the auditor's favourite"
- Risk: a **ledger line** — a 2px vertical rule at the left margin of every
  section, with tiny tick marks at section starts. It is the Transparency page's
  spine, carried to the whole site.
- Tokens: white · graphite `#1F2933` · teal `#0E7C86` · mist `#E6F1F2` · one saffron
  `#E8871E` for the single CTA.
- Type: **Manrope** light display + **Noto Sans Bengali** body.
- Hero: photo on the right third, text left; no gradient. Numbers row uses real
  figures from Transparency only.

### রাত্রি Ratri — "evening aarti"
- Risk: the entire site lives at night: indigo `#0F1A2E` ground, a **radial
  diya glow** (`radial-gradient` in lamp gold) behind the idol photo; countdown
  digits get a faint text-shadow like lamp light. Dark themes are common; a
  *warm* dark with gold and ember is not.
- Tokens: midnight `#0F1A2E` · lamp gold `#E3B341` · warm white `#F5EFE3` · ember `#C9502A` · slate `#8A94A6`.
- Type: **Baloo Da 2** display (rounded, festive) + **Manrope** body.

### মাটি Mati — "handloom and paper"
- Risk: a **gamcha stripe** (red–green–white 3px repeating) as the top and bottom
  border of the page, and a running-stitch (dashed) underline on h2s — kantha.
- Tokens: clay `#6B4A2E` · indigo `#2B3A67` · sand `#EFE6D3` · river green `#4E7C59` · chalk `#FBF9F4`.
  (Deliberately *not* cream + terracotta + serif — the AI default.)
- Type: **Atma** display (hand-drawn) + **Source Sans 3** body. No blur, no glass — paper.

### প্রভাত Prabhat — "the morning announcement"
- Risk: **the Trust name is the hero** — 64px+ Baloo Da 2 in royal blue on
  sunrise yellow, with a giant translucent **গ** behind it; sections are solid
  colour blocks. No photo in the hero at all — the photo comes second.
- Tokens: royal blue `#1E3A8A` · sunrise `#FFC93C` · white · ink `#111827` · coral `#FF6B57`.
- Type: **Baloo Da 2** extra-bold + **Inter**.

## 6. Self-critique before building

- Utsav and Mati both use a "Bengali craft" motif — kept, because alpona
  (ritual, drawn) and gamcha (everyday, woven) are different registers; if they
  still feel alike in the mockup, Mati loses the stripe and keeps only the
  stitched underline.
- Ratri's glow must be a gradient, not a blurred PNG — phone performance.
- Prabhat's yellow ground risks glare on cheap screens: the yellow is a hero
  block only; body sections are white.
- Every theme is checked at 360px width, with a 10-word Bengali headline,
  before it is called done.

## 7. Accessibility and performance floor (all themes)

Contrast ≥ 4.5:1 for body text (checked per token pair) · visible focus rings
in the theme's accent · `prefers-reduced-motion` disables reveals and the pulse
· fonts loaded with `display=swap`, two families per theme max · hero image
≤ 200 KB WebP with `fetchpriority=high` · no layout shift from fonts (size-adjust).
