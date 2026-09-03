import { getSettings } from './content.js';
import { getLang, setLang, onLangChange, pick, t } from './i18n.js';
import { el } from './ui.js';

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

export async function mountShell(active, pageTitle) {
  const s = await getSettings();
  document.documentElement.lang = getLang();
  const render = () => {
    document.documentElement.lang = getLang();
    document.title = pageTitle ? `${pageTitle} · ${pick(s.name)}` : pick(s.name);
    document.getElementById('site-header').replaceChildren(
      el('header', { class: 'site-top' },
        el('a', { href: 'index.html', class: 'brand' },
          s.logoUrl ? el('img', { src: s.logoUrl, alt: '', class: 'logo' }) : null,
          el('span', { text: pick(s.name) })),
        el('button', { class: 'lang', type: 'button', text: getLang() === 'bn' ? 'EN' : 'বাং', onclick: () => setLang(getLang() === 'bn' ? 'en' : 'bn') })),
      el('nav', { class: 'site-nav' },
        ...NAV.filter(([, , , vis]) => !vis || s.sectionVisibility[vis] !== false)
              .map(([key, href, tkey]) => el('a', { href, class: key === active ? 'active' : '', text: t(tkey) }))));
    document.getElementById('site-footer').replaceChildren(
      el('footer', { class: 'site-footer' },
        el('p', { text: pick(s.address) }),
        s.contacts.phone ? el('p', {}, el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone })) : null,
        s.contacts.whatsapp ? el('p', {}, el('a', { href: `https://wa.me/${s.contacts.whatsapp}`, text: 'WhatsApp' })) : null,
        s.mapUrl ? el('p', {}, el('a', { href: s.mapUrl, target: '_blank', rel: 'noopener', text: pick({ bn: 'মানচিত্রে দেখুন', en: 'View on map' }) })) : null,
        s.regNo ? el('p', { class: 'muted', text: `Reg. No. ${s.regNo}` }) : null,
        el('p', { class: 'muted', text: `© ${new Date().getFullYear()} ${pick(s.name)}` })));
  };
  render();
  onLangChange(() => { render(); document.dispatchEvent(new CustomEvent('langchange')); });
  if (s.maintenance && !location.pathname.includes('/admin/')) {
    document.getElementById('main').replaceChildren(el('p', { class: 'notice', text: t('footer.maintenance') }));
    return null;
  }
  return s;
}
