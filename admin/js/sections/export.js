import { registerSection } from '../admin.js';
import { collection, getDocs, doc, getDoc } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { logAudit } from '../audit.js';
// Item 33: COLLS/DOCS live in the pure export-colls.js (no Firebase imports) so
// tests/unit/export-colls.test.js can import them directly under plain node --test — see that
// file's own header comment for why. Re-exported here so anything importing from export.js's own
// public surface still finds them.
import { COLLS, DOCS } from './export-colls.js';
export { COLLS, DOCS };

registerSection('export', {
  title: 'admin.backup', titleKey: 'admin.backup', icon: '📤',
  async render(box, ctx) {
    box.append(el('div', { class: 'card' },
      el('p', { text: t('admin.export') }),
      el('button', { class: 'btn', type: 'button', text: t('admin.exportJson'), onclick: async e => {
        const btn = e.currentTarget; btn.disabled = true;
        try {
          const out = { exportedAt: new Date().toISOString() };
          for (const p of DOCS) {
            const [c, id] = p.split('/');
            out[p] = (await getDoc(doc(ctx.db, c, id))).data() ?? null;
          }
          for (const c of COLLS) {
            if (c === 'photos') continue; // no root collection — fetched per-album just below
            const snap = await getDocs(collection(ctx.db, c));
            out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          for (const a of out.albums) {
            a.photos = (await getDocs(collection(ctx.db, 'albums', a.id, 'photos'))).docs.map(d => ({ id: d.id, ...d.data() }));
          }
          const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: `trust-backup-${out.exportedAt.slice(0, 10)}.json` });
          document.body.append(a); a.click(); a.remove();
          URL.revokeObjectURL(a.href);
          await logAudit(ctx, 'export', '*');
          toast(t('admin.saved'));
        } catch (err) {
          console.error(err); toast(t('common.error'), 'err');
        } finally { btn.disabled = false; }
      } }),
      // Item 38: export has no public surface of its own (a backup file isn't a page) — this just
      // gives the card the same "view the live site" link settings/design/strings/media carry,
      // rather than leaving it the one dashboard card with nothing to click through to.
      el('a', { class: 'btn secondary', href: '../index.html', target: '_blank', text: t('admin.preview') })));
  },
});
