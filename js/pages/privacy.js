import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { getPage } from '../content.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';
import { renderRich } from '../rich.js';

const main = document.getElementById('main');
const s = await mountShell(null, 'page.privacy.title');
if (s) {
  // The donate page links to privacy.html#refund (item 3) — the refund policy is its own
  // pages/refund doc (own admin card, own default), rendered here as a named section rather than
  // folded into the privacy body, so it stays independently editable.
  const [privacy, refund] = await Promise.all([getPage('privacy'), getPage('refund')]);
  const render = () => {
    main.replaceChildren(
      pageHeader({ crumb: t('page.privacy.crumb'), title: t('page.privacy.title') }),
      section(el('div', { class: 'rich' }, renderRich(pick(privacy.body)))),
      section(el('div', { id: 'refund' }, sectionHead(t('refund.title')), el('div', { class: 'rich' }, renderRich(pick(refund.body))))),
    );
  };
  render();
  document.addEventListener('langchange', render);
}
