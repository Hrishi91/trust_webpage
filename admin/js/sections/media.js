import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, deleteField } from '../../../js/firebase.js';
import { t, pick, STRINGS } from '../../../js/i18n.js';
import { SLOTS, httpsUrl } from '../../../js/media-slots.js';
import { el, toast } from '../../../js/ui.js';
import { imageField } from '../upload.js';
import { logAudit } from '../audit.js';

// `def` is named (not passed inline to registerSection) so the save handler below can re-invoke
// def.render(box, ctx) after a successful write — same pattern as sections/strings.js.
const def = {
  title: STRINGS['admin.media'], icon: '🖼️',
  async render(box, ctx) {
    // Snapshot taken once per render; save() below diffs each slot's field.read() against this,
    // so an untouched or round-tripped slot is correctly left out of the write.
    const before = (await getDoc(doc(ctx.db, 'content', 'media'))).data() ?? {};
    const fields = new Map(); // slot.id -> field ({ node, read, set })

    const cards = SLOTS.map(slot => {
      const current = httpsUrl(before[slot.id]);
      const field = imageField(ctx, slot.label, current, { folder: slot.folder, max: slot.max });
      fields.set(slot.id, field);
      const removeBtn = el('button', { class: 'btn-sm secondary', type: 'button', text: t('admin.media.remove') });
      removeBtn.onclick = () => field.set('');
      const hintKey = slot.id === 'favicon' ? 'admin.media.faviconHint' : slot.id === 'ogImage' ? 'admin.media.ogHint' : null;
      return el('div', { class: 'card slot-card', 'data-slot': slot.id },
        el('b', { text: pick(slot.label) }),
        el('small', { text: pick(slot.where) }),
        !current ? el('small', { class: 'muted', text: t('admin.media.usingArt') }) : null,
        hintKey ? el('small', { class: 'muted', text: t(hintKey) }) : null,
        field.node, removeBtn);
    });

    const saveBtn = el('button', { class: 'btn', type: 'button', text: t('admin.media.save') });
    saveBtn.onclick = async () => {
      if (!(await ctx.reauth())) return;
      try {
        const next = {}, auditBefore = {}, auditAfter = {};
        for (const [id, field] of fields) {
          const url = field.read();
          const stored = before[id] ?? '';
          if (url === stored) continue; // unchanged — leave out of the write
          auditBefore[id] = stored || null;
          if (url) { next[id] = url; auditAfter[id] = url; }
          else { next[id] = deleteField(); auditAfter[id] = null; }
        }
        if (Object.keys(next).length) {
          await setDoc(doc(ctx.db, 'content', 'media'), next, { merge: true });
          await logAudit(ctx, 'update', 'content/media', auditBefore, auditAfter);
        }
        toast(t('admin.saved'));
        box.replaceChildren();
        await def.render(box, ctx);
      } catch (err) {
        console.error(err);
        toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
      }
    };

    box.append(...cards, el('div', { class: 'savebar' }, saveBtn));
  },
};
registerSection('media', def);
