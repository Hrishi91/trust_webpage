import { mountShell } from '../shell.js';
import { listTransparencyYears } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { t, pick, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { sum, inr } from '../money.js';

const TOTAL_LABEL = { bn: 'মোট', en: 'Total' };

const main = document.getElementById('main');
const s = await mountShell('transparency', t('tr.title'));
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
        el('tr', {}, el('td', { text: pick(TOTAL_LABEL, lang) }), el('td', { class: 'amt', text: inr(sum(rows), lang) }))));

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
      const headerLine = headerParts.length ? el('p', { class: 'muted', text: headerParts.join(' · ') }) : null;

      const data = selectedYear ? dataFor(selectedYear) : null;

      let body;
      if (errored) {
        body = el('p', { class: 'muted', text: t('common.error') });
      } else if (!data) {
        body = el('p', { class: 'muted', text: t('common.empty') });
      } else {
        const incomeTotal = sum(data.income ?? []);
        const expenseTotal = sum(data.expense ?? []);
        const bal = incomeTotal - expenseTotal;
        const docs = data.documents ?? [];
        body = el('div', {},
          el('div', { class: 'card' }, el('h2', { text: t('tr.income') }), ledgerTable(data.income ?? [], lang)),
          el('div', { class: 'card' }, el('h2', { text: t('tr.expense') }), ledgerTable(data.expense ?? [], lang)),
          el('div', { class: 'card summary' },
            el('span', { text: `${t('tr.income')}: ${inr(incomeTotal, lang)}` }),
            el('span', { text: `${t('tr.expense')}: ${inr(expenseTotal, lang)}` }),
            el('span', { class: bal < 0 ? 'neg' : '', text: `${t('tr.balance')}: ${inr(bal, lang)}` })),
          docs.length ? el('div', { class: 'card' },
            el('h2', { text: t('tr.docs') }),
            ...docs.map(d => el('p', {}, el('a', { href: d.url, target: '_blank', rel: 'noopener', text: pick(d.title, lang) })))) : null,
          data.notes && pick(data.notes, lang) ? el('p', { text: pick(data.notes, lang) }) : null);
      }

      main.replaceChildren(...[
        el('h1', { text: t('tr.title') }),
        headerLine,
        tabsEl,
        body,
      ].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
