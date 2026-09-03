import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('events');
if (s) {
  let all, errored = false;
  try {
    all = await listPublished('events');
  } catch (err) {
    console.error(err);
    errored = true;
  }
  if (errored) {
    main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
  } else {
    const render = () => {
      const now = new Date(), lang = getLang();
      const up = all.filter(e => new Date(e.end || e.start) >= now);
      const past = all.filter(e => new Date(e.end || e.start) < now).reverse();
      const card = e => el('div', { class: 'card event' },
        el('time', { text: fmtDate(e.start, lang) + (e.end ? ' – ' + fmtDate(e.end, lang) : '') }),
        el('h3', { text: pick(e.title) }), pick(e.venue) ? el('p', { text: pick(e.venue) }) : null,
        pick(e.desc) ? el('p', { class: 'muted', text: pick(e.desc) }) : null);
      main.replaceChildren(...[
        el('h1', { text: t('events.upcoming') }),
        up.length ? el('div', {}, ...up.map(card)) : el('p', { class: 'muted', text: t('common.empty') }),
        past.length ? el('h2', { text: t('events.past') }) : null,
        ...past.map(card),
      ].filter(Boolean));
    };
    render(); document.addEventListener('langchange', render);
  }
}
