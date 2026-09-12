// js/share.js — the WhatsApp/Facebook/copy-link share row (Phase 7 Task 2, item 15). DOM-only
// (uses js/ui.js's el()/toast), not unit-tested under node --test; exercised by tests/e2e/seo.spec.js.
import { t } from './i18n.js';
import { el, toast } from './ui.js';

/**
 * {url, title} -> a `.share` element with (when supported) a native-share button first, then
 * WhatsApp/Facebook share links and a copy-link button. All four are ≥44px targets (css/site.css
 * `.share .btn`). `url` should already be an absolute https:// URL (callers pass
 * `location.href` or a canonical page URL) — this module does no validation of its own since it
 * never accepts admin-supplied input, only same-origin page context.
 */
export function shareRow({ url, title }) {
  const nodes = [];
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    nodes.push(el('button', {
      class: 'btn ghost', type: 'button', text: t('share.share'),
      onclick: async () => {
        try { await navigator.share({ title, url }); }
        catch (err) { if (err?.name !== 'AbortError') console.error(err); }
      },
    }));
  }
  nodes.push(el('a', {
    class: 'btn ghost', target: '_blank', rel: 'noopener', text: t('share.whatsapp'),
    href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  }));
  nodes.push(el('a', {
    class: 'btn ghost', target: '_blank', rel: 'noopener', text: t('share.facebook'),
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  }));
  nodes.push(el('button', {
    class: 'btn ghost', type: 'button', text: t('share.copy'),
    onclick: async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
        toast(t('share.copied'));
      } catch (err) { console.error(err); }
    },
  }));
  return el('div', { class: 'share' }, ...nodes);
}
