import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { listCommittee } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('committee', t('nav.committee'));
if (s) {
  let people = [];
  try {
    people = await listCommittee();
  } catch (err) {
    console.error(err);
    main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    people = null;
  }
  if (people !== null) {
    const render = () => {
      const officers = people.filter(p => p.officer), rest = people.filter(p => !p.officer);
      const ring = p => el('div', { class: 'ring' }, p.photoUrl ? el('img', { src: p.photoUrl, alt: '', loading: 'lazy' }) : el('span', { text: pick(p.name).slice(0, 1) }));
      main.replaceChildren(pageHeader({ crumb: t('nav.committee'), title: pick({ bn: 'যাঁরা দায়িত্বে', en: 'Who is responsible' }) }),
        section(...[
          officers.length ? el('div', { class: 'officers' }, ...officers.map(p => el('div', { class: 'officer person' }, ring(p), el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) })))) : null,
          rest.length ? sectionHead(pick({ bn: 'সদস্যরা', en: 'Members' }), el('span', { class: 'pill', text: `${getLang() === 'bn' ? bnDigits(rest.length) : rest.length}` })) : null,
          rest.length ? el('div', { class: 'mgrid' }, ...rest.map(p => el('div', { class: 'mrow person' }, ring(p), el('div', {}, el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) }))))) : null,
          people.length ? null : el('p', { class: 'muted', text: t('common.empty') }),
        ].filter(Boolean)));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
