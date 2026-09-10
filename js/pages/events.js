import { mountShell, section, pageHeader } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate, isLiveEvent } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('events', t('nav.events'));
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
    let selectedDay = null;
    const render = () => {
      const now = new Date(), lang = getLang();
      // Sorted chronologically (listPublished orders by the admin's free-form 'order' field, not
      // by date) so the day tabs read left-to-right by date and the default tab is the nearest
      // upcoming day, not whichever event the admin happened to create/order first.
      const up = all.filter(e => new Date(e.end || e.start) >= now).sort((a, b) => new Date(a.start) - new Date(b.start));
      const past = all.filter(e => new Date(e.end || e.start) < now).reverse();
      const dayKey = e => new Date(e.start).toDateString();
      const days = [...new Set(up.map(dayKey))];
      if (!days.includes(selectedDay)) selectedDay = days[0] ?? null;
      const time = iso => new Date(iso).toLocaleTimeString(lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
      const row = e => { const live = isLiveEvent(e, now);   // js/ui.js: end || start+2h (amended after Task 7 review)
        return el('div', { class: live ? 'ev live' : 'ev' }, el('time', { text: time(e.start) }),
          el('div', {}, el('b', { text: pick(e.title) }), el('span', { text: [pick(e.venue), pick(e.desc)].filter(Boolean).join(' · ') }), live ? el('span', { class: 'pulse', text: t('live.badge') }) : null)); };
      main.replaceChildren(pageHeader({ crumb: t('nav.events'), title: t('events.upcoming') }),
        section(...[
          days.length ? el('div', { class: 'days tabs', role: 'tablist' }, ...days.map(d => el('button', { type: 'button', class: d === selectedDay ? 'active' : '', 'aria-pressed': String(d === selectedDay),
            text: fmtDate(up.find(e => dayKey(e) === d).start, lang), onclick: () => { selectedDay = d; render(); } }))) : null,
          up.length ? el('div', { class: 'timeline' }, ...up.filter(e => dayKey(e) === selectedDay).map(row)) : el('p', { class: 'muted', text: t('common.empty') }),
          past.length ? el('div', { class: 'acc' }, el('details', {}, el('summary', { text: t('events.past') }), ...past.map(row))) : null,
        ].filter(Boolean)));
    };
    render(); document.addEventListener('langchange', render);
  }
}
