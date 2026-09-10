import { mountShell, section, sectionHead } from '../shell.js';
import { listPublished, listCommittee, listTransparencyYears } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, countdown, fmtDate, bnDigits, digits } from '../ui.js';
import { inr, sum } from '../money.js';
import { ganeshSvg, diyaSvg, paintHero, paintGarland, onResize } from '../art.js';
import { CULTURE } from '../culture.js';
import { barsView, donutView } from '../ledger-view.js';

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
      onResize(() => { paintHero(bg); paintGarland(garland); });
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

    // Task 7 fills these four in; keep the names.
    let story = () => null, culture = () => null, gallery = () => null, schedule = () => null, ledger = () => null, committee = () => null;
    const render = () => main.replaceChildren(...[hero(), cred(), bento(), story(), culture(), gallery(), schedule(), ledger(), donateBand(), committee(), membersTeaser()].filter(Boolean));
    render();
    document.addEventListener('langchange', render);
    setInterval(render, 60000);
  }
}
