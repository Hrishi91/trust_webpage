import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { biField, textField, saveDoc, softDelete } from '../forms.js';

const COLL = 'roster';
// Keys, not resolved {bn,en} objects — resolved with t(L.x) at the point of use so every render
// picks up content/strings overrides and the current language (final-review fix wave, I2).
const L = {
  date: 'admin.roster.date',
  duty: 'admin.roster.duty',
  members: 'admin.roster.members',
  note: 'admin.roster.note',
};

registerSection(COLL, {
  title: 'admin.roster', titleKey: 'admin.roster', icon: '🗓️',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

// Custom list (not forms.js's listView): roster sorts chronologically by `date`
// (order = date ms mirrors it for the member-facing query), not the manually
// reorderable ascending `order` listView assumes — so no up/down controls here.
async function listPane(ctx) {
  const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('date'));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const box = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) })));
  if (!rows.length) box.append(el('p', { text: t('common.empty') }));
  rows.forEach(d => {
    const n = (d.memberPhones ?? []).length;
    box.append(el('div', { class: 'list-item' },
      el('a', {
        href: '#', class: 'grow', text: `${fmtDate(d.date, ctx.lang)} · ${pick(d.duty)} · ${n} ${t(L.members)}`,
        onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${d.id}`); },
      }),
      el('span', { class: `badge ${d.published ? 'pub' : ''}`, text: d.published ? t('admin.published') : t('admin.draft') }),
    ));
  });
  return box;
}

async function formPane(ctx, idParam) {
  const isNew = idParam === 'new';
  const cur = isNew ? {} : (await getDoc(doc(ctx.db, COLL, idParam))).data() ?? {};

  const dateField = textField(t(L.date), 'date', cur.date ?? '', { type: 'date', required: true });
  const duty = biField(t(L.duty), 'duty', cur.duty ?? {});
  const note = textField(t(L.note), 'note', cur.note ?? '');

  // Members checkbox list: active, non-deleted members ordered like the members section's
  // own list. `active` is filtered client-side — no composite (deleted, active, order) index
  // exists, only (deleted, order), which this query matches.
  const memSnap = await getDocs(query(collection(ctx.db, 'members'), where('deleted', '==', false), orderBy('order')));
  const members = memSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.active);
  const selected = new Set(cur.memberPhones ?? []);
  const checks = members.map(m => {
    const input = el('input', { type: 'checkbox' });
    input.checked = selected.has(m.id);
    return { phone: m.id, input, node: el('label', { class: 'row' }, input, el('span', { text: `${pick(m.name)} · ${m.id}` })) };
  });
  const membersBox = el('div', {}, el('span', { text: t(L.members) }), ...checks.map(c => c.node));
  if (!checks.length) membersBox.append(el('p', { text: t('common.empty') }));

  const save = publish => async e => {
    e.preventDefault();
    // "Save draft" is type=button and bypasses the date input's `required` validation
    // (same reasoning as history.js's year guard) — check date + duty explicitly. Zero
    // members selected is allowed: a duty can be posted unassigned.
    const dateVal = dateField.read();
    const dutyVal = duty.read();
    if (!dateVal || (!dutyVal.bn && !dutyVal.en)) { toast(t('common.error'), 'err'); return; }
    const data = {
      date: dateVal, duty: dutyVal, note: note.read(),
      memberPhones: checks.filter(c => c.input.checked).map(c => c.phone),
      order: new Date(dateVal).getTime(),
    };
    try {
      const newId = await saveDoc(ctx, COLL, isNew ? null : idParam, data, { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    } catch { /* toast shown in saveDoc */ }
  };

  const form = el('form', { class: 'card' }, dateField.node, duty.node, membersBox, note.node,
    el('div', { class: 'row' },
      el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
      el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
      !isNew ? el('button', {
        class: 'btn danger', type: 'button', text: t('admin.delete'),
        onclick: async () => { try { if (await softDelete(ctx, COLL, idParam)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } },
      }) : null));
  form.onsubmit = save(true);
  return form;
}
