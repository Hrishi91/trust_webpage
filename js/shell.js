import { getSettings, getContent, onAnnouncements } from './content.js';
import { getLang, setLang, onLangChange, pick, t, setOverrides, STRINGS } from './i18n.js';
import { el, digits, fmtDate } from './ui.js';
import { resolveTheme, applyTheme, applyOverrides, isPreview } from './theme.js';
import { mediaUrl, httpsUrl } from './media-slots.js';
import { paintHeader, onResize } from './art.js';

let unsubHeader = null;

const NAV = [
  ['home', 'index.html', 'nav.home', null],
  ['about', 'about.html', 'nav.about', 'about'],
  ['committee', 'committee.html', 'nav.committee', 'committee'],
  ['gallery', 'gallery.html', 'nav.gallery', 'gallery'],
  ['events', 'events.html', 'nav.events', 'events'],
  ['donate', 'donate.html', 'nav.donate', 'donate'],
  ['transparency', 'transparency.html', 'nav.transparency', 'transparency'],
  ['members', 'members.html', 'nav.members', 'members'],
];

// Phase 7 Task 1: footer-only pages (privacy/terms, about-the-trust, contact, FAQ, news archive,
// downloads) — never in the top nav bar (NAV above already fills the burger menu on mobile), just
// appended to the footer's "পাতা" column below. `refund` and `notfound` are deliberately absent:
// the refund policy is a #refund section on privacy.html, not its own link, and the 404 page is
// never something a visitor should navigate to on purpose.
const FOOTER_PAGES = [
  ['privacy.html', 'page.privacy.title'],
  ['trust.html', 'page.trust.title'],
  ['contact.html', 'contact.title'],
  ['faq.html', 'faq.title'],
  ['news.html', 'news.title'],
  ['downloads.html', 'downloads.title'],
];

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
export function pageHeader({ crumb, title, lead, image }) {
  const copy = el('div', { class: 'wrap' },
    crumb ? el('span', { class: 'crumb', text: crumb }) : null, el('h1', { text: title }), lead ? el('p', { text: lead }) : null);
  if (image) return el('div', { class: 'ph photo' }, el('img', { class: 'ph-img', src: image, alt: '' }), copy);
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
  const buildTicker = () => ann.length ? el('div', { class: 'ticker live-strip', 'aria-label': t('live.announcements') },
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
    if (node) { if (existing) existing.replaceWith(node); else header.prepend(node); }
    else if (existing) existing.remove();
  };
  // Nav is rebuilt only by the initial mount and on langchange (labels/lang toggle differ) —
  // never by an announcements update, so an open burger menu survives ticker refreshes.
  const renderNav = () => {
    document.documentElement.lang = getLang();
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
    const links = el('div', { class: 'links' },
      ...NAV.filter(([, , , vis]) => !vis || s.sectionVisibility[vis] !== false)
            .map(([key, href, tkey]) => el('a', { href, class: key === active ? 'on' : '', text: t(tkey) })));
    const nav = el('nav', { class: 'nav' }, el('div', { class: 'wrap' },
      el('a', { href: 'index.html', class: 'brand', 'aria-label': pick(s.name) }, brandMark(s),
        // concept markup put a <br> between .t and .s (two-line lockup: name, then tagline below);
        // it was dropped when this was ported in Task 5, so name+tagline ran together on one line.
        el('span', {}, el('span', { class: 't', text: pick(s.name) }), pick(s.tagline) ? el('br') : null, pick(s.tagline) ? el('span', { class: 's', text: pick(s.tagline) }) : null)),
      links,
      el('button', { class: 'lang', type: 'button', text: getLang() === 'bn' ? 'EN' : 'বাং', onclick: () => setLang(getLang() === 'bn' ? 'en' : 'bn') }),
      el('button', { class: 'burger', type: 'button', 'aria-label': t('nav.menu'), 'aria-expanded': 'false',
        onclick: e => { const open = links.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); } },
        el('span', { class: 'bars', 'aria-hidden': 'true' }))));
    const header = document.getElementById('site-header');
    const existingNav = header.querySelector('.nav');
    if (existingNav) existingNav.replaceWith(nav); else header.appendChild(nav);
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
    document.getElementById('site-footer').replaceChildren(el('footer', {}, el('div', { class: 'wrap' },
      // concept footer put a <br> before the "Reg. no." line (own line, muted); missing here ran
      // the address and reg. no. together on one line with no separator.
      el('div', {}, el('b', { text: pick(s.name) }), pick(s.address), s.regNo ? el('br') : null, s.regNo ? el('span', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null),
      el('div', {}, el('b', { text: t('footer.contact') }),
        s.contacts.phone ? el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone }) : null,
        wa ? el('a', { href: `https://wa.me/${wa}`, text: t('footer.whatsapp') }) : null,
        mapHref ? el('a', { href: mapHref, target: '_blank', rel: 'noopener', text: t('footer.map') }) : null,
        s.contacts.email ? el('a', { href: `mailto:${s.contacts.email}`, text: s.contacts.email }) : null),
      el('div', {}, el('b', { text: t('footer.pages') }),
        ...NAV.slice(1).filter(([, , , vis]) => s.sectionVisibility[vis] !== false).map(([, href, tkey]) => el('a', { href, text: t(tkey) })),
        ...FOOTER_PAGES.map(([href, tkey]) => el('a', { href, text: t(tkey) }))),
      el('div', {}, el('b', { text: t('footer.trust') }),
        el('a', { href: 'transparency.html', text: t('tr.docs') }), el('a', { href: 'committee.html', text: t('nav.committee') }),
        el('span', { class: 'muted', text: `© ${new Date().getFullYear()} ${pick(s.name)}` }),
        socialItems.length ? el('div', { class: 'social' }, ...socialItems) : null)),
    ));
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
