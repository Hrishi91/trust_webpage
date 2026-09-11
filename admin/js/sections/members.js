import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { sum, inr, balance } from '../../../js/money.js';
import { normalizePhone } from '../../../js/phone.js';
import { biField, textField, boolField, saveDoc, softDelete } from '../forms.js';

const COLL = 'members';
// Keys, not resolved {bn,en} objects — resolved with t(L.x) at the point of use so every render
// picks up content/strings overrides and the current language (final-review fix wave, I2).
const L = {
  phone: 'admin.members.phone',
  name: 'admin.members.name',
  role: 'admin.members.role',
  pledge: 'admin.members.pledge',
  active: 'admin.members.active',
  inactive: 'admin.members.inactive',
  date: 'admin.members.date',
  amount: 'admin.members.amount',
  note: 'admin.members.note',
  payments: 'admin.members.payments',
};

registerSection(COLL, {
  title: 'admin.members', titleKey: 'admin.members', icon: '🧾',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

async function listPane(ctx) {
  const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('order'));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const box = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) })));
  if (!rows.length) box.append(el('p', { text: t('common.empty') }));
  rows.forEach(d => {
    const due = balance(d.pledge || 0, d.payments ?? []);
    box.append(el('div', { class: 'list-item' },
      el('a', {
        href: '#', class: 'grow',
        text: `${pick(d.name)} · ${d.id} · ${t('mem.due')} ${inr(due, ctx.lang)}`,
        onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${d.id}`); },
      }),
      !d.active ? el('span', { class: 'badge', text: t(L.inactive) }) : null,
    ));
  });
  return box;
}

// Payments table: each row is a date/amount/note textField trio + a remove button.
// A running paid/due totals line recomputes on every `input` event (delegated on the
// list, same pattern as transparency.js's rowsSection).
function paymentsSection(ctx, initialRows, updateTotals) {
  const list = el('div', { class: 'rows-list' });
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);

  const addRow = (cur = {}) => {
    const date = textField(t(L.date), 'date', cur.date ?? today, { type: 'date' });
    const amount = textField(t(L.amount), 'amount', cur.amount ?? '', { type: 'number' });
    const note = textField(t(L.note), 'note', cur.note ?? '');
    const removeBtn = el('button', { class: 'btn-sm', type: 'button', text: '✕' });
    const wrap = el('div', { class: 'row rows-item' }, date.node, amount.node, note.node, removeBtn);
    const entry = { wrap, date, amount, note };
    removeBtn.onclick = () => {
      const i = rows.indexOf(entry);
      if (i >= 0) rows.splice(i, 1);
      wrap.remove();
      updateTotals();
    };
    rows.push(entry);
    list.append(wrap);
  };
  initialRows.forEach(addRow);
  list.addEventListener('input', updateTotals);

  const addBtn = el('button', { class: 'btn-sm', type: 'button', text: t('admin.addPayment'), onclick: () => addRow() });
  const node = el('div', {}, el('h3', { text: t(L.payments) }), list, addBtn);
  // A row with no positive amount is dropped on save (a blank row left from clicking
  // "+ Payment" and not filling it in shouldn't persist as junk data).
  const read = () => rows.map(r => ({ date: r.date.read(), amount: Number(r.amount.read()) || 0, note: r.note.read() }))
    .filter(r => r.amount > 0);
  return { node, read };
}

async function formPane(ctx, idParam) {
  const isNew = idParam === 'new';
  const cur = isNew ? {} : (await getDoc(doc(ctx.db, COLL, idParam))).data() ?? {};

  // Phone is the doc id, immutable after create — disabled on edit.
  const phoneField = textField(t(L.phone), 'phone', isNew ? '' : idParam, { required: true });
  if (!isNew) phoneField.node.querySelector('input').disabled = true;

  const name = biField(t(L.name), 'name', cur.name ?? {});
  const role = biField(t(L.role), 'role', cur.role ?? {});
  const pledgeField = textField(t(L.pledge), 'pledge', cur.pledge ?? 0, { type: 'number' });
  const active = boolField(t(L.active), 'active', cur.active ?? true);

  const totalsEl = el('p', { class: 'muted' });
  const updateTotals = () => {
    const paidNow = sum(payments.read());
    const pledgeNow = Number(pledgeField.read()) || 0;
    totalsEl.textContent = `${t(L.payments)} — ${t('mem.paid')}: ${inr(paidNow, ctx.lang)} · ${t('mem.due')}: ${inr(balance(pledgeNow, payments.read()), ctx.lang)}`;
  };
  const payments = paymentsSection(ctx, cur.payments ?? [], () => updateTotals());
  pledgeField.node.querySelector('input').addEventListener('input', updateTotals);
  updateTotals();

  const save = async e => {
    e.preventDefault();
    const phone = normalizePhone(phoneField.read());
    if (!phone) { toast(t('common.error'), 'err'); return; }
    const nameVal = name.read();
    if (!nameVal.bn && !nameVal.en) { toast(t('common.error'), 'err'); return; }
    const pledgeVal = Number(pledgeField.read());
    if (!(Number.isFinite(pledgeVal) && pledgeVal >= 0)) { toast(t('common.error'), 'err'); return; }
    const paymentsVal = payments.read();
    for (const p of paymentsVal) {
      if (!(Number.isFinite(p.amount) && p.amount > 0)) { toast(t('common.error'), 'err'); return; }
    }
    const data = {
      name: nameVal, role: role.read(), pledge: pledgeVal, payments: paymentsVal,
      active: active.read(), order: cur.order ?? Date.now(),
    };
    try {
      if (isNew) {
        // The doc id is the phone number — don't let a second "new <same phone>" silently
        // clobber an existing member's data.
        const existing = await getDoc(doc(ctx.db, COLL, phone));
        if (existing.exists()) { toast(t('common.error'), 'err'); return; }
      }
      const newId = await saveDoc(ctx, COLL, phone, data, { publish: true });
      ctx.navigate(`#${COLL}/${newId}`);
    } catch { /* toast shown in saveDoc */ }
  };

  const form = el('form', { class: 'card' },
    phoneField.node, name.node, role.node, pledgeField.node, active.node,
    payments.node, totalsEl,
    el('div', { class: 'row' },
      el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
      !isNew ? el('button', {
        class: 'btn danger', type: 'button', text: t('admin.delete'),
        onclick: async () => { try { if (await softDelete(ctx, COLL, idParam)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } },
      }) : null,
    ));
  form.onsubmit = save;
  return form;
}
