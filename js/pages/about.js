import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell('about');
if (s) {
  const preview = new URLSearchParams(location.search).has('preview');
  let items;
  try {
    items = preview
      ? (await getDocs(query(collection(db, 'history'), where('deleted', '==', false), orderBy('order')))).docs.map(d => ({ id: d.id, ...d.data() }))
      : await listPublished('history');
  } catch (err) {
    console.error(err);
    main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    items = null;
  }
  if (items !== null) {
    const render = () => {
      main.replaceChildren(...[
        el('h1', { text: t('nav.about') }),
        items.length ? null : el('p', { class: 'muted', text: t('common.empty') }),
        ...items.map(h => el('article', { class: 'card' },
          el('h2', { text: `${getLang() === 'bn' ? bnDigits(h.year) : h.year} · ${pick(h.title)}` }),
          el('div', { class: 'rich' }, renderRich(pick(h.body))),
          ...(h.images ?? []).map(src => el('img', { class: 'cover', src, alt: '', loading: 'lazy' })))),
      ].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
