import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { sum, inr } from '../../../js/money.js';
import { biField, textField, saveDoc, softDelete } from '../forms.js';
import { fileField } from '../upload.js';

const COLL = 'transparency';
const L = {
  category: { bn: 'খাত', en: 'Category' },
  amount: { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  total: { bn: 'মোট', en: 'Total' },
  docTitle: { bn: 'শিরোনাম', en: 'Title' },
  docFile: { bn: 'PDF', en: 'PDF' },
  notes: { bn: 'নোট', en: 'Notes' },
};

registerSection(COLL, {
  title: { bn: 'হিসাব', en: 'Transparency' }, icon: '📊',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

async function listPane(ctx) {
  const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('year', 'desc'));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const box = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) })));
  if (!rows.length) box.append(el('p', { text: t('common.empty') }));
  rows.forEach(d => {
    box.append(el('div', { class: 'list-item' },
      el('a', {
        href: '#', class: 'grow',
        text: `${d.year} · ${t('tr.income')} ${inr(sum(d.income ?? []), ctx.lang)} · ${t('tr.expense')} ${inr(sum(d.expense ?? []), ctx.lang)}`,
        onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${d.id}`); },
      }),
      el('span', { class: `badge ${d.published ? 'pub' : ''}`, text: d.published ? t('admin.published') : t('admin.draft') }),
    ));
  });
  return box;
}

// One income/expense table: each row is a biField (category) + textField (amount) + a remove
// button; a running total line under the table recomputes on every `input` event (delegated on
// the list container, so it also fires as rows are added/removed and typed into).
function rowsSection(ctx, sectionLabel, initialRows, onAnyChange) {
  const list = el('div', { class: 'rows-list' });
  const rows = [];
  const totalEl = el('p', { class: 'muted' });

  // updateTotal() only touches this table's own total line; recompute() also calls onAnyChange
  // (the cross-table balance line). The two are split because rowsSection's own construction
  // below needs an initial total paint *before* the caller's `income`/`expense` const (whichever
  // this call is building) has finished being assigned — calling onAnyChange that early would
  // read that const in its temporal dead zone.
  const updateTotal = () => {
    const total = sum(rows.map(r => ({ amount: Number(r.amt.read()) || 0 })));
    totalEl.textContent = `${pick(L.total)}: ${inr(total, ctx.lang)}`;
  };
  const recompute = () => { updateTotal(); onAnyChange?.(); };

  const addRow = (cur = {}) => {
    const cat = biField(L.category, 'category', cur.category ?? {});
    const amt = textField(L.amount, 'amount', cur.amount ?? '', { type: 'number' });
    const removeBtn = el('button', { class: 'btn-sm', type: 'button', text: '✕' });
    const wrap = el('div', { class: 'row rows-item' }, cat.node, amt.node, removeBtn);
    const entry = { wrap, cat, amt };
    removeBtn.onclick = () => {
      const i = rows.indexOf(entry);
      if (i >= 0) rows.splice(i, 1);
      wrap.remove();
      recompute();
    };
    rows.push(entry);
    list.append(wrap);
  };
  initialRows.forEach(addRow);
  list.addEventListener('input', recompute);
  updateTotal();

  const addBtn = el('button', { class: 'btn-sm', type: 'button', text: t('admin.addRow'), onclick: () => addRow() });
  const node = el('div', {}, el('h3', { text: pick(sectionLabel) }), list, addBtn, totalEl);
  // Empty-category rows are dropped on save — a blank row left over from clicking "+ Row" and
  // not filling it in shouldn't persist as junk data.
  const read = () => rows.map(r => ({ category: r.cat.read(), amount: Number(r.amt.read()) || 0 }))
    .filter(r => r.category.bn || r.category.en);
  return { node, read };
}

// Documents list: each row is a biField (title) + fileField (PDF upload, ≤5MB, client-checked in
// upload.js) + a remove button. `getYear` is read lazily at row-add time so a document added
// after the year field is filled in uploads under that year's folder.
function documentsSection(ctx, initialDocs, getYear) {
  const list = el('div', { class: 'rows-list' });
  const rows = [];

  const addRow = (cur = {}) => {
    const title = biField(L.docTitle, 'title', cur.title ?? {});
    const file = fileField(ctx, L.docFile, cur.url ?? '', { folder: `public/transparency/${getYear() || 'draft'}` });
    const removeBtn = el('button', { class: 'btn-sm', type: 'button', text: '✕' });
    const wrap = el('div', { class: 'row rows-item' }, title.node, file.node, removeBtn);
    const entry = { wrap, title, file };
    removeBtn.onclick = () => {
      const i = rows.indexOf(entry);
      if (i >= 0) rows.splice(i, 1);
      wrap.remove();
    };
    rows.push(entry);
    list.append(wrap);
  };
  initialDocs.forEach(addRow);

  const addBtn = el('button', { class: 'btn-sm', type: 'button', text: t('admin.addRow'), onclick: () => addRow() });
  const node = el('div', {}, el('h3', { text: t('tr.docs') }), list, addBtn);
  // A row without an uploaded PDF (no url) is dropped on save.
  const read = () => rows.map(r => ({ title: r.title.read(), url: r.file.read() })).filter(r => r.url);
  return { node, read };
}

async function formPane(ctx, idParam) {
  const isNew = idParam === 'new';
  const cur = isNew ? {} : (await getDoc(doc(ctx.db, COLL, idParam))).data() ?? {};

  // The doc id is the year, so it can't change once created — the field is disabled on edit.
  const yearField = textField(t('tr.year'), 'year', cur.year ?? '', { type: 'number', required: true });
  if (!isNew) yearField.node.querySelector('input').disabled = true;
  const getYear = () => yearField.read();

  const balanceEl = el('p', { class: 'card' });
  const updateBalance = () => {
    balanceEl.textContent = `${t('tr.balance')}: ${inr(sum(income.read()) - sum(expense.read()), ctx.lang)}`;
  };

  const income = rowsSection(ctx, t('tr.income'), cur.income ?? [], () => updateBalance());
  const expense = rowsSection(ctx, t('tr.expense'), cur.expense ?? [], () => updateBalance());
  updateBalance();

  const documents = documentsSection(ctx, cur.documents ?? [], getYear);
  const notes = biField(L.notes, 'notes', cur.notes ?? {}, { multiline: true });

  const validate = () => {
    const yearStr = yearField.read();
    if (!/^\d{4}$/.test(yearStr)) { toast(t('common.error'), 'err'); return null; }
    const incomeRows = income.read(), expenseRows = expense.read();
    for (const r of [...incomeRows, ...expenseRows]) {
      if (!(Number.isFinite(r.amount) && r.amount >= 0)) { toast(t('common.error'), 'err'); return null; }
    }
    return { year: Number(yearStr), incomeRows, expenseRows };
  };

  const save = publish => async e => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    const { year, incomeRows, expenseRows } = v;
    const data = {
      year, income: incomeRows, expense: expenseRows,
      documents: documents.read(), notes: notes.read(), order: year,
    };
    try {
      if (isNew) {
        // The doc id is the year string — don't let a second "new 2025" silently clobber an
        // existing year's data.
        const existing = await getDoc(doc(ctx.db, COLL, String(year)));
        if (existing.exists()) { toast(t('common.error'), 'err'); return; }
      }
      const newId = await saveDoc(ctx, COLL, String(year), data, { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    } catch { /* toast shown in saveDoc */ }
  };

  const form = el('form', { class: 'card' },
    yearField.node, income.node, expense.node, balanceEl, documents.node, notes.node,
    el('div', { class: 'row' },
      el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
      el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
      !isNew ? el('a', { class: 'btn secondary', href: `../transparency.html?year=${idParam}&preview=1`, target: '_blank', text: t('admin.preview') }) : null,
      !isNew ? el('button', {
        class: 'btn danger', type: 'button', text: t('admin.delete'),
        onclick: async () => { try { if (await softDelete(ctx, COLL, idParam)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } },
      }) : null,
    ));
  form.onsubmit = save(true);
  return form;
}
