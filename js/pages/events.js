import { mountShell, section, pageHeader } from '../shell.js';
import { listPublished } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate, isLiveEvent } from '../ui.js';
import { mediaUrl } from '../media-slots.js';
import { shareRow } from '../share.js';
import { icsFor } from '../ics.js';

const main = document.getElementById('main');
const s = await mountShell('events', 'nav.events');
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
      // Item 16: a per-event .ics download built client-side (js/ics.js, pure) — no backend, so a
      // data: URL is the only way to hand the browser a downloadable file from a static site.
      const icsHref = e => 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsFor(
        { id: e.id, title: pick(e.title), start: e.start, end: e.end, venue: pick(e.venue), desc: pick(e.desc) },
        { lang, host: location.hostname || 'hrishi91.github.io' },
      ));
      const icsSlug = e => (e.id || 'event').toString().replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
      const row = e => { const live = isLiveEvent(e, now);   // js/ui.js: end || start+2h (amended after Task 7 review)
        return el('div', { class: live ? 'ev live' : 'ev' }, el('time', { text: time(e.start) }),
          el('div', {}, el('b', { text: pick(e.title) }), el('span', { text: [pick(e.venue), pick(e.desc)].filter(Boolean).join(' · ') }), live ? el('span', { class: 'pulse', text: t('live.badge') }) : null,
            el('a', { class: 'ics muted', href: icsHref(e), download: `${icsSlug(e)}.ics`, text: t('events.addToCalendar') }))); };
      main.replaceChildren(pageHeader({ crumb: t('nav.events'), title: t('events.upcoming'), image: mediaUrl(s.media, 'header.events') }),
        section(...[
          days.length ? el('div', { class: 'days tabs', role: 'tablist' }, ...days.map(d => el('button', { type: 'button', class: d === selectedDay ? 'active' : '', 'aria-pressed': String(d === selectedDay),
            text: fmtDate(up.find(e => dayKey(e) === d).start, lang), onclick: () => { selectedDay = d; render(); } }))) : null,
          up.length ? el('div', { class: 'timeline' }, ...up.filter(e => dayKey(e) === selectedDay).map(row)) : el('p', { class: 'muted', text: t('common.empty') }),
          past.length ? el('div', { class: 'acc' }, el('details', {}, el('summary', { text: t('events.past') }), ...past.map(row))) : null,
          shareRow({ url: location.href, title: t('events.upcoming') }),
        ].filter(Boolean)));
      renderEventJsonLd(all);
    };
    render(); document.addEventListener('langchange', render);
  }
}

// Item 12: events.html's schema.org Event data is dynamic (Firestore), so — unlike the static
// NGO+WebPage JSON-LD scripts/sync-head.mjs bakes into every <head> — it is built here at
// runtime, from the same events already fetched for the page, and written with textContent
// (never innerHTML) into a single <script> kept up to date across re-renders/langchange.
function renderEventJsonLd(events) {
  const graph = events.map(e => ({
    '@type': 'Event',
    name: pick(e.title),
    startDate: e.start,
    endDate: e.end || undefined,
    location: pick(e.venue) ? { '@type': 'Place', name: pick(e.venue) } : undefined,
    description: pick(e.desc) || undefined,
  }));
  let node = document.getElementById('event-jsonld');
  if (!node) {
    node = document.createElement('script');
    node.type = 'application/ld+json';
    node.id = 'event-jsonld';
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}
