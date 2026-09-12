import { registerSection } from '../admin.js';
import { doc, getDoc } from '../../../js/firebase.js';
import { t } from '../../../js/i18n.js';
import { el } from '../../../js/ui.js';
import { biField, saveDoc } from '../forms.js';
import { PAGE_DEFAULTS } from '../../../js/page-defaults.js';

const COLL = 'pages';
// Fixed ids only (spec §3) — no "new"/reorder/delete, unlike history/events/culture: these are
// system pages, not an admin-authored list. Each id's list-row label reuses the same STRINGS key
// its public page uses for <h1>, so the admin sees exactly the title a visitor would.
const PAGE_IDS = [
  ['privacy', 'page.privacy.title', 'privacy.html'],
  ['refund', 'refund.title', 'privacy.html#refund'],
  ['trust', 'page.trust.title', 'trust.html'],
  ['contact', 'contact.title', 'contact.html'],
  ['faq', 'faq.title', 'faq.html'],
  ['news', 'news.title', 'news.html'],
  ['downloads', 'downloads.title', 'downloads.html'],
  ['notfound', 'notfound.title', '404.html'],
];

registerSection(COLL, {
  title: 'admin.pages', titleKey: 'admin.pages', icon: '📄',
  async render(box, ctx) {
    const [, id] = location.hash.slice(1).split('/');
    if (id === undefined) {
      box.append(el('div', {}, ...PAGE_IDS.map(([pid, titleKey]) => el('div', { class: 'list-item' },
        el('a', { href: '#', class: 'grow', text: t(titleKey), onclick: e => { e.preventDefault(); ctx.navigate(`#${COLL}/${pid}`); } })))));
      return;
    }
    const entry = PAGE_IDS.find(([pid]) => pid === id);
    const previewHref = entry ? `../${entry[2]}?preview=1` : null;
    const def = PAGE_DEFAULTS[id] ?? { title: { bn: '', en: '' }, body: { bn: '', en: '' } };
    const cur = (await getDoc(doc(ctx.db, COLL, id))).data() ?? {};
    const f = {
      title: biField(t('admin.pages.title'), 'title', cur.title ?? def.title),
      body: biField(t('admin.pages.body'), 'body', cur.body ?? def.body, { multiline: true }),
    };
    const read = () => ({ title: f.title.read(), body: f.body.read() });
    const save = publish => async e => {
      e.preventDefault();
      try { await saveDoc(ctx, COLL, id, read(), { publish }); }
      catch { /* toast shown in saveDoc */ }
    };
    const form = el('form', { class: 'card' }, ...Object.values(f).map(x => x.node),
      el('div', { class: 'row' },
        el('button', { class: 'btn secondary', type: 'button', text: t('admin.saveDraft'), onclick: save(false) }),
        el('button', { class: 'btn', type: 'submit', text: t('admin.publish') }),
        previewHref ? el('a', { class: 'btn secondary', href: previewHref, target: '_blank', text: t('admin.preview') }) : null));
    form.onsubmit = save(true);
    box.append(form);
  },
});
