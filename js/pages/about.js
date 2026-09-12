import { mountShell, pageHeader, section, updatedStamp } from '../shell.js';
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
    // Phase 7 Task 4 (item 31): see js/pages/transparency.js's own comment on this same pattern —
    // a dynamic import only fetches js/firebase-auth.js when ?preview is actually present,
    // restoring the admin's persisted Auth session for this elevated read without an ordinary
    // about.html visit ever requesting it (the pwa.spec.js assertion that about.html never
    // requests firebase-auth.js never passes ?preview, so it never triggers this branch).
    // Final-review fix wave M2: `.then(m => m.authReady())` closes the exact gap Task 7's own
    // build-log entry flagged as a known latent bug in this branch — a bare dynamic import races
    // browserLocalPersistence's asynchronous session restore (js/firebase-auth.js's own comment
    // on authReady() explains why), which could reach Firestore with no ID token attached yet.
    if (preview) await import('../firebase-auth.js').then(m => m.authReady());
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
      main.replaceChildren(...[pageHeader({ crumb: pick(s.name), title: t('nav.about'), lead: pick(s.tagline), image: mediaUrl(s.media, 'header.about') }),
        updatedStamp(items),
        section(items.length ? el('div', { class: 'tl' }, ...sorted.flatMap(h => [
          el('div', { class: 'yr' }, num(h.year), el('small', { text: pick(h.title) })),
          // Item 26: h1 (page title) -> h2 here, not h3 — nothing on this page sits between the two,
          // so h3 skipped a level. Item 24: a history photo is content, not decoration.
          el('article', { class: 'card' }, el('h2', { text: pick(h.title) }), el('div', { class: 'rich' }, renderRich(pick(h.body))),
            (h.images ?? []).length ? el('div', { class: 'pics' }, ...h.images.map(src => el('figure', {}, el('img', { src, alt: pick(h.title), loading: 'lazy' })))) : null)]))
        : el('p', { class: 'muted', text: t('common.empty') }))].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
