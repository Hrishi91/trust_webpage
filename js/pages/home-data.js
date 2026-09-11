// js/pages/home-data.js — pure (no DOM, no Firebase import) extraction of home.js's six-collection
// load. Split out so it can be unit-tested directly (home.js itself only reaches Firebase
// transitively through content.js, so it can't be `node --test`ed on its own).
//
// Only `listPublished('events')` is load-bearing — home.js's own outer try/catch replaces the
// whole page with a generic error when it rejects. The other five collections are supporting
// content: a single failing one (a missing index, a transient permission hiccup, …) must not blank
// the entire home page, so each is wrapped in `soft()` and falls back to an empty array instead of
// rejecting the whole Promise.all (final-review fix wave, C1 — a still-building `culture` index
// during the Phase 6 rollout took the whole page down with it; see docs/build-log.md).
const soft = (p, fallback) => p.catch(err => { console.warn('[home]', err); return fallback; });

/**
 * fns: the four content.js loaders home.js calls — { listPublished, listCommittee,
 * listTransparencyYears, listCulture } — injected so this module never imports Firebase itself.
 * Returns { events, albums, history, people, years, cultureRows }. Rejects only when
 * `listPublished('events')` rejects (the caller's own try/catch handles that, same as before).
 */
export async function loadHome({ listPublished, listCommittee, listTransparencyYears, listCulture }) {
  const [events, albums, history, people, years, cultureRows] = await Promise.all([
    listPublished('events'),
    soft(listPublished('albums'), []),
    soft(listPublished('history'), []),
    soft(listCommittee(), []),
    soft(listTransparencyYears(), []),
    soft(listCulture(), []),
  ]);
  return { events, albums, history, people, years, cultureRows };
}
