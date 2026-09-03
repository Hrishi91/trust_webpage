import { registerSection } from '../admin.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, saveDoc, softDelete } from '../forms.js';

const COLL = 'notices';
const L = {
  title: { bn: 'শিরোনাম', en: 'Title' },
  body: { bn: 'বিবরণ (HTML: <p> <b> <ul> <li>)', en: 'Body (HTML allowed)' },
};

registerSection(COLL, {
  title: { bn: 'নোটিশ', en: 'Notices' }, icon: '📋',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    box.append(id === undefined ? await listPane(ctx) : await formPane(ctx, id));
  },
});

// Custom list (not forms.js's listView): notices sort newest-first by `order`
// (= createdAt ms, set once), not the ascending manually-reorderable `order`
// listView assumes — so no up/down reorder controls here.
async function listPane(ctx) {
  const q = query(collection(ctx.db, COLL), where('deleted', '==', false), orderBy('order', 'desc'));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const box = el('div');
  box.append(el('div', { class: 'row' },
    el('button', { class: 'btn', type: 'button', text: t('admin.new'), onclick: () => ctx.navigate(`#${COLL}/new`) })));
  if (!rows.length) box.append(el('p', { text: t('common.empty') }));
  rows.forEach(d => {
    box.append(el('div', { class: 'list-item' },
      el('a', {
        href: '#', class: 'grow', text: pick(d.title),
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

  const title = biField(L.title, 'title', cur.title ?? {});
  const body = biField(L.body, 'body', cur.body ?? {}, { multiline: true });

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
