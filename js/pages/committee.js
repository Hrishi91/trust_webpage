import { mountShell } from '../shell.js';
import { listCommittee } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('committee');
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
    const render = () => main.replaceChildren(el('h1', { text: t('nav.committee') }),
      people.length ? el('div', { class: 'grid' }, ...people.map(p => el('div', { class: 'card person' },
        el('img', { src: p.photoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="55" cy="55" r="55" fill="%23ddd"/></svg>', alt: '', loading: 'lazy' }),
        el('h3', { text: pick(p.name) }), el('p', { class: 'muted', text: pick(p.post) }))))
      : el('p', { class: 'muted', text: t('common.empty') }));
    render();
    document.addEventListener('langchange', render);
  }
}
