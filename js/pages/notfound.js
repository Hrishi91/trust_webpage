import { mountShell, pageHeader, section } from '../shell.js';
import { getPage } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
// active=null: no top-nav item highlights on a page nobody meant to land on.
const s = await mountShell(null, 'notfound.title');
if (s) {
  const page = await getPage('notfound');
  const render = () => {
    main.replaceChildren(
      pageHeader({ crumb: t('notfound.crumb'), title: pick(page.title) }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body))),
        el('p', {}, el('a', { class: 'btn', href: 'index.html', text: t('notfound.home') }))),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
