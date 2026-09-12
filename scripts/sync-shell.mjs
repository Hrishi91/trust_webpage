// scripts/sync-shell.mjs — builds the static `<!-- shell:start -->…<!-- shell:end -->` body block
// (real nav/header, hero-or-.ph main skeleton, real footer, <noscript> note) that scripts/
// sync-head.mjs injects into every public HTML file's <body>. Phase 7 Task 4, item 28 (site-basics
// audit): today's body is `<div id=site-header></div><main><p id=loading>…</p></main>
// <div id=site-footer></div>`, blank until js/shell.js's mountShell() resolves Firestore —
// Lighthouse mobile CLS 0.997 / LCP 7.1s trace directly to that. This script writes the real
// default markup instead, so first paint (JS or no JS at all) already shows the real chrome; js/
// shell.js hydrates it in place (patches text/links/columns, never blanks it — see its own
// comments) once real settings/content arrive.
//
// Kept a sibling of sync-head.mjs (not merged into one file) so "head things" and "body shell
// things" stay separable, but scripts/sync-head.mjs imports `applyShell` below and calls it as
// part of ITS OWN generatedFiles()/--check pipeline — there is only one command to run
// (`node scripts/sync-head.mjs` / `--check`), covering both blocks in the same pass, per the task
// brief ("include it in --check").
import { STRINGS } from '../js/i18n.js';
import { DEFAULT_SETTINGS } from '../js/default-settings.js';
import { NAV, FOOTER_PAGES } from '../js/nav-config.js';
import { HOME_SECTIONS } from '../js/sections.js';
import { GANESH, DIYA } from '../js/art.js';

const NAME_BN = DEFAULT_SETTINGS.name.bn;
// Hardcoded rather than `new Date().getFullYear()` for the same reason sync-head.mjs's
// lastmodFor() avoids the wall clock: `--check` must be stable across runs on different days (here,
// across a year boundary). js/shell.js's renderFooter() overwrites this with the real current year
// live, on every page load — this is only what a JS-off visitor, or one one instant before
// hydration, sees.
const COPYRIGHT_YEAR = 2026;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function S(key) {
  const entry = STRINGS[key];
  if (!entry) throw new Error(`sync-shell: STRINGS has no key "${key}"`);
  return entry.bn;
}

// One entry per scripts/sync-head.mjs HEAD_META id (see that file) except 'index', which gets the
// hero frame (heroHtml() below) instead of a `.ph` skeleton. `navKey` is the NAV key js/shell.js's
// mountShell(active, …) is called with on that page (null on every page that doesn't highlight a
// nav link). `crumbKey`/`h1Key` are either a js/i18n.js STRINGS key or the literal 'NAME' (the
// trust's own name, pick(s.name) at runtime) — copied from each js/pages/*.js module's own
// pageHeader({crumb, title}) call so the static default matches what hydration immediately turns
// it into. Every current page passes no non-empty default `lead` (about's/donate's default to an
// empty tagline/80G flag; transparency's is built from data that doesn't exist pre-hydration), so
// there is no leadKey here — the static `.ph` skeleton never has a <p> lead paragraph.
export const SHELL_META = {
  index: { navKey: 'home' },
  about: { navKey: 'about', crumbKey: 'NAME', h1Key: 'nav.about' },
  committee: { navKey: 'committee', crumbKey: 'nav.committee', h1Key: 'committee.title' },
  gallery: { navKey: 'gallery', crumbKey: 'nav.gallery', h1Key: 'gallery.albums' },
  events: { navKey: 'events', crumbKey: 'nav.events', h1Key: 'events.upcoming' },
  donate: { navKey: 'donate', crumbKey: 'nav.donate', h1Key: 'donate.title' },
  transparency: { navKey: 'transparency', crumbKey: 'nav.transparency', h1Key: 'tr.title' },
  members: { navKey: 'members', crumbKey: 'NAME', h1Key: 'mem.phone' },
  privacy: { navKey: null, crumbKey: 'page.privacy.crumb', h1Key: 'page.privacy.title' },
  trust: { navKey: null, crumbKey: 'page.trust.crumb', h1Key: 'page.trust.title' },
  contact: { navKey: null, crumbKey: 'contact.crumb', h1Key: 'contact.title' },
  faq: { navKey: null, crumbKey: 'faq.crumb', h1Key: 'faq.title' },
  news: { navKey: null, crumbKey: 'news.crumb', h1Key: 'news.title' },
  downloads: { navKey: null, crumbKey: 'downloads.crumb', h1Key: 'downloads.title' },
  notfound: { navKey: null, crumbKey: 'notfound.crumb', h1Key: 'notfound.title' },
};

// NAV shows every link statically (ignoring DEFAULT_SETTINGS.sectionVisibility, which hides
// donate/transparency/members by default) — a JS-off visitor gets the full site map, and
// js/shell.js's renderNav() removes whichever ones real settings actually hide the moment it runs.
// This is also why the pwa.spec.js JS-disabled test can assert "≥ 8 nav links".
function navHtml(activeKey) {
  const links = NAV.map(([key, href, tkey]) => `<a href="${href}"${key === activeKey ? ' class="on"' : ''}>${esc(S(tkey))}</a>`).join('');
  return `<a class="skip" href="#main">${esc(S('a11y.skip'))}</a>
<nav class="nav"><div class="wrap">
<a href="index.html" class="brand" aria-label="${esc(NAME_BN)}"><span class="mark om" aria-hidden="true">ॐ</span><span><span class="t">${esc(NAME_BN)}</span></span></a>
<div class="links">${links}</div>
<button class="lang" type="button">EN</button>
<button class="burger" type="button" aria-label="${esc(S('nav.menu'))}" aria-expanded="false"><span class="bars" aria-hidden="true"></span></button>
</div></nav>`;
}

// Footer's "পাতা" column shows every NAV.slice(1) link too (same "show everything statically"
// reasoning as navHtml above), plus the always-shown FOOTER_PAGES.
function footerHtml() {
  const navRest = NAV.slice(1).map(([, href, tkey]) => `<a href="${href}">${esc(S(tkey))}</a>`).join('');
  const footerPages = FOOTER_PAGES.map(([href, tkey]) => `<a href="${href}">${esc(S(tkey))}</a>`).join('');
  return `<footer><div class="wrap">
<div><b>${esc(NAME_BN)}</b></div>
<div><b>${esc(S('footer.contact'))}</b></div>
<div><b>${esc(S('footer.pages'))}</b>${navRest}${footerPages}</div>
<div><b>${esc(S('footer.trust'))}</b><a href="transparency.html">${esc(S('tr.docs'))}</a><a href="committee.html">${esc(S('nav.committee'))}</a><span class="muted">© ${COPYRIGHT_YEAR} ${esc(NAME_BN)}</span></div>
</div></footer>`;
}

// index.html's hero frame: the real Ganesh SVG + 5 diyas (js/art.js's own literal markup — never
// re-authored here), canvases empty until JS paints them. No eyebrow/countdown/donate-CTA by
// default (DEFAULT_SETTINGS has no pujaDate and hides the donate section) — js/pages/home.js's
// hero() adds them in place the moment real settings say otherwise.
function heroHtml() {
  const diyas = Array(5).fill(DIYA).join('');
  return `<header class="hero">
<canvas class="bg" id="heroBg" aria-hidden="true"></canvas>
<div class="wrap">
<div class="copy">
<h1>${esc(NAME_BN)}</h1>
<div class="ctas"><a class="btn ghost" href="events.html">${esc(S('nav.events'))}</a></div>
</div>
<div class="art">
${GANESH}
<div class="diyas">${diyas}</div>
</div>
</div>
<canvas class="garland" id="garland" aria-hidden="true"></canvas>
</header>`;
}

// Fixed min-height placeholders for every other home section (js/sections.js HOME_SECTIONS,
// default order) — reserves the box so the swap to real content doesn't shift the page, without
// trying to fake each section's real height. js/pages/home.js's first render() replaces every one
// of these in a single main.replaceChildren() call the moment real data arrives.
const HOME_SECTION_SKELETONS = HOME_SECTIONS.slice(1).map(key => `<div class="sec-skel" data-section="${key}"></div>`).join('\n');

function phHtml(crumbKey, h1Key) {
  const crumb = crumbKey === 'NAME' ? NAME_BN : S(crumbKey);
  return `<div class="ph">
<canvas class="ph-bg" aria-hidden="true"></canvas>
<div class="wrap"><span class="crumb">${esc(crumb)}</span><h1>${esc(S(h1Key))}</h1></div>
</div>`;
}

// Visually-hidden but screen-reader-announced note (css/site.css .sr-only), replacing the old
// literal "…" `<p id="loading">` — swept away the instant a page module's first real render()
// calls main.replaceChildren() (see js/shell.js's pageHeader()/js/pages/home.js's hero() comments
// on why the .ph/.hero nodes themselves survive that same call).
const LOADING_NOTE = `<p class="sr-only" aria-live="polite">${esc(S('common.loading'))}</p>`;
const NOSCRIPT = `<noscript><p>${esc(S('common.noscript'))}</p></noscript>`;
// Phase 7 Task 5 (item 29): registers the app-shell service worker on every public page (never
// admin/) — see js/sw-register.js's own comments for the localhost/https/opt-in rules. Placed
// inside the generated shell block (not each page's own trailing <script> tags) so it stays in
// sync across all 15 pages automatically via `node scripts/sync-head.mjs[/--check]`, same as the
// nav/footer markup above.
const SW_REGISTER_SCRIPT = '<script type="module" src="js/sw-register.js"></script>';

export function buildShellBlock(id) {
  const meta = SHELL_META[id];
  if (!meta) throw new Error(`sync-shell: no SHELL_META for "${id}"`);
  const isHome = id === 'index';
  const header = `<div id="site-header" data-shell="1" role="banner">\n${navHtml(meta.navKey)}\n</div>`;
  const mainOpen = isHome ? '<main id="main" tabindex="-1">' : '<main id="main" tabindex="-1" style="min-height:70vh">';
  const mainContent = isHome ? `${heroHtml()}\n${HOME_SECTION_SKELETONS}\n${LOADING_NOTE}` : `${phHtml(meta.crumbKey, meta.h1Key)}\n${LOADING_NOTE}`;
  const footer = `<div id="site-footer" data-shell="1">\n${footerHtml()}\n</div>`;
  return [header, `${mainOpen}\n${mainContent}\n</main>`, footer, NOSCRIPT, SW_REGISTER_SCRIPT].join('\n');
}

const SHELL_START = '<!-- shell:start -->';
const SHELL_END = '<!-- shell:end -->';
const SHELL_MARKER_RE = /<!-- shell:start -->[\s\S]*?<!-- shell:end -->/;
// Matches the pre-Task-4 body this script replaces the first time it runs on a file. members.html
// alone has a `<div id="recaptcha"></div>` between <main> and the footer (js/pages/members.js's
// invisible RecaptchaVerifier target) — captured and re-emitted right after the shell block
// (outside the markers, like the page's own <script> tags) so it survives the rewrite untouched.
const LEGACY_BODY_RE = /<div id="site-header"><\/div>\n<main id="main"><p class="muted" id="loading">…<\/p><\/main>\n((?:<div id="recaptcha"><\/div>\n)?)<div id="site-footer"><\/div>/;

function injectShell(html, id) {
  const wrapped = `${SHELL_START}\n${buildShellBlock(id)}\n${SHELL_END}`;
  if (SHELL_MARKER_RE.test(html)) return html.replace(SHELL_MARKER_RE, wrapped);
  const m = html.match(LEGACY_BODY_RE);
  if (!m) throw new Error(`sync-shell: could not find the legacy body block for "${id}"`);
  return html.replace(LEGACY_BODY_RE, `${wrapped}\n${m[1]}`);
}

// DOMPurify must load as a deferred classic <script> (item 32) — it still executes, in document
// order, strictly before the `type=module` page-script tag that follows it (both are on the
// browser's single "in order" deferred-script queue), so js/rich.js's window.DOMPurify check never
// races; it just no longer blocks HTML parsing while it downloads. Idempotent: once `defer` is
// present the "<script src=" (no defer) shape no longer matches.
function ensureDompurifyDefer(html) {
  return html.replace(/<script src="(https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/dompurify\/[^"]+)"/, '<script defer src="$1"');
}

/** Applied to one HTML file's current content: injects/refreshes the shell block and defers DOMPurify. */
export function applyShell(id, html) {
  return ensureDompurifyDefer(injectShell(html, id));
}
