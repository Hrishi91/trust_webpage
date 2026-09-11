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
 * settings.credItems: either free text (one custom credibility-strip entry per line, "bn | en" —
 * a line with no "|" is treated as bn-only, en falls back empty, same as pick()'s other-language
 * fallback elsewhere in the codebase) or, per the current spec, an array of {bn, en} objects. Both
 * shapes are accepted because Task 2's storage format changed after this parser was first written
 * and existing/hand-edited Firestore data may still be either. Blank lines are ignored; array
 * entries with neither a non-empty bn nor en (or that aren't even a plain object) are dropped —
 * malformed Firestore data must never crash rendering.
 */
export function parseCredItems(input) {
  if (Array.isArray(input)) {
    return input.map(entry => {
      if (!entry || typeof entry !== 'object') return null;
      const bn = typeof entry.bn === 'string' ? entry.bn.trim() : '';
      const en = typeof entry.en === 'string' ? entry.en.trim() : '';
      return (bn || en) ? { bn, en } : null;
    }).filter(Boolean);
  }
  if (typeof input !== 'string' || !input.trim()) return [];
  return input.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [bn, en = ''] = line.split('|').map(s => s.trim());
    return { bn, en };
  });
}
