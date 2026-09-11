// js/contrast.js — pure WCAG 2.x relative-luminance contrast helpers (no DOM, no Firebase).
// Moved out of tests/unit/contrast.test.js (Phase 6 Task 6) so the admin's 🎨 colour rows can
// show the same live ratio the token-file tests already gate on, instead of re-implementing it.
export function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two '#rrggbb' colours, order-independent (always >= 1). */
export function contrast(hexA, hexB) {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
