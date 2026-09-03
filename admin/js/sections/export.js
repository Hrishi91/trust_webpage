import { registerSection } from '../admin.js';
import { collection, getDocs, doc, getDoc } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { logAudit } from '../audit.js';

const COLLS = ['history', 'committee', 'albums', 'events', 'audit'];

registerSection('export', {
  title: { bn: 'ব্যাকআপ', en: 'Backup' }, icon: '📤',
  async render(box, ctx) {
    box.append(el('div', { class: 'card' },
      el('p', { text: t('admin.export') }),
      el('button', { class: 'btn', type: 'button', text: 'JSON ⬇', onclick: async e => {
        const btn = e.currentTarget; btn.disabled = true;
        try {
          const out = { exportedAt: new Date().toISOString(), settings: (await getDoc(doc(ctx.db, 'settings', 'site'))).data() ?? null };
          for (const c of COLLS) {
            const snap = await getDocs(collection(ctx.db, c));
            out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (c === 'albums') for (const a of out.albums) {
              a.photos = (await getDocs(collection(ctx.db, 'albums', a.id, 'photos'))).docs.map(d => ({ id: d.id, ...d.data() }));
            }
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
      } })));
  },
});
