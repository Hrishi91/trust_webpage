// Pure data: no DOM, no Firebase imports. Extracted out of js/content.js (which does import
// firebase.js) so scripts/sync-shell.mjs can import the exact same defaults under Node without
// pulling in the whole Firebase SDK chain (Phase 7 Task 4, item 28 — the static app-shell's
// default nav/footer/hero copy must never drift from what js/content.js's getSettings() falls
// back to at runtime, same "shared source" reasoning as js/page-defaults.js / js/nav-config.js).
export const DEFAULT_SETTINGS = {
  name: { bn: 'গণেশ পুজো ট্রাস্ট', en: 'Ganesh Puja Trust' }, tagline: { bn: '', en: '' },
  address: { bn: '', en: '' }, theme: { bn: '', en: '' }, logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '', email: '' }, regNo: '', has80G: false, upiId: '', upiQrUrl: '',
  pujaDate: '', maintenance: false, defaultLang: 'bn', design: 'siddhi', donatePurposes: '',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: false, transparency: false, members: false, culture: true },
  // Phase 6 ("nothing static"): colour/font overrides on top of the chosen theme, home section
  // order/visibility, social links + a few settings-card extras. Untouched defaults reproduce
  // today's site exactly — see docs/superpowers/specs/2026-09-11-phase-6-template-complete.md.
  designOverrides: {}, fonts: { display: '', body: '' }, homeSections: [],
  social: { facebook: '', youtube: '', instagram: '', whatsappGroup: '' },
  estYear: '', credItems: '', metaDescription: { bn: '', en: '' },
  // Phase 7 Task 1: named trustees for trust.html, {name:{bn,en}, role:{bn,en}}[]; empty means
  // "fall back to committee officers" (js/pages/trust.js).
  trustees: [],
};
