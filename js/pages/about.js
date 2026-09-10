import { mountShell, pageHeader, section } from '../shell.js';
import { listPublished } from '../content.js';
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell('about', t('nav.about'));
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
      main.replaceChildren(pageHeader({ crumb: t('nav.about'), title: t('nav.about'), lead: pick(s.tagline) }),
        section(items.length ? el('div', { class: 'tl' }, ...sorted.flatMap(h => [
          el('div', { class: 'yr' }, num(h.year), el('small', { text: pick(h.title) })),
          el('article', { class: 'card' }, el('h3', { text: pick(h.title) }), el('div', { class: 'rich' }, renderRich(pick(h.body))),
            (h.images ?? []).length ? el('div', { class: 'pics' }, ...h.images.map(src => el('figure', {}, el('img', { src, alt: '', loading: 'lazy' })))) : null)]))
        : el('p', { class: 'muted', text: t('common.empty') })));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
