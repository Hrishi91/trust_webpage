import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, saveDoc, softDelete, restoreDoc } from '../forms.js';

const COLL = 'notices';
// Keys, not resolved {bn,en} objects — resolved with t(L.x) at the point of use so every render
// picks up content/strings overrides and the current language (final-review fix wave, I2).
const L = {
  title: 'admin.notices.title',
  body: 'admin.notices.body',
};

registerSection(COLL, {
  title: 'admin.notices', titleKey: 'admin.notices', icon: '📋',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

// Custom list (not forms.js's listView): notices sort newest-first by `order`
// (= createdAt ms, set once), not the ascending manually-reorderable `order`
// listView assumes — so no up/down reorder controls here.
// Fix round 1 (finding 1): "মুছে ফেলা দেখাও" + "পুনরুদ্ধার", same shape as forms.js's listView() —
// the query flips deleted==false <-> deleted==true (same composite index) and a deleted row gets
// a Restore button instead of the edit link/published badge.
async function listPane(ctx) {
  const box = el('div');
  const showDeletedCb = el('input', { type: 'checkbox' });
  const listBox = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) }),
    // Item 38: notices are only visible to signed-in active members (no anonymous public page to
    // preview) — links to the sign-in entry point instead of a filtered view.
    el('a', { class: 'btn secondary', href: '../members.html', target: '_blank', text: t('admin.preview') }),
    el('label', { class: 'row' }, showDeletedCb, el('span', { text: t('admin.showDeleted') }))));
  box.append(listBox);

  async function render() {
    const showDeleted = showDeletedCb.checked;
    const q = query(collection(ctx.db, COLL), where('deleted', '==', showDeleted), orderBy('order', 'desc'));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const list = el('div');
    if (!rows.length) list.append(el('p', { text: t('common.empty') }));
    rows.forEach(d => {
      const row = el('div', { class: 'list-item' },
        el('a', {
          href: '#', class: 'grow', text: pick(d.title),
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

  const title = biField(t(L.title), 'title', cur.title ?? {});
  const body = biField(t(L.body), 'body', cur.body ?? {}, { multiline: true });

  const save = publish => async e => {
    e.preventDefault();
    // biField has no native `required`; enforce it here so "Save draft" (type=button,
    // bypasses HTML validation) can't silently save a titleless notice either.
    const titleVal = title.read();
    if (!titleVal.bn && !titleVal.en) { toast(t('common.error'), 'err'); return; }
    const data = {
      title: titleVal, body: body.read(),
      // `?? Date.now()` (not bare `cur.order`): a plain `undefined` here would reach
      // logAudit's addDoc() as `after.order === undefined`, which Firestore's JS SDK
      // rejects outright (silently, since logAudit swallows its own errors) — same
      // pitfall history.js avoids with its own `cur.order ?? ...` fallback.
      order: cur.order ?? Date.now(),
    };
    try {
      const newId = await saveDoc(ctx, COLL, isNew ? null : idParam, data, { publish });
      ctx.navigate(`#${COLL}/${newId}`);
    } catch { /* toast shown in saveDoc */ }
  };

  const form = el('form', { class: 'card' }, title.node, body.node,
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
