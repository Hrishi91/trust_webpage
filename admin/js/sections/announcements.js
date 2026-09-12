import { registerSection } from '../admin.js';
import { collection, doc, getDocs, updateDoc, query, where, orderBy, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { biField, boolField, textField, saveDoc, softDelete, toLocalInput } from '../forms.js';
import { logAudit } from '../audit.js';

const COLL = 'announcements';
// Keys, not resolved {bn,en} objects — resolved with t(L.x) at the point of use so every render
// picks up content/strings overrides and the current language (final-review fix wave, I2).
const L = {
  text: 'admin.announcements.text',
  pinned: 'admin.announcements.pinned',
  isLive: 'admin.announcements.isLive',
  expiresAt: 'admin.announcements.expiresAt',
  edit: 'admin.announcements.edit',
  expired: 'admin.announcements.expired',
};

registerSection(COLL, {
  title: 'admin.announcements', titleKey: 'admin.announcements', icon: '📢',
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
      text: biField(t(L.text), 'text', cur.text ?? {}, { multiline: true }),
      pinned: boolField(t(L.pinned), 'pinned', cur.pinned ?? false),
      isLive: boolField(t(L.isLive), 'isLive', cur.isLive ?? false),
      expiresAt: textField(t(L.expiresAt), 'expiresAt', toLocalInput(cur.expiresAt ?? ''), { type: 'datetime-local' }),
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
        // Item 38: announcements render in the ticker on every page — js/shell.js's mountShell()
        // now reads deleted==false unfiltered (bypassing published) when ?preview=1 under admin auth.
        el('a', { class: 'btn secondary', href: `../index.html?preview=1`, target: '_blank', text: t('admin.preview') }),
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
        badges.push(exp > now ? `⏳ ${fmtDate(d.expiresAt, ctx.lang)}` : t(L.expired));
      }
      if (!d.published) badges.push(t('admin.draft'));
      list.append(el('div', { class: 'list-item' },
        el('span', { class: 'grow', text: `${pick(d.text)} · ${fmtDate(d.order, ctx.lang)}` }),
        ...badges.map(b => el('span', { class: 'badge', text: b })),
        el('button', { class: 'btn-sm', type: 'button', text: t(L.edit), onclick: () => renderForm(d, d.id) }),
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
