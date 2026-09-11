// js/sections.js — pure (no DOM, no Firebase). Home page section order/visibility
// (settings.homeSections, Phase 6 "nothing static") and the credibility-strip custom items
// (settings.credItems), both admin-editable free text turned into safe, typed data here.

// Default (= current, untouched-site) render order of js/pages/home.js's sections.
export const HOME_SECTIONS = [
  'hero', 'cred', 'glance', 'story', 'culture', 'gallery', 'schedule', 'ledger', 'donate', 'committee', 'members',
];

/**
 * settings.homeSections (a free-form list the admin can reorder/toggle) → a safe, complete
 * ordering: every entry whose key isn't one of HOME_SECTIONS is dropped, a repeated key keeps
 * only its first occurrence, and any HOME_SECTIONS key missing from the list is appended at the
 * end with on:true (a newly-added section a stale saved order never mentioned must still render).
 * Anything that isn't an array (unset, malformed Firestore data) falls back to the default order,
 * all on — exactly today's site.
 */
export function orderSections(list) {
  if (!Array.isArray(list)) return HOME_SECTIONS.map(key => ({ key, on: true }));
  const seen = new Set();
  const out = [];
  for (const entry of list) {
    const key = entry?.key;
    if (typeof key !== 'string' || !HOME_SECTIONS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, on: entry.on !== false });
  }
  for (const key of HOME_SECTIONS) {
    if (!seen.has(key)) out.push({ key, on: true });
  }
  return out;
}

/**
 * settings.credItems: free text, one custom credibility-strip entry per line, "bn | en".
 * A line with no "|" is treated as bn-only (en falls back empty, same as pick()'s other-language
 * fallback elsewhere in the codebase). Blank lines are ignored.
 */
export function parseCredItems(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [bn, en = ''] = line.split('|').map(s => s.trim());
    return { bn, en };
  });
}
