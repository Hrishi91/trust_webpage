import { registerSection } from '../admin.js';
import { collection, doc, getDocs, query, orderBy, limit, writeBatch } from '../../../js/firebase.js';
import { t, STRINGS } from '../../../js/i18n.js';
import { el, fmtDate, toast } from '../../../js/ui.js';
import { logAudit } from '../audit.js';

// Fix round 1 (finding 4): translate the action word via `admin.log.action.<action>` (js/i18n.js)
// when that key exists, falling back to the raw action string otherwise — a future logAudit()
// call site with a new action string still renders (untranslated) instead of showing a literal
// "admin.log.action.foo" (t()'s own missing-key fallback returns the key itself, not the raw
// value, which is why this checks STRINGS directly rather than just calling t()).
function actionLabel(action) {
  const key = `admin.log.action.${action}`;
  return STRINGS[key] ? t(key) : action;
}

// Item 34: 📜 লগ — audit log viewer. `audit` is admin-read-only (firestore.rules), append-only
// (no update/delete rule), written by admin/js/audit.js's logAudit() from every mutating action
// across the panel (saveDoc/softDelete/listView's reorder+restore/export/design/strings/media).
// A single orderBy('at','desc') needs no composite index — Firestore's automatic single-field
// indexes already cover it; the collection filter below is applied client-side against the same
// 200-row page, not a second query, so it never needs one either.
//
// Item 42 (Phase 7 Task 7): a second ত্রুটি (errors) tab reads the `errors` collection (newest
// first, limit 100) written by js/errors.js — also admin-read-only, also append-only. Fetched
// lazily, only the first time the tab is opened, since most admin sessions never look at it.
function fmtAt(d, lang) {
  const at = d.at?.toDate ? d.at.toDate() : (d.at ? new Date(d.at) : null);
  if (!at || Number.isNaN(at.getTime())) return '';
  const time = at.toLocaleTimeString(lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${fmtDate(at, lang)} ${time}`;
}

function buildAuditPane(ctx, rows) {
  const collOf = r => (r.path || '').split('/')[0];
  const colls = [...new Set(rows.map(collOf).filter(Boolean))].sort();
  const select = el('select', {}, el('option', { value: '', text: t('admin.log.all') }),
    ...colls.map(c => el('option', { value: c, text: c })));
  const list = el('div');
  const row = d => el('div', { class: 'log-row' },
    el('div', { class: 'log-head' },
      el('span', { text: fmtAt(d, ctx.lang) }),
      el('b', { text: actionLabel(d.action) }),
      el('span', { text: d.path }),
      el('span', { class: 'muted', text: `${t('admin.log.uid')}: ${(d.uid || '').slice(0, 8)}` })),
    el('details', {},
      el('summary', { text: t('admin.log.details') }),
      el('pre', { text: JSON.stringify({ before: d.before ?? null, after: d.after ?? null }, null, 2) })));
  const renderRows = () => {
    const filtered = select.value ? rows.filter(r => collOf(r) === select.value) : rows;
    list.replaceChildren(...(filtered.length ? filtered.map(row) : [el('p', { text: t('common.empty') })]));
  };
  select.onchange = renderRows;
  renderRows();
  return el('div', {}, el('label', {}, el('span', { text: t('admin.log.filter') }), select), list);
}

// Final-review fix wave I6: `rows` is a live array (the errors tab's own state, not a fresh fetch
// each render) so "সব মুছুন" can remove the just-deleted rows from view without a re-fetch —
// `ua` (the reported browser user-agent, written by js/errors.js since Task 7 but never rendered
// anywhere until now) is shown labelled per row, same as message/url — those two i18n keys sat
// unused since Task 7 shipped (docs/pending.md's own deferred-minors note); this is what puts
// them to use.
function buildErrorsPane(ctx, rows) {
  const list = el('div');
  const clearBtn = el('button', { class: 'btn-sm', type: 'button', text: t('admin.log.clearErrors') });
  const row = d => el('div', { class: 'log-row' },
    el('div', { class: 'log-head' }, el('span', { text: fmtAt(d, ctx.lang) })),
    el('p', {}, el('b', { text: `${t('admin.log.message')}: ` }), el('span', { text: d.message })),
    el('p', { class: 'muted' }, el('b', { text: `${t('admin.log.url')}: ` }), el('span', { text: d.url })),
    el('p', { class: 'muted' }, el('b', { text: `${t('admin.log.ua')}: ` }), el('span', { text: d.ua })),
    d.stack ? el('details', {}, el('summary', { text: t('admin.log.details') }), el('pre', { text: d.stack })) : null);
  const renderRows = () => {
    list.replaceChildren(...(rows.length ? rows.map(row) : [el('p', { text: t('common.empty') })]));
    clearBtn.hidden = rows.length === 0;
  };
  // firestore.rules' errors match now allows `allow delete: if isAdmin()` (the one asymmetry from
  // `audit`, which stays append-only forever — see that rule's own comment). Deletes only the
  // currently loaded page (limit 100 below), matching "≤ 100 per click" — a second click after
  // reloading the tab clears the next page, same shape as any other admin bulk action here.
  clearBtn.onclick = async () => {
    if (!rows.length) return;
    if (!confirm(t('admin.confirmDelete'))) return;
    if (!(await ctx.reauth())) return;
    try {
      const batch = writeBatch(ctx.db);
      for (const d of rows) batch.delete(doc(ctx.db, 'errors', d.id));
      await batch.commit();
      await logAudit(ctx, 'delete', 'errors', { count: rows.length }, null);
      rows.length = 0;
      renderRows();
      toast(t('admin.saved'));
    } catch (err) {
      console.error(err);
      toast(t('common.error'), 'err');
    }
  };
  renderRows();
  return el('div', {}, el('div', { class: 'log-tabs' }, clearBtn), list);
}

registerSection('log', {
  title: 'admin.log', titleKey: 'admin.log', icon: '📜',
  async render(box, ctx) {
    const auditSnap = await getDocs(query(collection(ctx.db, 'audit'), orderBy('at', 'desc'), limit(200)));
    const auditPane = buildAuditPane(ctx, auditSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    let errorsPane = null;
    const loadErrorsPane = async () => {
      if (errorsPane) return errorsPane;
      const snap = await getDocs(query(collection(ctx.db, 'errors'), orderBy('at', 'desc'), limit(100)));
      errorsPane = buildErrorsPane(ctx, snap.docs.map(d => ({ id: d.id, ...d.data() })));
      return errorsPane;
    };

    const tabAudit = el('button', { class: 'btn-sm secondary active', type: 'button', text: t('admin.log.tabAudit') });
    const tabErrors = el('button', { class: 'btn-sm secondary', type: 'button', text: t('admin.log.tabErrors') });
    const pane = el('div', {}, auditPane);
    tabAudit.onclick = () => {
      tabAudit.classList.add('active'); tabErrors.classList.remove('active');
      pane.replaceChildren(auditPane);
    };
    tabErrors.onclick = async () => {
      tabErrors.classList.add('active'); tabAudit.classList.remove('active');
      pane.replaceChildren(await loadErrorsPane());
    };

    box.append(el('div', { class: 'log-tabs' }, tabAudit, tabErrors), pane);
  },
});
