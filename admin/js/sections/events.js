import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete, toLocalInput as toLocal } from '../forms.js';

const COLL = 'events';
registerSection(COLL, {
  title: 'nav.events', titleKey: 'nav.events', icon: '📅',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${fmtDate(d.start, ctx.lang)} — ${pick(d.title)}`, badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`), reorder: false,
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField(t('admin.events.title'), 'title', cur.title),
      start: textField(t('admin.events.start'), 'start', toLocal(cur.start), { type: 'datetime-local', required: true }),
      end: textField(t('admin.events.end'), 'end', toLocal(cur.end), { type: 'datetime-local' }),
      venue: biField(t('admin.events.venue'), 'venue', cur.venue),
      desc: biField(t('admin.events.desc'), 'desc', cur.desc, { multiline: true }),
    };
    const read = () => {
      const start = new Date(f.start.read()).toISOString();
      return { title: f.title.read(), venue: f.venue.read(), desc: f.desc.read(), start,
               end: f.end.read() ? new Date(f.end.read()).toISOString() : '', order: new Date(start).getTime() };
    };
    const save = publish => async e => {
      e.preventDefault();
      // "Save draft" is type=button and bypasses the input's `required` validation, so an empty
      // start would otherwise reach `new Date('').toISOString()` (Invalid Date) and throw.
      if (!f.start.read()) { toast(t('common.error'), 'err'); return; }
      try {
        const newId = await saveDoc(ctx, COLL, id === 'new' ? null : id, read(), { publish });
        ctx.navigate(`#${COLL}/${newId}`);
      } catch { /* toast shown in saveDoc */ }
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        id !== 'new' ? el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } } }) : null));
    form.onsubmit = save(true);
    box.append(form);
  },
});
