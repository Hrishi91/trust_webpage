import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { sum, inr } from '../../../js/money.js';
import { textField, boolField, saveDoc, softDelete } from '../forms.js';

const COLL = 'donations';
const MODES = ['cash', 'upi', 'bank'];
const MODE_LABEL = {
  cash: { bn: 'নগদ', en: 'Cash' },
  upi: { bn: 'UPI', en: 'UPI' },
  bank: { bn: 'ব্যাঙ্ক', en: 'Bank' },
};
const L = {
  count: { bn: 'সংখ্যা', en: 'Count' },
  total: { bn: 'মোট', en: 'Total' },
  wall: { bn: 'দেয়ালে দেখানো হচ্ছে', en: 'On donor wall' },
  year: { bn: 'বছর', en: 'Year' },
  save: { bn: 'সেভ করুন', en: 'Save' },
  donorName: { bn: 'দাতার নাম', en: 'Donor name' },
  amount: { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  date: { bn: 'তারিখ', en: 'Date' },
  mode: { bn: 'মাধ্যম', en: 'Mode' },
  receiptNo: { bn: 'রসিদ নং', en: 'Receipt no.' },
  anonymous: { bn: 'নাম প্রকাশে অনিচ্ছুক', en: 'Anonymous' },
  showOnWall: { bn: 'দেয়ালে দেখান', en: 'Show on donor wall' },
  note: { bn: 'নোট', en: 'Note' },
};

registerSection(COLL, {
  title: { bn: 'দান', en: 'Donations' }, icon: '💰',
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
      el('p', { text: `${pick(L.count)}: ${yearRows.length} · ${pick(L.total)}: ${inr(total, ctx.lang)}` }),
      el('p', { text: MODES.map(m => `${pick(MODE_LABEL[m])} ${inr(byMode[m], ctx.lang)}`).join(' · ') }),
      el('p', { text: `${pick(L.wall)}: ${wallCount}` }),
    );
    const list = el('div');
    if (!yearRows.length) list.append(el('p', { text: t('common.empty') }));
    yearRows.forEach(d => {
      list.append(el('div', { class: 'list-item' },
        el('a', {
          href: '#', class: 'grow',
          text: `${fmtDate(d.date, ctx.lang)} · ${d.isAnonymous ? t('donate.anonymous') : d.donorName} · ${inr(d.amount, ctx.lang)} · ${pick(MODE_LABEL[d.mode] ?? MODE_LABEL.cash)}`,
          onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${d.id}`); },
        }),
        d.showOnWall ? el('span', { class: 'badge pub', text: pick(L.wall) }) : null,
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
      el('label', {}, el('span', { text: pick(L.year) }), yearSelect),
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
    donorName: textField(L.donorName, 'donorName', cur.donorName ?? '', { required: true }),
    amount: textField(L.amount, 'amount', cur.amount ?? '', { type: 'number', required: true }),
    date: textField(L.date, 'date', dateVal, { type: 'date', required: true }),
    receiptNo: textField(L.receiptNo, 'receiptNo', receiptDefault),
    note: textField(L.note, 'note', cur.note ?? ''),
  };
  const modeSelect = el('select', { name: 'mode' },
    ...MODES.map(m => el('option', { value: m, selected: (cur.mode ?? 'cash') === m, text: pick(MODE_LABEL[m]) })));
  const modeField = el('label', {}, el('span', { text: pick(L.mode) }), modeSelect);
  const isAnonymous = boolField(L.anonymous, 'isAnonymous', cur.isAnonymous ?? false);
  const showOnWall = boolField(L.showOnWall, 'showOnWall', cur.showOnWall ?? true);

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
      el('button', { class: 'btn', type: 'submit', text: pick(L.save) }),
      id !== 'new' ? el('button', {
        class: 'btn danger', type: 'button', text: t('admin.delete'),
        onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } },
      }) : null,
    ));
  form.onsubmit = save;
  return form;
}
