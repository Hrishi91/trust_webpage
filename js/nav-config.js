// Pure data: no DOM, no Firebase imports. Shared between js/shell.js (runtime nav/footer
// hydration) and scripts/sync-shell.mjs (static app-shell markup) so the two lists can never
// drift apart — same reason js/page-defaults.js is shared with scripts/sync-head.mjs.
export const NAV = [
  ['home', 'index.html', 'nav.home', null],
  ['about', 'about.html', 'nav.about', 'about'],
  ['committee', 'committee.html', 'nav.committee', 'committee'],
  ['gallery', 'gallery.html', 'nav.gallery', 'gallery'],
  ['events', 'events.html', 'nav.events', 'events'],
  ['donate', 'donate.html', 'nav.donate', 'donate'],
  ['transparency', 'transparency.html', 'nav.transparency', 'transparency'],
  ['members', 'members.html', 'nav.members', 'members'],
];

// Phase 7 Task 1: footer-only pages (privacy/terms, about-the-trust, contact, FAQ, news archive,
// downloads) — never in the top nav bar (NAV above already fills the burger menu on mobile), just
// appended to the footer's "পাতা" column below. `refund` and `notfound` are deliberately absent:
// the refund policy is a #refund section on privacy.html, not its own link, and the 404 page is
// never something a visitor should navigate to on purpose.
export const FOOTER_PAGES = [
  ['privacy.html', 'page.privacy.title'],
  ['trust.html', 'page.trust.title'],
  ['contact.html', 'contact.title'],
  ['faq.html', 'faq.title'],
  ['news.html', 'news.title'],
  ['downloads.html', 'downloads.title'],
];
