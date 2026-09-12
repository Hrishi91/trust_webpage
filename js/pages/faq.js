import { mountShell, pageHeader, section } from '../shell.js';
import { getPage } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'faq.title');
if (s) {
  const page = await getPage('faq');
  const render = () => {
    main.replaceChildren(
      pageHeader({ crumb: t('faq.crumb'), title: t('faq.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(page.body)))),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
