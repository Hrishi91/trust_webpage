import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, boolField, listView, saveDoc, softDelete, searchInput } from '../forms.js';
import { imageField } from '../upload.js';

const COLL = 'committee';
registerSection(COLL, {
  title: 'nav.committee', titleKey: 'nav.committee', icon: '👥',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      // Item 40: search narrows the rendered list client-side, no refetch.
      const list = await listView(ctx, {
        coll: COLL, itemLabel: d => `${pick(d.name)} — ${pick(d.post)}`,
        badge: d => d.isPublic ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      });
      box.append(searchInput(list), list);
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      name: biField(t('admin.committee.name'), 'name', cur.name),
      post: biField(t('admin.committee.post'), 'post', cur.post),
      photo: imageField(ctx, t('admin.committee.photo'), cur.photoUrl, { folder: 'public/committee', max: 600 }),
      isPublic: boolField(t('admin.committee.isPublic'), 'isPublic', cur.isPublic ?? true),
      officer: boolField(t('admin.committee.officer'), 'officer', cur.officer ?? false),
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }),
        // Item 38: committee.html had no ?preview=1 branch before this task — js/pages/committee.js
        // now reads deleted==false unfiltered (bypassing isPublic too) under admin auth, same
        // pattern as history's about.html?preview=1.
        id !== 'new' && el('a', { class: 'btn secondary', href: `../committee.html?preview=1`, target: '_blank', text: t('admin.preview') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } } })));
    form.onsubmit = async e => {
      e.preventDefault();
      const data = { name: f.name.read(), post: f.post.read(), photoUrl: f.photo.read(), isPublic: f.isPublic.read(), officer: f.officer.read(), order: cur.order ?? Date.now() };
      try {
        const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, data);
        ctx.navigate(`#${COLL}/${newId}`);
      } catch { /* toast shown in saveDoc */ }
    };
    box.append(form);
  },
});
