import { registerSection } from '../admin.js';
import { collection, getDocs, query, orderBy, limit } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, fmtDate } from '../../../js/ui.js';

// Item 34: 📜 লগ — audit log viewer. `audit` is admin-read-only (firestore.rules), append-only
// (no update/delete rule), written by admin/js/audit.js's logAudit() from every mutating action
// across the panel (saveDoc/softDelete/listView's reorder+restore/export/design/strings/media).
// A single orderBy('at','desc') needs no composite index — Firestore's automatic single-field
// indexes already cover it; the collection filter below is applied client-side against the same
// 200-row page, not a second query, so it never needs one either.
registerSection('log', {
  title: 'admin.log', titleKey: 'admin.log', icon: '📜',
  async render(box, ctx) {
    const snap = await getDocs(query(collection(ctx.db, 'audit'), orderBy('at', 'desc'), limit(200)));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const collOf = r => (r.path || '').split('/')[0];
    const colls = [...new Set(rows.map(collOf).filter(Boolean))].sort();

    const select = el('select', {}, el('option', { value: '', text: t('admin.log.all') }),
      ...colls.map(c => el('option', { value: c, text: c })));
    const list = el('div');

    const fmtAt = d => {
      const at = d.at?.toDate ? d.at.toDate() : (d.at ? new Date(d.at) : null);
      if (!at || Number.isNaN(at.getTime())) return '';
      const time = at.toLocaleTimeString(ctx.lang === 'bn' ? 'bn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
      return `${fmtDate(at, ctx.lang)} ${time}`;
    };
    const row = d => el('div', { class: 'log-row' },
      el('div', { class: 'log-head' },
        el('span', { text: fmtAt(d) }),
        el('b', { text: d.action }),
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

    box.append(el('label', {}, el('span', { text: t('admin.log.filter') }), select), list);
  },
});
