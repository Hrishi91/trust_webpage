import { mountShell, pageHeader, section } from '../shell.js';
import { getPage, listTransparencyYears } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { renderRich } from '../rich.js';
import { httpsUrl } from '../media-slots.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'downloads.title');
if (s) {
  const page = await getPage('downloads');
  let years = [], errored = false;
  try { years = await listTransparencyYears(); } catch (err) { console.error(err); errored = true; }
  const render = () => {
    const lang = getLang(), yr = y => lang === 'bn' ? bnDigits(String(y)) : String(y);
    // Every published year's `documents` array, flattened — listTransparencyYears() already
    // filters published+!deleted, so this is every document a visitor is allowed to see.
    const rows = years.flatMap(y => (y.documents ?? []).map(d => ({ ...d, year: y.year })));
    const list = rows.length ? el('div', {}, ...rows.map(d => {
      const href = httpsUrl(d.url);
      return el('div', { class: 'donor' },
        el('span', {}, `${pick(d.title, lang)} `, el('small', { class: 'muted', text: yr(d.year) })),
        href ? el('a', { class: 'btn ghost', href, target: '_blank', rel: 'noopener', text: t('tr.download') }) : null);
    })) : el('p', { class: 'muted', text: t('common.empty') });
    main.replaceChildren(
      pageHeader({ crumb: t('downloads.crumb'), title: t('downloads.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body))), errored ? el('p', { class: 'muted', text: t('common.error') }) : list),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
