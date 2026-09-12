import { mountShell, pageHeader, section, updatedStamp } from '../shell.js';
import { listTransparencyYears } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { t, pick, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { sum, inr } from '../money.js';
import { barsView, donutView } from '../ledger-view.js';
import { mediaUrl, httpsUrl } from '../media-slots.js';
import { shareRow } from '../share.js';

const main = document.getElementById('main');
const s = await mountShell('transparency', 'tr.title');
if (s) {
  if (s.sectionVisibility.transparency === false) {
    main.replaceChildren(el('p', { class: 'muted', text: t('common.empty') }));
  } else {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview') === '1';
    const yearParam = params.get('year');

    let years = [], errored = false;
    try {
      years = await listTransparencyYears();
    } catch (err) {
      console.error(err);
      errored = true;
    }

    // ?preview=1 reads the requested year's doc directly (bypassing the published gate) — only
    // an admin's rules allow this read; anyone else gets permission-denied, caught here so the
    // rest of the page still renders instead of failing outright.
    let previewDoc = null;
    if (preview && yearParam) {
      try {
        // Phase 7 Task 4 (item 31): js/firebase.js no longer initialises Auth, so a plain page
        // load here never has a live Auth instance wired to `db` — Firestore has no ID token to
        // attach, and an admin's persisted session (from /admin/) would eval-error against rules
        // that gate this read. A dynamic (not static) import of js/firebase-auth.js only runs —
        // and only ever fetches the firebase-auth.js chunk — when an admin actually opens a
        // ?preview=1 link, so an ordinary visit to this page still never requests it.
        await import('../firebase-auth.js');
        const snap = await getDoc(doc(db, 'transparency', yearParam));
        if (snap.exists()) previewDoc = { id: snap.id, ...snap.data() };
      } catch (err) {
        console.warn('[transparency] preview', err);
      }
    }

    // Tabs: every published year, plus the previewed year too if it isn't already published.
    const tabs = years.slice();
    if (previewDoc && !tabs.some(y => String(y.year) === String(previewDoc.year))) tabs.push(previewDoc);
    tabs.sort((a, b) => Number(b.year) - Number(a.year));

    const selectedYear = yearParam ?? (tabs[0] ? String(tabs[0].year) : null);
    const dataFor = year => {
      if (previewDoc && String(previewDoc.year) === String(year)) return previewDoc;
      return years.find(y => String(y.year) === String(year)) ?? null;
    };

    const ledgerTable = (rows, lang) => el('div', { class: 'table-wrap' },
      el('table', { class: 'ledger' },
        ...rows.map(r => el('tr', {}, el('td', { text: pick(r.category, lang) }), el('td', { class: 'amt', text: inr(r.amount, lang) }))),
        el('tr', {}, el('td', { text: t('tr.total', lang) }), el('td', { class: 'amt', text: inr(sum(rows), lang) }))));

    const render = () => {
      const lang = getLang();
      const yearLabel = y => lang === 'bn' ? bnDigits(String(y)) : String(y);

      const tabsEl = tabs.length ? el('div', { class: 'tabs' },
        ...tabs.map(y => el('button', {
          type: 'button',
          class: String(y.year) === String(selectedYear) ? 'active' : '',
          text: yearLabel(y.year),
          onclick: () => {
            const url = new URL(location.href);
            url.searchParams.set('year', String(y.year));
            location.assign(url.toString());
          },
        }))) : null;

      const headerParts = [];
      if (s.regNo) headerParts.push(`${t('tr.regNo')} ${s.regNo}`);
      if (s.has80G) headerParts.push(t('donate.tax80g'));

      const data = selectedYear ? dataFor(selectedYear) : null;

      const body = errored ? el('p', { class: 'muted', text: t('common.error') }) : !data ? el('p', { class: 'muted', text: t('common.empty') }) : (() => {
        const inc = data.income ?? [], exp = data.expense ?? [], it = sum(inc), et = sum(exp), bal = it - et, docs = data.documents ?? [];
        const top = [...exp].sort((a, b) => b.amount - a.amount)[0];
        return el('div', {},
          el('div', { class: 'summary sum' }, el('div', {}, el('small', { text: t('tr.income') }), el('b', { text: inr(it, lang) })),
            el('div', {}, el('small', { text: t('tr.expense') }), el('b', { text: inr(et, lang) })),
            el('div', {}, el('small', { text: t('tr.balance') }), el('b', { class: bal < 0 ? 'neg' : 'g', text: inr(bal, lang) }))),
          el('div', { class: 'ledger' }, el('div', {}, el('h2', { text: t('tr.income') }), barsView(inc, lang), el('h2', { text: t('tr.expense') }), barsView(exp, lang, { kind: 'expense' })),
            exp.length ? donutView(exp, lang, { big: `${yearLabel(et ? Math.round((top.amount / et) * 100) : 0)}%`, small: top ? pick(top.category, lang) : '' }) : null),
          el('div', { class: 'card' }, el('h2', { text: t('tr.income') }), ledgerTable(inc, lang)),
          el('div', { class: 'card' }, el('h2', { text: t('tr.expense') }), ledgerTable(exp, lang)),
          docs.length ? el('div', { class: 'acc' }, ...docs.map((d, i) => { const href = httpsUrl(d.url); return el('details', i === 0 ? { open: '' } : {}, el('summary', { text: pick(d.title, lang) }),
            href ? el('p', {}, el('a', { href, target: '_blank', rel: 'noopener', text: t('tr.download') })) : null); })) : null,
          el('div', { class: 'legal' }, el('b', { text: t('tr.legal') }),
            el('div', {}, t('tr.regNo'), el('span', { text: s.regNo || t('tr.inProgress') })),
            el('div', {}, t('cred.80g'), el('span', { text: s.has80G ? t('donate.tax80g') : t('tr.afterReg') })),
            el('div', {}, t('tr.address'), el('span', { text: pick(s.address) }))),
          data.notes && pick(data.notes, lang) ? el('p', { class: 'muted', text: pick(data.notes, lang) }) : null);
      })();

      main.replaceChildren(...[pageHeader({ crumb: t('nav.transparency'), title: t('tr.title'), lead: headerParts.join(' · '), image: mediaUrl(s.media, 'header.transparency') }),
        updatedStamp(years),
        section(tabsEl, body, shareRow({ url: location.href, title: t('tr.title') }))].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
