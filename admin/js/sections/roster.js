import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { biField, textField, saveDoc, softDelete, restoreDoc } from '../forms.js';

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
// Fix round 1 (finding 1): "মুছে ফেলা দেখাও" + "পুনরুদ্ধার", same shape as forms.js's listView() —
// the query flips deleted==false <-> deleted==true (same composite index) and a deleted row gets
// a Restore button instead of the edit link/published badge.
async function listPane(ctx) {
  const box = el('div');
  const showDeletedCb = el('input', { type: 'checkbox' });
  const listBox = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) }),
    // Item 38: roster rows are only visible to signed-in active members (no anonymous public page
    // to preview) — links to the sign-in entry point instead of a filtered view.
    el('a', { class: 'btn secondary', href: '../members.html', target: '_blank', text: t('admin.preview') }),
    el('label', { class: 'row' }, showDeletedCb, el('span', { text: t('admin.showDeleted') }))));
  box.append(listBox);

  async function render() {
    const showDeleted = showDeletedCb.checked;
    const q = query(collection(ctx.db, COLL), where('deleted', '==', showDeleted), orderBy('date'));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const list = el('div');
    if (!rows.length) list.append(el('p', { text: t('common.empty') }));
    rows.forEach(d => {
      const n = (d.memberPhones ?? []).length;
      const row = el('div', { class: 'list-item' },
        el('a', {
          href: '#', class: 'grow', text: `${fmtDate(d.date, ctx.lang)} · ${pick(d.duty)} · ${n} ${t(L.members)}`,
          onclick: e => { e.preventDefault(); if (!showDeleted) ctx.navigate(`#${COLL}/${d.id}`); },
        }),
        !showDeleted ? el('span', { class: `badge ${d.published ? 'pub' : ''}`, text: d.published ? t('admin.published') : t('admin.draft') }) : null,
      );
      if (showDeleted) {
        row.append(el('button', {
          class: 'btn-sm', type: 'button', text: t('admin.restore'),
          onclick: async () => { await restoreDoc(ctx, COLL, d.id); await render(); },
        }));
      }
      list.append(row);
    });
    listBox.replaceChildren(list);
  }
  showDeletedCb.onchange = render;
  await render();
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
