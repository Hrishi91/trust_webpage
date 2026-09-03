import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete } from '../forms.js';

const COLL = 'history';
registerSection(COLL, {
  title: { bn: 'ইতিহাস', en: 'History' }, icon: '📜',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL,
        itemLabel: d => `${d.year} — ${pick(d.title)}`,
        badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      year: textField({ bn: 'বছর', en: 'Year' }, 'year', cur.year ?? new Date().getFullYear(), { type: 'number', required: true }),
      title: biField({ bn: 'শিরোনাম', en: 'Title' }, 'title', cur.title),
      body: biField({ bn: 'বিবরণ (HTML: <p> <b> <ul> <li> <img>)', en: 'Body (HTML allowed)' }, 'body', cur.body, { multiline: true }),
      images: textField({ bn: 'ছবির URL (কমা দিয়ে)', en: 'Image URLs (comma separated)' }, 'images', (cur.images ?? []).join(', ')),
    };
    const read = () => ({ year: Number(f.year.read()), title: f.title.read(), body: f.body.read(),
                          images: f.images.read().split(',').map(x => x.trim()).filter(Boolean), order: cur.order ?? Number(f.year.read()) });
    const save = publish => async e => {
      e.preventDefault();
      // "Save draft" is type=button and bypasses the input's `required` validation, so an empty
      // or non-numeric year would otherwise reach Number('') === 0 / Number('abc') === NaN and
      // save a nonsense year silently.
      const year = f.year.read();
      if (!year || Number.isNaN(Number(year))) { toast(t('common.error'), 'err'); return; }
      try {
        const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
        ctx.navigate(`#${COLL}/${newId}`);
      } catch { /* toast shown in saveDoc */ }
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        id !== 'new' ? el('a', { class: 'btn secondary', href: `../about.html?preview=1`, target: '_blank', text: t('admin.preview') }) : null,
        id !== 'new' ? el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } } }) : null));
    form.onsubmit = save(true);
    box.append(form);
  },
});
