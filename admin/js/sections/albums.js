import { registerSection } from '../admin.js';
import { doc, getDoc, getDocs, collection, query, where, orderBy, setDoc, updateDoc, writeBatch, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, listView, saveDoc, softDelete } from '../forms.js';
import { imageField, multiImageField } from '../upload.js';
import { logAudit } from '../audit.js';

const COLL = 'albums';
registerSection(COLL, {
  title: { bn: 'গ্যালারি', en: 'Gallery' }, icon: '🖼️',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(await listView(ctx, {
        coll: COLL, itemLabel: d => `${d.year} — ${pick(d.title)}`, badge: d => d.published ? 'pub' : 'draft',
        onEdit: i => ctx.navigate(`#${COLL}/${i}`), onNew: () => ctx.navigate(`#${COLL}/new`),
      }));
      return;
    }
    const cur = id === 'new' ? {} : (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField({ bn: 'অ্যালবামের নাম', en: 'Album title' }, 'title', cur.title),
      year: textField({ bn: 'বছর', en: 'Year' }, 'year', cur.year ?? new Date().getFullYear(), { type: 'number', required: true }),
      cover: imageField(ctx, { bn: 'কভার ছবি', en: 'Cover photo' }, cur.coverUrl, { folder: `public/albums/${id}`, max: 1200 }),
    };
    // f.cover.read() only changes when the admin picks a file through the cover widget itself —
    // it never reflects the photos list's own auto-set cover (below). Omitting coverUrl here when
    // the widget wasn't touched lets saveDoc's setDoc({merge:true}) leave that auto-set value alone
    // instead of stomping it back to '' on the next Save/Publish click in the same session.
    const read = () => {
      const data = { title: f.title.read(), year: Number(f.year.read()), order: cur.order ?? Number(f.year.read()) * 1000 };
      const coverVal = f.cover.read();
      if (coverVal) data.coverUrl = coverVal;
      return data;
    };
    const save = publish => async e => {
      e.preventDefault();
      // "Save draft" is type=button and bypasses the input's `required` validation, so an empty
      // or non-numeric year would otherwise reach Number('') === 0 / Number('abc') === NaN and
      // save a nonsense year (and order, which is derived from it) silently.
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
        id !== 'new' && el('a', { class: 'btn secondary', href: `../gallery.html?album=${id}&preview=1`, target: '_blank', text: t('admin.preview') }),
        id !== 'new' && el('button', { class: 'btn danger', type: 'button', text: t('admin.delete'),
          onclick: async () => { try { if (await softDelete(ctx, COLL, id)) ctx.navigate(`#${COLL}`); } catch { /* toast shown in softDelete */ } } })));
    form.onsubmit = save(true);
    box.append(form);
    if (id === 'new') return;

    // ---- photos ----
    const photosColl = collection(ctx.db, COLL, id, 'photos');
    // f.cover.read() only reflects a cover chosen through the imageField's own input, not this
    // auto-set — track it separately so the very first photo (and only the first) becomes the
    // cover when none was picked manually, instead of every upload overwriting it in turn.
    let coverAutoSet = !!f.cover.read();
    const heading = el('h3', {});
    const listBox = el('div');
    const renderPhotos = async () => {
      const snap = await getDocs(query(photosColl, where('deleted', '==', false), orderBy('order')));
      const photos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      heading.textContent = `${pick({ bn: 'ছবি', en: 'Photos' })} (${photos.length})`;
      listBox.replaceChildren(...photos.map((p, i) => {
        const cap = el('input', { value: pick(p.caption), placeholder: 'caption' });
        cap.onchange = async () => {
          const val = cap.value.trim();
          await updateDoc(doc(photosColl, p.id), { caption: { bn: val, en: val } });
          toast(t('admin.saved'));
        };
        const swap = async j => {
          if (j < 0 || j >= photos.length) return;
          const other = photos[j];
          const batch = writeBatch(ctx.db);
          batch.update(doc(photosColl, p.id), { order: other.order });
          batch.update(doc(photosColl, other.id), { order: p.order });
          await batch.commit();
          await logAudit(ctx, 'reorder', `${COLL}/${id}/photos/${p.id}`, { order: p.order }, { order: other.order });
          await renderPhotos();
        };
        return el('div', { class: 'list-item' }, el('img', { class: 'thumb', src: p.url, alt: '' }), cap,
          el('button', { class: 'btn-sm', type: 'button', text: '↑', onclick: () => swap(i - 1) }),
          el('button', { class: 'btn-sm', type: 'button', text: '↓', onclick: () => swap(i + 1) }),
          el('button', { class: 'btn-sm', type: 'button', text: '🗑', onclick: async () => {
            if (!confirm(t('admin.confirmDelete'))) return;
            if (!(await ctx.reauth())) return;
            await updateDoc(doc(photosColl, p.id), { deleted: true, updatedAt: serverTimestamp() });
            await logAudit(ctx, 'delete', `${COLL}/${id}/photos/${p.id}`, { url: p.url }, { deleted: true });
            await renderPhotos();
          } }));
      }));
    };
    // Built once, outside renderPhotos — renderPhotos only ever touches `heading`/`listBox` now,
    // so the multiImageField widget (its progress bar, status text, and in-flight <input> element)
    // stays attached across the whole multi-select upload instead of being torn down and rebuilt
    // after every single photo, which used to leave an idle-looking picker mid-upload.
    const uploader = multiImageField(ctx, { bn: 'ছবি যোগ করুন (একাধিক)', en: 'Add photos (multiple)' }, {
      folder: `public/albums/${id}`,
      onEach: async url => {
        const pref = doc(photosColl);
        await setDoc(pref, { url, caption: { bn: '', en: '' }, order: Date.now(), deleted: false, createdAt: serverTimestamp() });
        await logAudit(ctx, 'create', `${COLL}/${id}/photos/${pref.id}`, null, { url });
        if (!coverAutoSet) { await updateDoc(doc(ctx.db, COLL, id), { coverUrl: url }); coverAutoSet = true; f.cover.set(url); }
        await renderPhotos();
      },
    });
    const photosBox = el('div', { class: 'card' }, heading, uploader, listBox);
    await renderPhotos();
    box.append(photosBox);
  },
});
