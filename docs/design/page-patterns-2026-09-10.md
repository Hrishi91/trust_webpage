# Page patterns — how real temple/mandal/trust sites present every page (2026-09-10)

Full-page screenshots (desktop 1366 px + phone 390 px) taken on 2026-09-10 of:
Shree Siddhivinayak Ganapati Temple Trust (siddhivinayak.org), Belur Math /
Ramakrishna Mission (belurmath.org), Lalbaugcha Raja Mandal (lalbaugcharaja.com),
GSB Seva Mandal (gsbsevamandal.org), Akshaya Patra (akshayapatra.org), GiveIndia
(giveindia.org). Screenshots stay out of the repo (copyright); this file records
what they do, page by page, and what our site does in response.

## 1. Home pages — full-length anatomy

| Site | Section order (top → bottom) | Length | Verdict |
|---|---|---|---|
| Belur Math | photo hero (arch + sky) · social row · Bengali notice board card (paper texture, dates) · daily darshan + quote · **Latest news** (4 cards) · About · **Our inspiration** (3 portraits) · Administration (4 monks) · **Online donations** (4 purpose cards) · Activities (4 photos) · Visit (map/cards) · dense footer (timings, emails, quote) | 8 000 px | Dense but every block has a job; the notice board is the most "alive" element |
| Siddhivinayak | thin hero · three big cards (**Visit / Live darshan / App**) · Gallery band (photo + text) · Charitable activities (4 items) · Pooja list carousel · footer (About, Sevas, Contact, Phones) | 4 400 px | Cleanest structure of the temple sites; typography weak; broken images |
| Lalbaugcha Raja | banner (idol + name) · red nav · news posts as a **blog list** (letters, certificates, posters) · sidebar (language, news thumbs) · big gold **Donate Now** + app badges | 8 700 px | Homepage = newsfeed. Readable for regulars, confusing for a first visitor |
| GSB Seva Mandal | idol photo hero · About + 3 cards (Trust / Projects / Activities) · **Seva grid** (8 photo tiles: Anna daan, Tulabhar, …) · appeal letter + poster · footer (links, newsletter, contact) | 3 200 px | Best "what can I do here" grid; registration line under the logo |
| Akshaya Patra | slogan hero + Donate · "How we work" (5 circle icons) · Impact stories (photo band) · About + mission · **stats row** (5 numbers) · SDG logos · Campaign cards · Testimonial · Latest updates · CTA band · footer with **UPI QR** | 5 700 px | Professional NGO template; everything centered; stats row and QR are worth copying |

**What we adopt on home** (already in the homepage concept): one hero with one job · credibility strip · live strip (Belur's notice-board energy, Goonj's ticker) · "এক নজরে" (Siddhivinayak's three big cards, as a bento) · theme story · **culture cards** (our own) · gallery masonry · schedule tabs · transparency bars + donut · donate band with UPI QR (Akshaya Patra's footer QR, promoted) · committee row · members teaser · footer with reg no. **What we refuse:** homepage-as-newsfeed, autoplay hero slider, three competing CTAs, centered-everything.

## 2. Inner pages — what each site does, what we do

### About / History
- Akshaya Patra: breadcrumb · h1 with underline · **YouTube video embed** · four paragraphs · stats row · CTA band. Belur Math: long text + portraits. GiveIndia: one paragraph, then legal.
- **Ours (`about.html`):** breadcrumb-less (nav is enough) · h1 "ইতিহাস" · **year timeline** (2021→2026) as the spine: each year = a card with rich text + 1–3 photos, newest first, sticky year rail on desktop · "কারা আমরা" paragraph · culture cards reused · CTA "কমিটি দেখুন". No video block until there is a real video.

### Committee
- Lalbaugcha Raja: plain list, post in bold, ~40 names — readable, zero design. Belur Math: 4 portrait cards with titles. GiveIndia: board list.
- **Ours (`committee.html`):** office-bearers first (4 large portrait cards: photo, name, post, one line) · then members in a compact 3-col grid (photo circle, name, post) · "সদস্য হতে চান?" note → members portal. Phone: 2-col.

### Gallery
- Lalbaugcha Raja: **year/album tiles** (gold gradient, image + label) — right idea, dated execution. GSB: photo tiles with captions. Siddhivinayak: one band.
- **Ours (`gallery.html`):** albums as year-grouped tiles with real cover photos and counts ("২০২৫ · ৬ ছবি") · album page = masonry with lightbox, swipe on phone, caption + year · "সেরা মুহূর্ত" strip at top (admin-pinned 4 photos).

### Events / schedule
- None of the six has a real schedule page (Belur has a festival calendar link).
- **Ours (`events.html`):** day tabs (বোধন · মহাপুজো · সাংস্কৃতিক · বিসর্জন) · timeline rows (time · title · venue) · "🔴 লাইভ এখন" row auto-highlighted · past events collapse under "পুরনো অনুষ্ঠান" · add-to-calendar link.

### Donate
- Belur Math: photo + explanation · **80G line** · accordions (Indian / international / gateway) · **purpose-based donation cards** (Math / Mission / Guru Pranami …) each with a Donate button. Siddhivinayak: text + bank table + one button. Akshaya Patra: UPI QR in the footer.
- **Ours (`donate.html`):** (1) UPI card — big QR + UPI ID + "UPI দিয়ে দিন" deep link (2) **purpose cards** (Belur pattern): প্রতিমা · ভোগ · সাংস্কৃতিক · সাধারণ — each with a suggested amount chip, all going to the same UPI (purpose only in the WhatsApp message) (3) "কীভাবে জানাবেন" — WhatsApp confirm form (4) 80G / registration status line, honest (5) **donor wall** with anonymous option. No bank-account table until the Trust account exists.

### Transparency (হিসাব)
- GiveIndia: **Legal & Financial** page — registration numbers, 12A/80G validity, FCRA, address, **annual reports as accordions**, board list. This is the gold standard for a trust.
- **Ours (`transparency.html`):** year tabs · summary strip (আয় · ব্যয় · উদ্বৃত্ত) · two ledgers · donut · **documents accordion** (audit PDF, trust deed, registration certificate — as they arrive) · legal block (reg no, 80G status, address, trustees) · "প্রশ্ন থাকলে" contact.

### Members portal
- No reference site has one; Belur has guest-house rules, Lalbaug has an app.
- **Ours (`members.html`):** phone OTP card · my pledge/paid/due (three tiles) · payments list · notices (rich text) · duty roster (my duties first) · logout. Same visual language as the public site, no separate "app" feel.

### Admin
- Not visible on any reference. Ours stays the 12-card dashboard; the new **🎨 ডিজাইন** card adds theme preview/apply.

## 3. Phone behaviour (from the 390 px captures)
- Belur Math collapses cleanly (cards stack, notice board readable). Siddhivinayak keeps its three cards but the gallery band becomes a tall image with tiny text. GSB's hero idol crops badly.
- **Rules for us:** hero art scales (SVG), never crops a face · bento → 2×2 → 1 col · masonry → 2 col · tables (হিসাব) scroll inside their own container · sticky nav collapses to logo + burger · touch targets ≥ 44 px · one thumb-reachable Donate button on every page (bottom sheet on phone).

## 4. Sitemap (final)

```
/ (home) · /about (ইতিহাস) · /committee · /gallery (+?album=) · /events · /donate ·
/transparency (হিসাব) · /members (OTP) · /admin/ (12 cards + 🎨 ডিজাইন)
```

## 5. What changes in the codebase (Phase 5 scope)

1. Theme engine: `css/site.css` → tokens + `css/themes/<name>.css`; `<html data-theme>` from `settings.theme`; `?theme=` preview override; per-theme Google Fonts link injected by `shell.js`.
2. Hero art component (`js/art.js`): Ganesh line-art SVG, garland/diya/mandala canvas — theme-aware; used on home and as page headers.
3. Every public page restyled to the patterns above (structure changes on about/committee/donate/transparency as listed).
4. Admin **🎨 ডিজাইন** card: 5 thumbnails, Preview, Apply (writes `settings.theme`, audit).
5. Screenshot verification at 390 / 768 / 1366 for every page in every theme (Playwright), contrast check per token pair.
