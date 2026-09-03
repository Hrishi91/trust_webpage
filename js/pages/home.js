import { mountShell } from '../shell.js';
import { listPublished, onAnnouncements } from '../content.js';
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
    let annList = [], annLive = false;
    const render = () => {
      const lang = getLang();
      const now = new Date();
      const upcoming = events.filter(e => new Date(e.end || e.start) >= now).slice(0, 3);
      const latest = albums.at(-1);
      const cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const num = n => lang === 'bn' ? bnDigits(n) : String(n);
      const today = events.filter(e => new Date(e.start).toDateString() === now.toDateString());
      main.replaceChildren(...[
        annList.length ? el('section', { class: 'live-strip' },
          annLive ? el('span', { class: 'pulse', text: t('live.badge') }) : null,
          ...annList.slice(0, 5).map(a => {
            const created = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
            const dateText = created ? fmtDate(created, lang) : '';
            return el('div', { class: 'ann' },
              `${a.pinned ? '📌 ' : ''}${pick(a.text)}`,
              dateText ? el('small', { text: dateText }) : null);
          })) : null,
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
        today.length ? el('section', { class: 'today-strip' },
          el('h2', { text: t('live.today') }),
          ...today.map(e => el('p', {},
            `${new Date(e.start).toLocaleTimeString(lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })} · ${pick(e.title)}`,
            pick(e.venue) ? ` · ${pick(e.venue)}` : ''))) : null,
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
    const unsub = onAnnouncements((list, { live }) => { annList = list; annLive = live; render(); });
    window.addEventListener('pagehide', unsub);
  }
}
