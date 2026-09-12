import { registerSection } from '../admin.js';
import { collection, getDocs, query, orderBy, limit } from '../../../js/firebase.js';
import { t, STRINGS } from '../../../js/i18n.js';
import { el, fmtDate } from '../../../js/ui.js';

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

function buildErrorsPane(ctx, rows) {
  const row = d => el('div', { class: 'log-row' },
    el('div', { class: 'log-head' },
      el('span', { text: fmtAt(d, ctx.lang) }),
      el('b', { text: d.message }),
      el('span', { text: d.url })),
    d.stack ? el('details', {}, el('summary', { text: t('admin.log.details') }), el('pre', { text: d.stack })) : null);
  return el('div', {}, ...(rows.length ? rows.map(row) : [el('p', { text: t('common.empty') })]));
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
