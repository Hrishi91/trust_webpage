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
    const currentValues = new Map(); // slot.id -> normalized current value (httpsUrl result).
                                      // Stored here so save() diffs field.read() against the same
                                      // normalized value the widget was initialized with, not the raw
                                      // before[id]. This prevents non-https URLs (e.g. Storage emulator's
                                      // http://127.0.0.1:9199/...) from looking "changed" on every save.
    const rawValues = new Map(); // slot.id -> raw stored value (for detecting explicit removals)
    const wasExplicitlyRemoved = new Map(); // slot.id -> true if remove button was clicked

    const cards = SLOTS.map(slot => {
      const raw = before[slot.id]; // raw stored value (could be http://, non-string, absent)
      const current = httpsUrl(raw); // normalized for display and diffing: https:// only
      currentValues.set(slot.id, current);
      rawValues.set(slot.id, raw);
      wasExplicitlyRemoved.set(slot.id, false);
      const field = imageField(ctx, slot.label, current, { folder: slot.folder, max: slot.max });
      fields.set(slot.id, field);
      // Track whether the remove button was clicked (explicitly setting the field to '').
      // Needed because when raw is non-https, it normalizes to '', so we can't distinguish
      // between "never touched" and "explicitly removed" just from comparing values.
      const removeBtn = el('button', { class: 'btn-sm secondary', type: 'button', text: t('admin.media.remove') });
      removeBtn.onclick = () => { field.set(''); wasExplicitlyRemoved.set(slot.id, true); };
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
      try {
        const next = {}, auditBefore = {}, auditAfter = {};
        for (const [id, field] of fields) {
          const url = field.read();
          const current = currentValues.get(id); // normalized value the widget was initialized with
          const raw = rawValues.get(id); // raw stored value (for detecting explicit removals)
          const removed = wasExplicitlyRemoved.get(id); // whether remove button was clicked
          // Diff: field.read() against current (normalized value). Note: if the remove button was
          // explicitly clicked, even if url === current, we treat it as a removal.
          if (url === current && !removed) continue; // unchanged — leave out of the write
          auditBefore[id] = raw ?? null; // audit logs the raw stored value
          if (url) { next[id] = url; auditAfter[id] = url; }
          else { next[id] = deleteField(); auditAfter[id] = null; }
        }
        if (!Object.keys(next).length) {
          // No changes detected; skip re-auth and write entirely
          toast(t('admin.media.nothingChanged'));
          return;
        }
        if (!(await ctx.reauth())) return;
        await setDoc(doc(ctx.db, 'content', 'media'), next, { merge: true });
        await logAudit(ctx, 'update', 'content/media', auditBefore, auditAfter);
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
