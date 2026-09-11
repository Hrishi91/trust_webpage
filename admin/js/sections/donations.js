import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { sum, inr } from '../../../js/money.js';
import { textField, boolField, saveDoc, softDelete } from '../forms.js';

const COLL = 'donations';
const MODES = ['cash', 'upi', 'bank'];
// Keys, not resolved {bn,en} objects — resolved with t(...) at the point of use so every render
// picks up content/strings overrides and the current language (final-review fix wave, I2).
const MODE_KEY = {
  cash: 'admin.donations.modeCash',
  upi: 'admin.donations.modeUpi',
  bank: 'admin.donations.modeBank',
};
const L = {
  count: 'admin.donations.count',
  total: 'admin.donations.total',
  wall: 'admin.donations.wall',
  year: 'admin.donations.year',
  save: 'admin.donations.save',
  donorName: 'admin.donations.donorName',
  amount: 'admin.donations.amount',
  date: 'admin.donations.date',
  mode: 'admin.donations.mode',
  receiptNo: 'admin.donations.receiptNo',
  anonymous: 'admin.donations.anonymous',
  showOnWall: 'admin.donations.showOnWall',
  note: 'admin.donations.note',
};

registerSection(COLL, {
  title: 'admin.donations', titleKey: 'admin.donations', icon: '💰',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

async function listPane(ctx) {
  const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const currentYear = new Date().getFullYear();
  const dataYears = [...new Set(rows.map(r => r.year))];
  const options = [...new Set([...dataYears, currentYear])].sort((a, b) => b - a);
  const defaultYear = dataYears.includes(currentYear) ? currentYear : (dataYears.length ? Math.max(...dataYears) : currentYear);

  const body = el('div');
  const renderYear = year => {
    const yearRows = rows.filter(r => r.year === year);
    const total = sum(yearRows);
    const byMode = Object.fromEntries(MODES.map(m => [m, sum(yearRows.filter(r => r.mode === m))]));
    const wallCount = yearRows.filter(r => r.showOnWall).length;

    const summary = el('div', { class: 'card' },
      el('p', { text: `${t(L.count)}: ${yearRows.length} · ${t(L.total)}: ${inr(total, ctx.lang)}` }),
      el('p', { text: MODES.map(m => `${t(MODE_KEY[m])} ${inr(byMode[m], ctx.lang)}`).join(' · ') }),
      el('p', { text: `${t(L.wall)}: ${wallCount}` }),
    );
    const list = el('div');
    if (!yearRows.length) list.append(el('p', { text: t('common.empty') }));
    yearRows.forEach(d => {
      list.append(el('div', { class: 'list-item' },
        el('a', {
          href: '#', class: 'grow',
          text: `${fmtDate(d.date, ctx.lang)} · ${d.isAnonymous ? t('donate.anonymous') : d.donorName} · ${inr(d.amount, ctx.lang)} · ${t(MODE_KEY[d.mode] ?? MODE_KEY.cash)}`,
          onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${d.id}`); },
        }),
        d.showOnWall ? el('span', { class: 'badge pub', text: t(L.wall) }) : null,
      ));
    });
    body.replaceChildren(summary, list);
  };
  renderYear(defaultYear);

  const yearSelect = el('select', { onchange: e => renderYear(Number(e.target.value)) },
    ...options.map(y => el('option', { value: y, selected: y === defaultYear, text: String(y) })));

  const outer = el('div');
  outer.append(
    el('div', { class: 'row' },
      el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) }),
      el('label', {}, el('span', { text: t(L.year) }), yearSelect),
    ),
    body,
  );
  return outer;
}

async function formPane(ctx, id) {
  const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const dateVal = cur.date ?? today;
  const receiptDefault = id === 'new'
    ? `R-${dateVal.slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`
    : (cur.receiptNo ?? '');

  const f = {
    donorName: textField(t(L.donorName), 'donorName', cur.donorName ?? '', { required: true }),
    amount: textField(t(L.amount), 'amount', cur.amount ?? '', { type: 'number', required: true }),
    date: textField(t(L.date), 'date', dateVal, { type: 'date', required: true }),
    receiptNo: textField(t(L.receiptNo), 'receiptNo', receiptDefault),
    note: textField(t(L.note), 'note', cur.note ?? ''),
  };
  const modeSelect = el('select', { name: 'mode' },
    ...MODES.map(m => el('option', { value: m, selected: (cur.mode ?? 'cash') === m, text: t(MODE_KEY[m]) })));
  const modeField = el('label', {}, el('span', { text: t(L.mode) }), modeSelect);
  const isAnonymous = boolField(t(L.anonymous), 'isAnonymous', cur.isAnonymous ?? false);
  const showOnWall = boolField(t(L.showOnWall), 'showOnWall', cur.showOnWall ?? true);

  const read = () => {
    const date = f.date.read();
    return {
      donorName: f.donorName.read(), amount: Number(f.amount.read()), date, mode: modeSelect.value,
      receiptNo: f.receiptNo.read(), year: Number(date.slice(0, 4)), isAnonymous: isAnonymous.read(),
      showOnWall: showOnWall.read(), note: f.note.read(), order: new Date(date).getTime(),
    };
  };
  const save = async e => {
    e.preventDefault();
    const name = f.donorName.read(), amount = Number(f.amount.read()), date = f.date.read();
    if (!name || !(amount > 0) || Number.isNaN(new Date(date).getTime())) { toast(t('common.error'), 'err'); return; }
    try {
      const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish: true });
      ctx.navigate(`#${COLL}/${newId}`);
    } catch { /* toast shown in saveDoc */ }
  };
  const form = el('form', { class: 'card' },
    f.donorName.node, f.amount.node, f.date.node, modeField, f.receiptNo.node,
    isAnonymous.node, showOnWall.node, f.note.node,
    el('div', { class: 'row' },
      el('button', { class: 'btn', type: 'submit', text: t(L.save) }),
      id !== 'new' ? el('button', {
        class: 'btn danger', type: 'button', text: t('admin.delete'),
        onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } },
      }) : null,
    ));
  form.onsubmit = save;
  return form;
}
