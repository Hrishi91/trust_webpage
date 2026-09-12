import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { listCommittee } from '../content.js';
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { mediaUrl, httpsUrl } from '../media-slots.js';

const main = document.getElementById('main');
const s = await mountShell('committee', 'nav.committee');
if (s) {
  let people = [];
  try {
    // Item 38: ?preview=1 lets a signed-in admin see hidden/non-public rows too (deleted==false
    // only, isPublic skipped) — same "unfiltered read, admin session required by firestore.rules"
    // pattern as js/pages/about.js's own ?preview=1 branch.
    const preview = new URLSearchParams(location.search).has('preview');
    if (preview) await import('../firebase-auth.js').then(m => m.authReady());
    people = preview
      ? (await getDocs(query(collection(db, 'committee'), where('deleted', '==', false), orderBy('order')))).docs.map(d => ({ id: d.id, ...d.data() }))
      : await listCommittee();
  } catch (err) {
    console.error(err);
    main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    people = null;
  }
  if (people !== null) {
    const render = () => {
      const officers = people.filter(p => p.officer), rest = people.filter(p => !p.officer);
      // Item 24: a committee photo is content, not decoration — alt = the person's name.
      const ring = p => el('div', { class: 'ring' }, httpsUrl(p.photoUrl) ? el('img', { src: httpsUrl(p.photoUrl), alt: pick(p.name), loading: 'lazy' }) : el('span', { text: pick(p.name).slice(0, 1) }));
      main.replaceChildren(pageHeader({ crumb: t('nav.committee'), title: t('committee.title'), image: mediaUrl(s.media, 'header.committee') }),
        section(...[
          officers.length ? el('div', { class: 'officers' }, ...officers.map(p => el('div', { class: 'officer person' }, ring(p), el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) })))) : null,
          rest.length ? sectionHead(t('committee.members'), el('span', { class: 'pill', text: `${getLang() === 'bn' ? bnDigits(rest.length) : rest.length}` })) : null,
          rest.length ? el('div', { class: 'mgrid' }, ...rest.map(p => el('div', { class: 'mrow person' }, ring(p), el('div', {}, el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) }))))) : null,
          people.length ? null : el('p', { class: 'muted', text: t('common.empty') }),
        ].filter(Boolean)));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
