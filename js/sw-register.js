// js/sw-register.js — registers sw.js on public pages only (site-basics audit item 29). Injected
// into every public page's generated shell block by scripts/sync-shell.mjs, never into admin/
// (admin/index.html is hand-authored and does not import this file — the pathname check below is
// defence in depth, not the only guard).
//
// Registers only over https, or on localhost/127.0.0.1 with an explicit `?sw=1` opt-in — most
// public e2e specs (tests/e2e/*.spec.js) assume no service worker controls the page, so leaving
// registration off by default on localhost keeps their behaviour unchanged; tests/e2e/pwa.spec.js
// opts in explicitly to exercise the offline path. Scope is the relative './' so the same file
// works unmodified both at the site root (local dev, GitHub Pages user/org root) and under the
// GitHub Pages project sub-path (https://hrishi91.github.io/trust_webpage/).
if ('serviceWorker' in navigator && !location.pathname.includes('/admin/')) {
  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const optedIn = new URLSearchParams(location.search).get('sw') === '1';
  const secureEnough = location.protocol === 'https:' || isLocalHost;

  if (secureEnough && (!isLocalHost || optedIn)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        // Registration failures (offline first load, unsupported browser quirks, etc.) must never
        // break the page itself — the site works perfectly well with no service worker at all.
      });
    });
  }

  // A new service worker taking control mid-visit must never surprise a visitor with an
  // unrequested reload; the next natural navigation picks up the new version on its own.
  navigator.serviceWorker.addEventListener('controllerchange', () => {});
}
