import { mountShell, pageHeader, section } from '../shell.js';
import { getPage } from '../content.js';
import { pick, t } from '../i18n.js';
import { el, digits, toast } from '../ui.js';
import { renderRich } from '../rich.js';
import { httpsUrl } from '../media-slots.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'contact.title');
if (s) {
  const page = await getPage('contact');
  let nameField, msgField;
  const render = () => {
    const wa = digits(s.contacts.whatsapp);
    const mapHref = httpsUrl(s.mapUrl);
    const infoCard = el('div', { class: 'card' },
      s.contacts.phone ? el('p', {}, el('a', { href: `tel:${s.contacts.phone}`, text: s.contacts.phone })) : null,
      wa ? el('p', {}, el('a', { href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', text: t('footer.whatsapp') })) : null,
      s.contacts.email ? el('p', {}, el('a', { href: `mailto:${s.contacts.email}`, text: s.contacts.email })) : null,
      mapHref ? el('p', {}, el('a', { href: mapHref, target: '_blank', rel: 'noopener', text: t('footer.map') })) : null,
    );
    nameField = el('input', { type: 'text', placeholder: t('contact.name'), 'aria-label': t('contact.name') });
    msgField = el('textarea', { rows: 4, placeholder: t('contact.messagePlaceholder'), 'aria-label': t('contact.message') });
    // No backend: the form just builds a wa.me URL client-side and opens it — nothing is ever
    // stored (spec §4, item 6). Bare inputs with placeholder+aria-label (no separate <label><span>
    // text) — same convention as donate.js's confirm form, which the shared site.css classes
    // (.form/.row) were built to fit.
    const formCard = wa ? el('form', {
      class: 'form',
      onsubmit: e => {
        e.preventDefault();
        const name = nameField.value.trim(), msg = msgField.value.trim();
        if (!msg) { toast(t('contact.needMessage'), 'err'); return; }
        const text = name ? `${name}: ${msg}` : msg;
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      },
    },
      el('div', { class: 'row' }, nameField),
      el('div', { class: 'row' }, msgField),
      el('button', { class: 'btn', type: 'submit', text: t('contact.send') })) : null;
    main.replaceChildren(
      pageHeader({ crumb: t('contact.crumb'), title: t('contact.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body))), infoCard, formCard),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
