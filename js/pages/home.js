import { mountShell } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, countdown, fmtDate, bnDigits } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('home');
if (s) {
  let events, albums;
  try {
    [events, albums] = await Promise.all([listPublished('events'), listPublished('albums')]);
  } catch (err) {
    console.error(err);
    main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    events = null;
  }
  if (events !== null) {
    const render = () => {
      const lang = getLang();
      const now = new Date();
      const upcoming = events.filter(e => new Date(e.end || e.start) >= now).slice(0, 3);
      const latest = albums.at(-1);
      const cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const num = n => lang === 'bn' ? bnDigits(n) : String(n);
      main.replaceChildren(...[
        el('section', { class: 'hero' },
          el('h1', { text: pick(s.name) }),
          pick(s.tagline) ? el('p', { text: pick(s.tagline) }) : null,
          pick(s.theme) ? el('p', {}, el('b', { text: pick(s.theme) })) : null,
          cd ? (cd.past
            ? el('p', { class: 'countdown-today', text: t('countdown.today') })
            : el('div', { class: 'countdown' },
                el('div', {}, el('b', { text: num(cd.days) }), t('countdown.days')),
                el('div', {}, el('b', { text: num(cd.hours) }), t('countdown.hours')),
                el('div', {}, el('b', { text: num(cd.minutes) }), t('countdown.minutes'))))
            : null),
        upcoming.length && s.sectionVisibility.events !== false ? el('section', {},
          el('h2', { text: t('events.upcoming') }),
          ...upcoming.map(e => el('div', { class: 'card event' },
            el('time', { text: fmtDate(e.start, lang) }), el('h3', { text: pick(e.title) }),
            pick(e.venue) ? el('p', { text: pick(e.venue) }) : null))) : null,
        latest && s.sectionVisibility.gallery !== false ? el('section', {},
          el('h2', { text: t('nav.gallery') }),
          el('a', { href: `gallery.html?album=${latest.id}`, class: 'card' },
            latest.coverUrl ? el('img', { class: 'cover', src: latest.coverUrl, alt: pick(latest.title) }) : null,
            el('p', { text: pick(latest.title) }))) : null,
      ].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
    setInterval(render, 60000);
  }
}
