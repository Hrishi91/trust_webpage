import { registerSection } from '../admin.js';
import { doc, setDoc, deleteField } from '../../../js/firebase.js';
import { t, STRINGS, STRING_GROUPS, getOverrides, setOverrides, defaultString } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { logAudit } from '../audit.js';

// `def` is named (not passed inline to registerSection) so the save handler below can re-invoke
// def.render(box, ctx) after a successful write — same pattern as sections/design.js.
const def = {
  title: STRINGS['admin.strings'], icon: '✏️',
  async render(box, ctx) {
    // Snapshot taken once per render; save() below diffs every row against this, not a live read,
    // so a row that round-trips back to its original value during editing is correctly seen as
    // "unchanged" and left out of the write.
    const before = getOverrides();
    const rowsByKey = new Map(); // key -> { bn: <input>, en: <input> }
    // One entry per non-empty STRING_GROUPS group, in STRING_GROUPS's own (nav-first) order —
    // the search box below needs each group's <details> + its rows to filter and re-open them.
    const groupState = [];
    let openedFirst = false;
    const detailsEls = Object.entries(STRING_GROUPS)
      .filter(([, keys]) => keys.length)
      .map(([group, keys]) => {
        const entries = keys.map(key => {
          const ov = before[key] ?? {};
          const bn = el('input', { name: `${key}.bn`, value: ov.bn ?? '', placeholder: defaultString(key, 'bn') });
          const en = el('input', { name: `${key}.en`, value: ov.en ?? '', placeholder: defaultString(key, 'en') });
          const reset = el('button', { class: 'btn-sm', type: 'button', text: t('admin.strings.reset') });
          reset.onclick = () => { bn.value = ''; en.value = ''; };
          rowsByKey.set(key, { bn, en });
          const row = el('div', { class: 'str-row' },
            el('code', { text: key }),
            el('div', { class: 'bi' }, bn, en),
            reset);
          return { key, row };
        });
        const labelKey = `admin.strings.group.${group}`;
        const label = Object.prototype.hasOwnProperty.call(STRINGS, labelKey) ? t(labelKey) : group;
        const open = !openedFirst; openedFirst = true; // first non-empty group starts open
        const details = el('details', { class: 'str-group', open }, el('summary', { text: label }), ...entries.map(e => e.row));
        groupState.push({ details, entries, defaultOpen: open });
        return details;
      });

    // Filters by key or default text in either language (spec §5) — matched rows' groups are
    // force-opened so a hit outside the always-open first group is actually visible (a closed
    // <details> hides its children regardless of their own `display`); clearing the box restores
    // each group's original open/closed state.
    const search = el('input', { type: 'search', placeholder: t('admin.strings.search') });
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      for (const { details, entries, defaultOpen } of groupState) {
        let anyVisible = false;
        for (const { key, row } of entries) {
          const hay = `${key} ${defaultString(key, 'bn')} ${defaultString(key, 'en')}`.toLowerCase();
          const match = !q || hay.includes(q);
          // Not `row.hidden`: .str-row carries its own `display:grid` (an author rule), which
          // beats the UA stylesheet's [hidden]{display:none} regardless of selector order — the
          // cascade's origin tier, not specificity, decides that fight. Inline style always wins.
          row.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        }
        details.open = q ? anyVisible : defaultOpen;
      }
    };

    const saveBtn = el('button', { class: 'btn', type: 'button', text: t('admin.strings.save') });
    saveBtn.onclick = async () => {
      if (!(await ctx.reauth())) return;
      try {
        const next = {}, auditBefore = {}, auditAfter = {};
        for (const [key, { bn, en }] of rowsByKey) {
          const curBn = bn.value.trim(), curEn = en.value.trim();
          const stored = before[key] ?? {};
          const wasBn = stored.bn ?? '', wasEn = stored.en ?? '';
          if (curBn === wasBn && curEn === wasEn) continue; // unchanged — leave out of the write
          auditBefore[key] = before[key] ?? null;
          if (!curBn && !curEn) { next[key] = deleteField(); auditAfter[key] = null; }
          else { next[key] = { bn: curBn, en: curEn }; auditAfter[key] = next[key]; }
        }
        if (Object.keys(next).length) {
          await setDoc(doc(ctx.db, 'content', 'strings'), next, { merge: true });
          await logAudit(ctx, 'update', 'content/strings', auditBefore, auditAfter);
          // Keep the in-memory overrides in step with what was just written so a re-render of
          // this section (below) shows the new values as the prefilled/placeholder state — the
          // public site and the rest of the admin panel pick this up on their next load/route
          // (admin.js can't be imported from here — circular — see admin.stringsHint).
          const merged = { ...getOverrides() };
          for (const key of Object.keys(next)) {
            if (auditAfter[key] === null) delete merged[key];
            else merged[key] = auditAfter[key];
          }
          setOverrides(merged);
        }
        toast(t('admin.saved'));
        box.replaceChildren();
        await def.render(box, ctx);
      } catch (err) {
        console.error(err);
        toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
      }
    };

    box.append(
      el('p', { class: 'muted', text: t('admin.stringsHint') }),
      search,
      ...detailsEls,
      el('div', { class: 'savebar' }, saveBtn),
    );
  },
};
registerSection('strings', def);
