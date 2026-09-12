import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp, writeBatch } from '../../js/firebase.js';
import { t, pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
import { logAudit } from './audit.js';

// ISO string (possibly with seconds + Z, as stored in Firestore) -> the local
// "yyyy-MM-ddThh:mm" string an <input type="datetime-local"> accepts as its value.
// Reused by events (Task 19) — keep the name.
export const toLocalInput = iso => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

export function biField(label, name, value = {}, { multiline = false } = {}) {
  const mk = (lang) => el(multiline ? 'textarea' : 'input', { name: `${name}.${lang}`, placeholder: lang.toUpperCase(), value: multiline ? undefined : (value[lang] || '') });
  const bn = mk('bn'), en = mk('en');
  if (multiline) { bn.value = value.bn || ''; en.value = value.en || ''; bn.rows = en.rows = 4; }
  const node = el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'bi' }, bn, en));
  return { node, read: () => ({ bn: bn.value.trim(), en: en.value.trim() }) };
}
export function textField(label, name, value = '', { type = 'text', required = false, multiline = false } = {}) {
  const input = el(multiline ? 'textarea' : 'input', multiline ? { name, required } : { name, type, value, required });
  if (multiline) { input.value = value; input.rows = 4; }
  return { node: el('label', {}, el('span', { text: pick(label) }), input), read: () => input.value.trim() };
}
export function boolField(label, name, value = false) {
  const input = el('input', { name, type: 'checkbox' }); input.checked = !!value;
  return { node: el('label', { class: 'row' }, input, el('span', { text: pick(label) })), read: () => input.checked };
}

// Item 40: a client-side search box that filters already-rendered rows by their visible text — no
// refetch, no new query. The caller places the returned <input> above whatever container it should
// filter (a listView() result, or a section's own custom listPane); `rowSelector` defaults to
// '.list-item', the class every list row in this admin panel already uses.
export function searchInput(container, rowSelector = '.list-item') {
  const input = el('input', { type: 'search', placeholder: t('admin.search'), 'aria-label': t('admin.search') });
  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    container.querySelectorAll(rowSelector).forEach(row => {
      row.style.display = !q || row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
  return input;
}

export async function saveDoc(ctx, coll, id, data, { publish } = {}) {
  try {
    const ref = id ? doc(ctx.db, coll, id) : doc(collection(ctx.db, coll));
    const before = id ? (await getDoc(ref)).data() ?? null : null;
    const payload = { ...data, deleted: false, updatedAt: serverTimestamp() };
    if (publish !== undefined) payload.published = publish;
    else if (!before) payload.published = false;
    if (!before) { payload.createdAt = serverTimestamp(); if (payload.order == null) payload.order = Date.now(); }
    await setDoc(ref, payload, { merge: true });
    await logAudit(ctx, id ? 'update' : 'create', `${coll}/${ref.id}`, before, data);
    toast(t('admin.saved'));
    return ref.id;
  } catch (err) {
    console.error(err);
    toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
    throw err;
  }
}

// Fix round 1 (finding 1): shared restore action — listView()'s own "পুনরুদ্ধার" button used to
// inline this updateDoc+logAudit+toast sequence; donations/members/notices/roster's custom list
// panes need the identical restore action for their own showDeleted toggles, so it moved here
// once and every call site (listView included) shares it.
export async function restoreDoc(ctx, coll, id) {
  const ref = doc(ctx.db, coll, id);
  await updateDoc(ref, { deleted: false, updatedAt: serverTimestamp() });
  await logAudit(ctx, 'restore', `${coll}/${id}`, { deleted: true }, { deleted: false });
  toast(t('admin.saved'));
}

export async function softDelete(ctx, coll, id) {
  if (!confirm(t('admin.confirmDelete'))) return false;
  if (!(await ctx.reauth())) return false;
  try {
    const ref = doc(ctx.db, coll, id);
    const before = (await getDoc(ref)).data();
    await updateDoc(ref, { deleted: true, updatedAt: serverTimestamp() });
    await logAudit(ctx, 'delete', `${coll}/${id}`, before, { deleted: true });
    toast(t('admin.saved'));
    return true;
  } catch (err) {
    console.error(err);
    toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
    throw err;
  }
}

// Item 35: a "মুছে ফেলা দেখাও" checkbox switches the query from deleted==false to deleted==true
// (same composite index shape, just the opposite literal — see firestore.indexes.json's
// `deleted+order` entries, one per listView collection) and each row in that mode gets a
// "পুনরুদ্ধার" button instead of the reorder/edit-link controls, since a deleted row isn't
// editable until it's back. Restoring just flips `deleted:false` (rules already allow this — the
// admin update rule only requires hasDeletedFlag(), not deleted:false specifically) and logs an
// audit 'restore' row, same shape as the existing 'delete'/'reorder' entries.
export async function listView(ctx, { coll, itemLabel, badge, onEdit, onNew, reorder = true }) {
  const outer = el('div');
  const showDeletedCb = el('input', { type: 'checkbox' });
  const listBox = el('div');
  outer.append(
    el('div', { class: 'list-toolbar' },
      el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: onNew }),
      el('label', { class: 'row' }, showDeletedCb, el('span', { text: t('admin.showDeleted') }))),
    listBox,
  );

  async function renderRows() {
    const showDeleted = showDeletedCb.checked;
    const q = query(collection(ctx.db, coll), where('deleted', '==', showDeleted), orderBy('order'));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rows = el('div');
    if (!docs.length) rows.append(el('p', { text: t('common.empty') }));
    docs.forEach((d, i) => {
      const b = badge ? badge(d) : null;
      const row = el('div', { class: 'list-item' },
        el('a', {
          href: '#', class: 'grow', text: itemLabel(d),
          onclick: e => { e.preventDefault(); if (!showDeleted) onEdit(d.id); },
        }),
        b && el('span', { class: `badge ${b === 'pub' ? 'pub' : ''}`, text: b === 'pub' ? t('admin.published') : t('admin.draft') }),
      );
      if (showDeleted) {
        row.append(el('button', {
          class: 'btn-sm', type: 'button', text: t('admin.restore'),
          onclick: async () => { await restoreDoc(ctx, coll, d.id); await renderRows(); },
        }));
      } else if (reorder) {
        const swap = async (j) => {
          if (j < 0 || j >= docs.length) return;
          const a = docs[i], c = docs[j];
          const batch = writeBatch(ctx.db);
          batch.update(doc(ctx.db, coll, a.id), { order: c.order });
          batch.update(doc(ctx.db, coll, c.id), { order: a.order });
          await batch.commit();
          await logAudit(ctx, 'reorder', `${coll}/${a.id}`, { order: a.order }, { order: c.order });
          await renderRows();
        };
        row.append(el('button', { class: 'btn-sm', type: 'button', text: '↑', onclick: () => swap(i - 1) }),
                   el('button', { class: 'btn-sm', type: 'button', text: '↓', onclick: () => swap(i + 1) }));
      }
      rows.append(row);
    });
    listBox.replaceChildren(rows);
  }
  showDeletedCb.onchange = renderRows;
  await renderRows();
  return outer;
}
