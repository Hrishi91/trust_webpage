import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { getPage, listCommittee } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'page.trust.title');
if (s) {
  const page = await getPage('trust');
  // settings.trustees (admin-set, named trustees) wins; else fall back to committee officers —
  // reuses listCommittee()'s existing published+!deleted+order query (no new Firestore index) and
  // filters `officer` client-side.
  let trustees = (s.trustees ?? []).length ? s.trustees : null;
  if (!trustees) {
    try { trustees = (await listCommittee()).filter(m => m.officer); }
    catch (err) { console.error(err); trustees = []; }
  }
  const render = () => {
    main.replaceChildren(
      pageHeader({ crumb: t('page.trust.crumb'), title: t('page.trust.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body)))),
      trustees.length ? section(sectionHead(t('page.trust.trustees')),
        el('div', { class: 'wall' }, ...trustees.map(tr => el('div', {},
          el('span', { text: pick(tr.name) }), el('span', { class: 'muted', text: pick(tr.role ?? tr.post) }))))) : null,
    );
  };
  render();
  document.addEventListener('langchange', render);
}
