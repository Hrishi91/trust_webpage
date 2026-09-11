import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick, STRINGS } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, boolField, listView, saveDoc, softDelete } from '../forms.js';
import { imageField } from '../upload.js';

const COLL = 'committee';
registerSection(COLL, {
  title: STRINGS['nav.committee'], icon: '👥',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${pick(d.name)} — ${pick(d.post)}`,
        badge: d => d.isPublic ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      name: biField(STRINGS['admin.committee.name'], 'name', cur.name),
      post: biField(STRINGS['admin.committee.post'], 'post', cur.post),
      photo: imageField(ctx, STRINGS['admin.committee.photo'], cur.photoUrl, { folder: 'public/committee', max: 600 }),
      isPublic: boolField(STRINGS['admin.committee.isPublic'], 'isPublic', cur.isPublic ?? true),
      officer: boolField(STRINGS['admin.committee.officer'], 'officer', cur.officer ?? false),
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }),
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
