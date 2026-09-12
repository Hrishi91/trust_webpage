import { mountShell, pageHeader, section } from '../shell.js';
import { getPage, listAnnouncementsAll } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'news.title');
if (s) {
  const page = await getPage('news');
  let items = [], errored = false;
  try { items = await listAnnouncementsAll(); } catch (err) { console.error(err); errored = true; }
  const render = () => {
    const lang = getLang();
    const list = items.length ? el('div', { class: 'acc' }, ...items.map(a => {
      const created = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
      return el('div', { class: 'card' },
        el('p', {}, a.pinned ? '📌 ' : '', pick(a.text)),
        created ? el('small', { class: 'muted', text: fmtDate(created, lang) }) : null);
    })) : el('p', { class: 'muted', text: t('common.empty') });
    main.replaceChildren(
      pageHeader({ crumb: t('news.crumb'), title: t('news.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body))), errored ? el('p', { class: 'muted', text: t('common.error') }) : list),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
