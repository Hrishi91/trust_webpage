// Renders admin-authored HTML (history/about body text) for visitors.
// window.DOMPurify must be loaded as a classic <script> (SRI-pinned) by any page
// that calls renderRich — see about.html. If it's missing, render nothing rather
// than fall back to raw HTML: admin-authored HTML reaching a visitor unsanitised
// is an XSS hole, not a degraded feature. i18n.js is a pure module (no DOM/Firebase
// imports of its own), so importing `t` here doesn't pull in anything heavier.
import { t } from './i18n.js';

const CFG = { ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'img', 'blockquote'],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'] };
export function renderRich(html) {
  if (!window.DOMPurify) {
    console.warn('[rich] DOMPurify not loaded — rich text hidden');
    const frag = document.createDocumentFragment();
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = t('common.richUnavailable');
    frag.append(p);
    return frag;
  }
  const clean = window.DOMPurify.sanitize(html ?? '', CFG);
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;             // sanitised — the one permitted innerHTML
  tpl.content.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  return tpl.content;
}
