import { getSettings, getContent, onAnnouncements } from './content.js';
import { getLang, setLang, onLangChange, pick, t, setOverrides, STRINGS } from './i18n.js';
import { el, digits, fmtDate } from './ui.js';
import { resolveTheme, applyTheme, applyOverrides, isPreview } from './theme.js';
import { mediaUrl, httpsUrl } from './media-slots.js';
import { paintHeader, onResize } from './art.js';
import { NAV, FOOTER_PAGES } from './nav-config.js';

let unsubHeader = null;

const OM_MARK = 'ॐ';
function brandMark(s) {
  const url = mediaUrl(s.media, 'brandMark') || httpsUrl(s.logoUrl);
  return url ? el('img', { src: url, alt: '', class: 'mark' }) : el('span', { class: 'mark om', text: OM_MARK, 'aria-hidden': 'true' });
}

export function section(...children) { return el('section', {}, el('div', { class: 'wrap' }, ...children)); }
export function sectionHead(title, aside) { return el('div', { class: 'sh' }, el('h2', { text: title }), aside ?? null); }
// `image`: a page-header media slot URL (js/media-slots.js `header.<page>`). When set, a photo
// (`<img>`, opacity-faded by CSS) replaces the painted-canvas background instead of layering with
// it — the two backgrounds were never designed to combine, and one image slot per header keeps
// the admin's choice unambiguous.
//
// Phase 7 Task 4 (item 28, "static shell"): scripts/sync-shell.mjs bakes a real `.ph` skeleton
// (canvas + .wrap[crumb?, h1, lead?]) into every non-home page's <main> so there's no `…`
// placeholder before Firestore answers. When that skeleton is present (and its image/no-image
// "shape" matches what this call needs), patch its existing fields in place and return the SAME
// node — main.replaceChildren(pageHeader(...), ...) then keeps it as-is (same DOM reference),
// so the header never flashes blank/rebuilds and the page's biggest above-the-fold box never
// shifts. A shape mismatch (e.g. an admin header photo where the static default had none) falls
// through to the pre-Task-4 fresh-build behaviour — a rare admin-only case, not worth patching.
export function pageHeader({ crumb, title, lead, image }) {
  const main = document.getElementById('main');
  const existing = main?.firstElementChild?.classList.contains('ph') ? main.firstElementChild : null;
  const wantPhoto = !!image;
  if (existing && existing.classList.contains('photo') === wantPhoto) {
    const wrap = existing.querySelector(':scope > .wrap') || existing;
    const crumbEl = wrap.querySelector(':scope > .crumb');
    if (crumb) { if (crumbEl) crumbEl.textContent = crumb; else wrap.insertBefore(el('span', { class: 'crumb', text: crumb }), wrap.firstChild); }
    else if (crumbEl) crumbEl.remove();
    const h1 = wrap.querySelector(':scope > h1');
    if (h1) h1.textContent = title; else wrap.appendChild(el('h1', { text: title }));
    const leadEl = wrap.querySelector(':scope > p');
    if (lead) { if (leadEl) leadEl.textContent = lead; else wrap.appendChild(el('p', { text: lead })); }
    else if (leadEl) leadEl.remove();
    if (wantPhoto) {
      const img = existing.querySelector(':scope > img.ph-img');
      if (img) { img.src = image; img.alt = title; }
    } else {
      const c = existing.querySelector(':scope > canvas.ph-bg');
      if (c) { requestAnimationFrame(() => paintHeader(c)); unsubHeader?.(); unsubHeader = onResize(() => paintHeader(c)); }
    }
    return existing;
  }
  const copy = el('div', { class: 'wrap' },
    crumb ? el('span', { class: 'crumb', text: crumb }) : null, el('h1', { text: title }), lead ? el('p', { text: lead }) : null);
  if (image) return el('div', { class: 'ph photo' }, el('img', { class: 'ph-img', src: image, alt: title }), copy);
  const c = el('canvas', { class: 'ph-bg', 'aria-hidden': 'true' });
  const ph = el('div', { class: 'ph' }, c, copy);
  requestAnimationFrame(() => paintHeader(c)); unsubHeader?.(); unsubHeader = onResize(() => paintHeader(c));   // pages re-render on langchange — never stack listeners
  return ph;
}

// `pageTitleKey`: an i18n.js STRINGS key (e.g. 'nav.about'), resolved with t() inside renderNav()
// below — never a pre-resolved string — so document.title picks up a content/strings override
// and re-resolves on langchange, same as every other piece of nav/footer copy. A caller passing a
// string that isn't a STRINGS key (defensive fallback only; every current call site passes a key)
// gets that string back as-is, so nothing that predates this behaves differently.
export async function mountShell(active, pageTitleKey) {
  const [s, c] = await Promise.all([getSettings(), getContent()]);
  setOverrides(c.strings);
  // Item 18/26: #site-header is the page's <header role="banner"> landmark; the skip link is its
  // FIRST child (ahead of the ticker/nav) so it's the very first thing a keyboard user tabs to on
  // every page. #main gets tabindex="-1" so the skip link's href="#main" can actually move focus
  // there (an element needs a tabindex to be focus()-able via fragment navigation in most browsers).
  const headerEl = document.getElementById('site-header');
  headerEl.setAttribute('role', 'banner');
  // Phase 7 Task 4: `data-shell` marks the real nav/footer markup scripts/sync-shell.mjs bakes
  // into every page's <body> (item 28). When present, renderNav()/renderFooter() below patch that
  // markup's existing nodes in place instead of replaceChildren-ing the whole header/footer —
  // "never blank the page" — and the skip link below is the one ALREADY in that static markup,
  // never a second one prepended on top of it.
  const shellMode = headerEl.hasAttribute('data-shell');
  let skip = shellMode ? headerEl.querySelector(':scope > a.skip') : null;
  if (!skip) { skip = el('a', { class: 'skip', href: '#main' }); headerEl.prepend(skip); }
  document.getElementById('main')?.setAttribute('tabindex', '-1');
  s.media = c.media;
  applyTheme(resolveTheme(s.design, location.search), { persist: !isPreview(location.search) });
  applyOverrides(s.designOverrides, s.fonts, { persist: !isPreview(location.search) });
  const favUrl = mediaUrl(s.media, 'favicon');
  if (favUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = favUrl;
  }
  document.documentElement.lang = getLang();
  let ann = [], live = false;
  // Item 22: aria-live="polite" — a screen reader announces a new/changed announcement without
  // the visitor having to reload or refocus anything; aria-atomic="false" (the default) means only
  // the changed announcement text is spoken, not the whole strip, on every snapshot update.
  const buildTicker = () => ann.length ? el('div', { class: 'ticker live-strip', 'aria-label': t('live.announcements'), 'aria-live': 'polite' },
    // Duplicated once (pass 0 and 1) for the seamless CSS marquee (width:max-content + -50%
    // translate loop needs two identical copies of the content). The live `.pulse` badge is
    // rendered only in pass 0 — otherwise e2e assertions like `.live-strip .pulse` (a single-
    // element locator) would strict-mode-violate on any page with a live announcement, since
    // duplicating it verbatim would put two badges in the DOM for one live item.
    el('div', { class: 'in' }, ...[0, 1].flatMap(pass => ann.slice(0, 5).map(a => {
      const created = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
      return el('span', { class: 'ann' }, pass === 0 && live && a.isLive ? el('span', { class: 'pulse', text: t('live.badge') }) : null,
        `${a.pinned ? '📌 ' : ''}${pick(a.text)}`, created ? el('small', { text: fmtDate(created, getLang()) }) : null);
    })))) : null;
  // Announcements arrive on their own Firestore snapshot cadence and must not disturb an
  // already-open mobile menu, so the ticker is the only piece that snapshot updates re-render:
  // it is replaced/inserted/removed as the FIRST child of #site-header, leaving `.nav` (and any
  // `.links.open`/aria-expanded state on it) untouched.
  const renderTicker = () => {
    const header = document.getElementById('site-header');
    const existing = header.querySelector('.ticker');
    const node = buildTicker();
    // skip.after(node), not header.prepend(node): the skip link must stay the header's first
    // child on every re-render (an announcements snapshot can fire long after mount), or a
    // keyboard user's very first Tab would land on the ticker instead of the skip link.
    if (node) { if (existing) existing.replaceWith(node); else skip.after(node); }
    else if (existing) existing.remove();
  };
  // Nav is rebuilt only by the initial mount and on langchange (labels/lang toggle differ) —
  // never by an announcements update, so an open burger menu survives ticker refreshes. In shell
  // mode it PATCHES the static nav (brand text, per-link text/href/class, add/remove only where
  // the visible set differs from the static default's "show everything") rather than rebuilding
  // it — keeping `.links.open` (an open mobile menu) intact across a langchange too.
  const renderNav = () => {
    document.documentElement.lang = getLang();
    skip.textContent = t('a11y.skip');
    const pageTitle = pageTitleKey ? (Object.prototype.hasOwnProperty.call(STRINGS, pageTitleKey) ? t(pageTitleKey) : pageTitleKey) : '';
    document.title = pageTitle ? `${pageTitle} · ${pick(s.name)}` : pick(s.name);
    // GitHub Pages has no server render, so this is the only place document.title/description
    // ever get the admin's override — social-media scrapers that don't run JS still see the
    // static <meta> baked into each HTML file (documented limitation, spec §2).
    const desc = pick(s.metaDescription);
    if (desc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
      meta.content = desc;
    }
    // Phase 7 Task 2 spec §2: the static assets/og/<page>.png in each HTML's <head> is what a
    // scraper that doesn't run JS (WhatsApp/Facebook/Google) sees; the admin's media-slots.js
    // 'ogImage' slot, when set, only ever reaches an in-app/JS-executing preview via this runtime
    // swap — same "static default, runtime override" split as the title/description above.
    const ogImg = mediaUrl(s.media, 'ogImage');
    if (ogImg) {
      for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
        const meta = document.querySelector(sel);
        if (meta) meta.content = ogImg;
      }
    }
    const visible = NAV.filter(([, , , vis]) => !vis || s.sectionVisibility[vis] !== false);
    const header = document.getElementById('site-header');
    const nav = shellMode ? header.querySelector(':scope > nav.nav') : null;
    if (nav) {
      const brand = nav.querySelector('.brand');
      brand.setAttribute('aria-label', pick(s.name));
      const oldMark = brand.querySelector('.mark');
      const newMark = brandMark(s);
      if (oldMark) oldMark.replaceWith(newMark); else brand.prepend(newMark);
      const lockup = brand.querySelector('.t')?.parentElement;
      const tEl = lockup?.querySelector('.t');
      if (tEl) tEl.textContent = pick(s.name);
      const tagline = pick(s.tagline);
      let sEl = lockup?.querySelector('.s');
      if (tagline) {
        if (!sEl) { lockup.appendChild(el('br')); sEl = el('span', { class: 's' }); lockup.appendChild(sEl); }
        sEl.textContent = tagline;
      } else if (sEl) {
        const br = sEl.previousElementSibling;
        sEl.remove();
        if (br?.tagName === 'BR') br.remove();
      }
      const linksWrap = nav.querySelector('.links');
      const existingLinks = [...linksWrap.querySelectorAll('a')];
      const byHref = new Map(existingLinks.map(a => [a.getAttribute('href'), a]));
      const wanted = new Set(visible.map(([, href]) => href));
      for (const a of existingLinks) if (!wanted.has(a.getAttribute('href'))) a.remove();
      let prev = null;
      for (const [key, href, tkey] of visible) {
        let a = byHref.get(href);
        if (!a) a = el('a', { href });
        a.textContent = t(tkey);
        a.className = key === active ? 'on' : '';
        if (prev) prev.after(a); else linksWrap.prepend(a);
        prev = a;
      }
      const langBtn = nav.querySelector('.lang');
      langBtn.textContent = getLang() === 'bn' ? 'EN' : 'বাং';
      langBtn.onclick = () => setLang(getLang() === 'bn' ? 'en' : 'bn');
      const burger = nav.querySelector('.burger');
      burger.setAttribute('aria-label', t('nav.menu'));
      burger.onclick = e => { const open = linksWrap.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); };
      return;
    }
    // Fallback: no static shell present — build fresh (pre-Task-4 behaviour).
    const links = el('div', { class: 'links' }, ...visible.map(([key, href, tkey]) => el('a', { href, class: key === active ? 'on' : '', text: t(tkey) })));
    const freshNav = el('nav', { class: 'nav' }, el('div', { class: 'wrap' },
      el('a', { href: 'index.html', class: 'brand', 'aria-label': pick(s.name) }, brandMark(s),
        el('span', {}, el('span', { class: 't', text: pick(s.name) }), pick(s.tagline) ? el('br') : null, pick(s.tagline) ? el('span', { class: 's', text: pick(s.tagline) }) : null)),
      links,
      el('button', { class: 'lang', type: 'button', text: getLang() === 'bn' ? 'EN' : 'বাং', onclick: () => setLang(getLang() === 'bn' ? 'en' : 'bn') }),
      el('button', { class: 'burger', type: 'button', 'aria-label': t('nav.menu'), 'aria-expanded': 'false',
        onclick: e => { const open = links.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); } },
        el('span', { class: 'bars', 'aria-hidden': 'true' }))));
    const existingNav = header.querySelector('.nav');
    if (existingNav) existingNav.replaceWith(freshNav); else header.appendChild(freshNav);
  };
  const renderFooter = () => {
    const wa = digits(s.contacts.whatsapp);
    const soc = s.social || {};
    // Only non-empty links render, in a fixed order; brand names are proper nouns, not translated
    // copy (same pattern as the existing literal 'EN'/'বাং' language-toggle label above).
    // httpsUrl() gates every admin-supplied href here — settings.social is free-text Firestore
    // data, so an unvalidated `javascript:`/`data:` value must never reach the DOM as an <a href>.
    const fb = httpsUrl(soc.facebook), yt = httpsUrl(soc.youtube), ig = httpsUrl(soc.instagram), wag = httpsUrl(soc.whatsappGroup);
    const socialItems = [
      fb ? el('a', { href: fb, target: '_blank', rel: 'noopener', text: 'Facebook' }) : null,
      yt ? el('a', { href: yt, target: '_blank', rel: 'noopener', text: 'YouTube' }) : null,
      ig ? el('a', { href: ig, target: '_blank', rel: 'noopener', text: 'Instagram' }) : null,
      wag ? el('a', { href: wag, target: '_blank', rel: 'noopener', text: t('footer.whatsapp') }) : null,
    ].filter(Boolean);
    const mapHref = httpsUrl(s.mapUrl);
    // concept footer put a <br> before the "Reg. no." line (own line, muted); missing here ran
    // the address and reg. no. together on one line with no separator.
    const col1 = [el('b', { text: pick(s.name) }), pick(s.address), s.regNo ? el('br') : null, s.regNo ? el('span', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null];
    const col2 = [el('b', { text: t('footer.contact') }),
      s.contacts.phone ? el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone }) : null,
      wa ? el('a', { href: `https://wa.me/${wa}`, text: t('footer.whatsapp') }) : null,
      mapHref ? el('a', { href: mapHref, target: '_blank', rel: 'noopener', text: t('footer.map') }) : null,
      s.contacts.email ? el('a', { href: `mailto:${s.contacts.email}`, text: s.contacts.email }) : null];
    const col3 = [el('b', { text: t('footer.pages') }),
      ...NAV.slice(1).filter(([, , , vis]) => s.sectionVisibility[vis] !== false).map(([, href, tkey]) => el('a', { href, text: t(tkey) })),
      ...FOOTER_PAGES.map(([href, tkey]) => el('a', { href, text: t(tkey) }))];
    const col4 = [el('b', { text: t('footer.trust') }),
      el('a', { href: 'transparency.html', text: t('tr.docs') }), el('a', { href: 'committee.html', text: t('nav.committee') }),
      el('span', { class: 'muted', text: `© ${new Date().getFullYear()} ${pick(s.name)}` }),
      socialItems.length ? el('div', { class: 'social' }, ...socialItems) : null];
    const footerRoot = document.getElementById('site-footer');
    const wrap = shellMode ? footerRoot.querySelector(':scope > footer > .wrap') : null;
    if (wrap && wrap.children.length === 4) {
      const cols = [col1, col2, col3, col4];
      for (let i = 0; i < 4; i++) wrap.children[i].replaceChildren(...cols[i].filter(x => x != null));
      return;
    }
    footerRoot.replaceChildren(el('footer', {}, el('div', { class: 'wrap' },
      el('div', {}, ...col1), el('div', {}, ...col2), el('div', {}, ...col3), el('div', {}, ...col4))));
  };
  renderTicker(); renderNav(); renderFooter();
  onLangChange(() => { renderTicker(); renderNav(); renderFooter(); document.dispatchEvent(new CustomEvent('langchange')); });
  const unsub = onAnnouncements((list, meta) => { ann = list; live = meta.live; renderTicker(); });
  window.addEventListener('pagehide', unsub);
  if (s.maintenance && !location.pathname.includes('/admin/')) {
    document.getElementById('main').replaceChildren(el('p', { class: 'notice', text: t('footer.maintenance') }));
    return null;
  }
  return s;
}
