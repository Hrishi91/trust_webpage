import { mountShell, section, sectionHead } from '../shell.js';
import { listPublished, listCommittee, listTransparencyYears } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, countdown, fmtDate, bnDigits, digits, isLiveEvent } from '../ui.js';
import { inr, sum } from '../money.js';
import { ganeshSvg, diyaSvg, paintHero, paintGarland, onResize } from '../art.js';
import { CULTURE } from '../culture.js';
import { barsView, donutView } from '../ledger-view.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell('home');
if (s) {
  let events, albums, history, people, years;
  try {
    [events, albums, history, people, years] = await Promise.all([
      listPublished('events'), listPublished('albums'), listPublished('history'), listCommittee(), listTransparencyYears()]);
  } catch (err) { console.error(err); main.replaceChildren(el('p', { class: 'muted', text: t('common.error') })); events = null; }
  if (events !== null) {
    const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
    let unsubHero = null;
    const hero = () => {
      const now = new Date(), cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const bg = el('canvas', { class: 'bg', id: 'heroBg', 'aria-hidden': 'true' });
      const garland = el('canvas', { class: 'garland', id: 'garland', 'aria-hidden': 'true' });
      const h = el('header', { class: 'hero' }, bg, el('div', { class: 'wrap' },
        el('div', { class: 'copy' },
          s.pujaDate ? el('span', { class: 'eyebrow', text: fmtDate(s.pujaDate, getLang()) }) : null,
          el('h1', {}, pick(s.name)),
          pick(s.tagline) ? el('p', { text: pick(s.tagline) }) : null,
          el('div', { class: 'ctas' },
            s.sectionVisibility.donate !== false ? el('a', { class: 'btn', href: 'donate.html', text: t('nav.donate') }) : null,
            el('a', { class: 'btn ghost', href: 'events.html', text: t('nav.events') })),
          cd ? (cd.past ? el('p', { class: 'countdown-today', text: t('countdown.today') })
            : el('div', { class: 'countdown', 'aria-label': t('countdown.days') },
                el('div', {}, el('b', { text: num(cd.days) }), el('span', { text: t('countdown.days') })),
                el('div', {}, el('b', { text: num(cd.hours) }), el('span', { text: t('countdown.hours') })),
                el('div', {}, el('b', { text: num(cd.minutes) }), el('span', { text: t('countdown.minutes') })))) : null),
        el('div', { class: 'art' }, ganeshSvg(), el('div', { class: 'diyas' }, ...[0, 1, 2, 3, 4].map(() => diyaSvg())))),
        garland);
      requestAnimationFrame(() => { paintHero(bg); paintGarland(garland); });
      unsubHero?.(); unsubHero = onResize(() => { paintHero(bg); paintGarland(garland); });   // render() runs every 60 s — never stack listeners
      return h;
    };
    const cred = () => {
      const items = [];
      if (s.regNo) items.push(el('span', {}, el('b', { text: 'Registered Trust' }), ` ${t('tr.regNo')} ${s.regNo}`));
      if (s.has80G) items.push(el('span', {}, el('b', { text: '80G' }), ` ${t('donate.tax80g')}`));
      if (years.length) items.push(el('span', {}, el('b', { text: t('tr.title') }), ` ${pick({ bn: 'প্রতি বছর প্রকাশিত', en: 'published every year' })}`));
      return items.length ? el('div', { class: 'cred' }, el('div', { class: 'wrap' }, ...items)) : null;
    };
    const bento = () => {
      const now = new Date(), cd = s.pujaDate ? countdown(s.pujaDate, now) : null;
      const next = events.filter(e => new Date(e.end || e.start) >= now)[0];
      const latest = years[0];
      const tile = (small, big, span) => el('div', { class: 'tile' }, el('small', { text: small }), el('b', { text: big }), el('span', { text: span }));
      return section(sectionHead(pick({ bn: 'এক নজরে', en: 'At a glance' }), el('a', { href: 'events.html', text: t('events.upcoming') + ' →' })),
        el('div', { class: 'bento' },
          tile(pick({ bn: 'পুজো শুরু', en: 'Puja starts' }), cd && !cd.past ? `${num(cd.days)} ${t('countdown.days')}` : t('countdown.today'), s.pujaDate ? fmtDate(s.pujaDate, getLang()) : ''),
          tile(pick({ bn: 'পরের অনুষ্ঠান', en: 'Next event' }), next ? pick(next.title) : t('common.empty'), next ? `${fmtDate(next.start, getLang())}${pick(next.venue) ? ' · ' + pick(next.venue) : ''}` : ''),
          tile(pick({ bn: 'এই বছরের থিম', en: "This year's theme" }), pick(s.theme) || '—', ''),
          tile(latest ? `${num(latest.year)} ${t('tr.title')}` : t('tr.title'),
            latest ? `${inr(sum(latest.income ?? []) - sum(latest.expense ?? []), getLang())} ${t('tr.balance')}` : t('common.empty'),
            latest ? `${t('tr.income')} ${inr(sum(latest.income ?? []), getLang())} · ${t('tr.expense')} ${inr(sum(latest.expense ?? []), getLang())}` : '')));
    };
    const donateBand = () => {
      if (s.sectionVisibility.donate === false || !s.upiId) return null;
      const wa = digits(s.contacts.whatsapp);
      return el('section', { class: 'donate' }, el('div', { class: 'wrap' },
        el('div', {}, el('span', { class: 'eyebrow', text: t('nav.donate') }), el('h2', {}, pick({ bn: 'এক টাকাও ', en: 'Not one rupee ' }), el('em', { text: pick({ bn: 'হিসাবের বাইরে নয়', en: 'outside the ledger' }) })),
          el('p', { text: pick({ bn: 'UPI-তে দিন, WhatsApp-এ জানান। দাতাদের তালিকায় নাম উঠবে (চাইলে গোপন)।', en: 'Pay by UPI, confirm on WhatsApp. Your name joins the donor wall (or stays anonymous).' }) }),
          el('div', { class: 'ctas' }, el('a', { class: 'btn', href: 'donate.html', text: t('donate.upi') }), wa ? el('a', { class: 'btn ghost', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null)),
        el('div', { class: 'upi' }, s.upiQrUrl ? el('img', { src: s.upiQrUrl, alt: t('donate.scan'), width: 112, height: 112 }) : null,
          el('div', {}, el('code', { text: s.upiId }), el('p', { text: t('donate.scan') })))));
    };
    const membersTeaser = () => s.sectionVisibility.members === false ? null : el('section', {}, el('div', { class: 'wrap members' },
      el('div', {}, el('span', { class: 'eyebrow', text: t('mem.title') }), el('h2', { text: pick({ bn: 'নিজের চাঁদা, নোটিশ, দায়িত্ব — এক জায়গায়', en: 'Your pledge, notices, duties — in one place' }) }),
        el('p', { class: 'muted', text: pick({ bn: 'কমিটির সদস্যরা মোবাইল নম্বর দিয়ে OTP-তে ঢুকুন।', en: 'Committee members sign in with a phone OTP.' }) })),
      el('form', { class: 'form', action: 'members.html', method: 'get' }, el('input', { type: 'tel', name: 'phone', placeholder: '+91', 'aria-label': t('mem.phone') }), el('button', { class: 'btn', type: 'submit', text: t('mem.sendOtp') }))));

    const cultureIcon = kind => { const c = el('div', { class: 'ill' }); c.dataset.kind = kind; return c; }; // CSS draws a token-coloured emblem per kind
    let story = () => {
      const h = history.at(-1), cover = albums.at(-1);   // listPublished orders ascending → last = newest
      if (!pick(s.theme) && !h) return null;
      return section(el('div', { class: 'story' },
        cover?.coverUrl ? el('figure', { class: 'scene' }, el('img', { src: cover.coverUrl, alt: pick(cover.title), loading: 'lazy' }), el('figcaption', { text: `${num(cover.year)} · ${pick(cover.title)}` })) : null,
        el('div', { class: 'txt' }, el('span', { class: 'eyebrow', text: pick({ bn: 'এই বছরের থিম', en: "This year's theme" }) }),
          el('h2', {}, el('span', { class: 'stitch', text: pick(s.theme) || (h ? pick(h.title) : '') })),
          h ? el('div', { class: 'rich' }, renderRich(pick(h.body))) : null,
          el('div', { class: 'ctas' }, el('a', { class: 'btn ghost', href: 'about.html', text: t('nav.about') })))));
    };
    let culture = () => s.sectionVisibility.culture === false ? null : el('section', { class: 'culture' }, el('div', { class: 'wrap' },
      sectionHead(pick({ bn: 'আমাদের মাটি, আমাদের শিল্প', en: 'Our soil, our craft' }), el('span', { class: 'pill', text: pick({ bn: 'দক্ষিণ দিনাজপুর', en: 'Dakshin Dinajpur' }) })),
      el('div', { class: 'cgrid' }, ...CULTURE.map(c => el('article', { class: 'ccard' }, cultureIcon(c.icon), el('small', { text: pick(c.tag) }), el('h3', { text: pick(c.title) }), el('p', { text: pick(c.text) }))))));
    let gallery = () => {
      if (s.sectionVisibility.gallery === false || !albums.length) return null;
      const latest = albums.slice(-5).reverse();
      return section(sectionHead(t('nav.gallery'), el('a', { href: 'gallery.html', text: t('gallery.albums') + ' →' })),
        el('div', { class: 'masonry' }, ...latest.map((a, i) => el('a', { class: i === 0 ? 'big' : '', href: `gallery.html?album=${a.id}` },
          a.coverUrl ? el('img', { src: a.coverUrl, alt: pick(a.title), loading: 'lazy' }) : null, el('span', { class: 'cap', text: `${num(a.year)} · ${pick(a.title)}` })))));
    };
    let schedule = () => {
      if (s.sectionVisibility.events === false) return null;
      const now = new Date(), up = events.filter(e => new Date(e.end || e.start) >= now).slice(0, 4);
      if (!up.length) return null;
      const time = iso => new Date(iso).toLocaleTimeString(getLang() === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
      return section(sectionHead(t('events.upcoming'), el('a', { href: 'events.html', text: t('nav.events') + ' →' })),
        el('div', { class: 'timeline' }, ...up.map(e => { const live = isLiveEvent(e, now);   // js/ui.js: end || start+2h (amended after Task 7 review)
          return el('div', { class: live ? 'ev live' : 'ev' }, el('time', { text: `${fmtDate(e.start, getLang())} · ${time(e.start)}` }),
            el('div', {}, el('b', { text: pick(e.title) }), el('span', { text: pick(e.venue) }), live ? el('span', { class: 'pulse', text: t('live.badge') }) : null)); })));
    };
    let ledger = () => {
      if (s.sectionVisibility.transparency === false || !years[0]) return null;
      const y = years[0], inc = y.income ?? [], exp = y.expense ?? [];
      const top = [...inc].sort((a, b) => b.amount - a.amount).slice(0, 3), topE = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 4);
      const pct = sum(exp) ? Math.round((topE[0]?.amount ?? 0) / sum(exp) * 100) : 0;
      return section(sectionHead(`${num(y.year)} · ${t('tr.title')}`, el('a', { href: 'transparency.html', text: t('tr.docs') + ' →' })),
        el('div', { class: 'ledger' }, el('div', {}, barsView(top, getLang()), barsView(topE, getLang(), { kind: 'expense' })),
          donutView(exp, getLang(), { big: `${num(pct)}%`, small: topE[0] ? pick(topE[0].category) : '' })));   // full list, so the ring and the centre % agree (amended after Task 7 review)
    };
    let committee = () => {
      if (s.sectionVisibility.committee === false || !people.length) return null;
      const officers = people.filter(p => p.officer).slice(0, 4); const row = officers.length ? officers : people.slice(0, 4);
      return section(sectionHead(t('nav.committee'), el('a', { href: 'committee.html', text: pick({ bn: 'সব সদস্য →', en: 'All members →' }) })),
        el('div', { class: 'people' }, ...row.map(p => el('a', { class: 'person', href: 'committee.html' },
          el('div', { class: 'ring' }, p.photoUrl ? el('img', { src: p.photoUrl, alt: '', loading: 'lazy' }) : el('span', { text: pick(p.name).slice(0, 1) })),
          el('b', { text: pick(p.name) }), el('small', { text: pick(p.post) })))));
    };
    const render = () => main.replaceChildren(...[hero(), cred(), bento(), story(), culture(), gallery(), schedule(), ledger(), donateBand(), committee(), membersTeaser()].filter(Boolean));
    render();
    document.addEventListener('langchange', render);
    setInterval(render, 60000);
  }
}
