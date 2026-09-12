import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, listView, saveDoc, softDelete } from '../forms.js';
import { imageField } from '../upload.js';

const COLL = 'culture';
registerSection(COLL, {
  title: 'admin.culture', titleKey: 'admin.culture', icon: '🏺',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => pick(d.title), badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField(t('admin.culture.title'), 'title', cur.title),
      tag: biField(t('admin.culture.tag'), 'tag', cur.tag),
      text: biField(t('admin.culture.text'), 'text', cur.text, { multiline: true }),
      image: imageField(ctx, t('admin.culture.image'), cur.imageUrl, { folder: 'public/culture', max: 1200 }),
    };
    const read = () => ({ title: f.title.read(), tag: f.tag.read(), text: f.text.read(), imageUrl: f.image.read(), order: cur.order ?? Date.now() });
    const save = publish => async e => {
      e.preventDefault();
      try {
        const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
        ctx.navigate(`#${COLL}/${newId}`);
      } catch { /* toast shown in saveDoc */ }
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        // Item 38: culture cards render on the home page, not their own page — js/pages/home.js
        // now reads deleted==false unfiltered (bypassing published) when ?preview=1 under admin auth.
        id !== 'new' ? el('a', { class: 'btn secondary', href: `../index.html?preview=1`, target: '_blank', text: t('admin.preview') }) : null,
        id !== 'new' ? el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } } }) : null));
    form.onsubmit = save(true);
    box.append(form);
  },
});
