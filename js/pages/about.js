import { mountShell, pageHeader, section } from '../shell.js';
import { listPublished } from '../content.js';
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { renderRich } from '../rich.js';
import { mediaUrl } from '../media-slots.js';

const main = document.getElementById('main');
const s = await mountShell('about', 'nav.about');
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
      const lang = getLang(), num = n => lang === 'bn' ? bnDigits(n) : String(n);
      const sorted = [...items].sort((a, b) => b.year - a.year);
      main.replaceChildren(pageHeader({ crumb: pick(s.name), title: t('nav.about'), lead: pick(s.tagline), image: mediaUrl(s.media, 'header.about') }),
        section(items.length ? el('div', { class: 'tl' }, ...sorted.flatMap(h => [
          el('div', { class: 'yr' }, num(h.year), el('small', { text: pick(h.title) })),
          // Item 26: h1 (page title) -> h2 here, not h3 — nothing on this page sits between the two,
          // so h3 skipped a level. Item 24: a history photo is content, not decoration.
          el('article', { class: 'card' }, el('h2', { text: pick(h.title) }), el('div', { class: 'rich' }, renderRich(pick(h.body))),
            (h.images ?? []).length ? el('div', { class: 'pics' }, ...h.images.map(src => el('figure', {}, el('img', { src, alt: pick(h.title), loading: 'lazy' })))) : null)]))
        : el('p', { class: 'muted', text: t('common.empty') })));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
