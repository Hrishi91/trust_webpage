import { registerSection } from '../admin.js';
import { collection, doc, getDocs, updateDoc, query, where, orderBy, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { biField, boolField, textField, saveDoc, softDelete, toLocalInput } from '../forms.js';
import { logAudit } from '../audit.js';

const COLL = 'announcements';
const L = {
  text: { bn: 'বার্তা', en: 'Message' },
  pinned: { bn: 'পিন করুন', en: 'Pin to top' },
  isLive: { bn: 'এখন লাইভ', en: 'Live now' },
  expiresAt: { bn: 'মেয়াদ শেষ (ঐচ্ছিক)', en: 'Expires at (optional)' },
  edit: { bn: 'সম্পাদনা', en: 'Edit' },
  expired: { bn: 'মেয়াদ শেষ', en: 'expired' },
};

registerSection(COLL, {
  title: { bn: 'ঘোষণা', en: 'Announcements' }, icon: '📢',
  async render(box, ctx) {
    box.append(await mainPane(ctx));
  },
});

async function mainPane(ctx) {
  const formBox = el('div');
  const listBox = el('div');
  let editingId = null;

  function renderForm(cur = {}, id = null) {
    editingId = id;
    const f = {
      text: biField(L.text, 'text', cur.text ?? {}, { multiline: true }),
      pinned: boolField(L.pinned, 'pinned', cur.pinned ?? false),
      isLive: boolField(L.isLive, 'isLive', cur.isLive ?? false),
      expiresAt: textField(L.expiresAt, 'expiresAt', toLocalInput(cur.expiresAt ?? ''), { type: 'datetime-local' }),
    };
    const save = async e => {
      e.preventDefault();
      const text = f.text.read();
      if (!text.bn && !text.en) { toast(t('common.error'), 'err'); return; }
      const v = f.expiresAt.read();
      const data = {
        text, pinned: f.pinned.read(), isLive: f.isLive.read(),
        expiresAt: v ? new Date(v).toISOString() : '',
      };
      try {
        if (editingId) {
          // Edit: update text/pinned/isLive/expiresAt only — published and order are untouched.
          await saveDoc(ctx, COLL, editingId, data);
        } else {
          // New: quick-post publishes immediately, order stamps creation time once.
          data.order = Date.now();
          await saveDoc(ctx, COLL, null, data, { publish: true });
        }
        renderForm();
        await refreshList();
      } catch { /* toast shown in saveDoc */ }
    };
    const form = el('form', { class: 'card' },
      f.text.node, f.pinned.node, f.isLive.node, f.expiresAt.node,
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
      ));
    form.onsubmit = save;
    formBox.replaceChildren(form);
  }

  async function refreshList() {
    const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('order', 'desc'));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const list = el('div');
    if (!rows.length) list.append(el('p', { text: t('common.empty') }));
    const now = Date.now();
    rows.forEach(d => {
      const badges = [];
      if (d.pinned) badges.push('📌');
      if (d.isLive) badges.push('🔴');
      if (d.expiresAt) {
        const exp = new Date(d.expiresAt).getTime();
        badges.push(exp > now ? `⏳ ${fmtDate(d.expiresAt, ctx.lang)}` : pick(L.expired));
      }
      if (!d.published) badges.push(t('admin.draft'));
      list.append(el('div', { class: 'list-item' },
        el('span', { class: 'grow', text: `${pick(d.text)} · ${fmtDate(d.order, ctx.lang)}` }),
        ...badges.map(b => el('span', { class: 'badge', text: b })),
        el('button', { class: 'btn-sm', type: 'button', text: pick(L.edit), onclick: () => renderForm(d, d.id) }),
        el('button', {
          class: 'btn-sm', type: 'button', text: d.published ? t('admin.unpublish') : t('admin.publish'),
          onclick: async () => {
            try {
              const ref = doc(ctx.db, COLL, d.id);
              await updateDoc(ref, { published: !d.published, updatedAt: serverTimestamp() });
              await logAudit(ctx, d.published ? 'unpublish' : 'publish', `${COLL}/${d.id}`, { published: d.published }, { published: !d.published });
              toast(t('admin.saved'));
              await refreshList();
            } catch (err) { console.error(err); toast(t('common.error'), 'err'); }
          },
        }),
        el('button', {
          class: 'btn-sm', type: 'button', text: t('admin.delete'),
          onclick: async () => {
            try { if (await softDelete(ctx, COLL, d.id)) await refreshList(); }
            catch { /* toast shown in softDelete */ }
          },
        }),
      ));
    });
    listBox.replaceChildren(list);
  }

  renderForm();
  await refreshList();
  return el('div', {}, formBox, listBox);
}
