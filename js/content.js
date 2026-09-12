import { db, collection, doc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot } from './firebase.js';
import { PAGE_DEFAULTS } from './page-defaults.js';
import { DEFAULT_SETTINGS } from './default-settings.js';

export { DEFAULT_SETTINGS };

// A read failure must not look like empty/absent data unless it actually IS an expected access
// outcome — an inactive member's notices/roster query, or a signed-out visitor hitting an
// admin-only doc, both legitimately come back permission-denied and the caller (an [] / null
// fallback) already handles that correctly. Anything else — failed-precondition (a missing
// composite index), unavailable, a network blip — is a real problem the page must surface as
// common.error, not silently render as "nothing here yet". `allowNotFound` is for the single-doc
// getters, where a genuinely absent document is also a legitimate, non-error outcome.
function isExpectedAccessError(err, { allowNotFound = false } = {}) {
  return err?.code === 'permission-denied' || (allowNotFound && err?.code === 'not-found');
}

let settingsPromise;
export function getSettings() {
  // On a failed read, fail CLOSED (maintenance: true) rather than open — a broken settings read
  // is exactly the kind of outage the maintenance notice exists for, and showing the site as if
  // nothing were wrong (with placeholder/default content) would be worse than a "come back
  // shortly" notice. Also do NOT memoise the failure: resetting settingsPromise here means the
  // very next call (e.g. a fresh page load, or the same page 60s later) retries the network read
  // instead of being stuck showing maintenance for the rest of the page's life once the backend
  // recovers.
  settingsPromise ??= getDoc(doc(db, 'settings', 'site'))
    .then(s => ({ ...DEFAULT_SETTINGS, ...(s.data() ?? {}), sectionVisibility: { ...DEFAULT_SETTINGS.sectionVisibility, ...(s.data()?.sectionVisibility ?? {}) } }))
    .catch(err => {
      console.warn('[content]', err);
      settingsPromise = undefined;
      return { ...DEFAULT_SETTINGS, maintenance: true };
    });
  return settingsPromise;
}

// content/strings + content/media (Phase 6 overrides). Each doc is read independently and a
// failure on either one never blocks the other or the page — unlike getSettings(), a broken read
// here just means "no overrides today", not "the site is down", so it resolves to {} rather than
// failing closed. Memoised the same way (module-level promise, one read per page load).
let contentPromise;
export function getContent() {
  const readDoc = name => getDoc(doc(db, 'content', name)).then(s => s.data() ?? {}).catch(err => { console.warn('[content]', err); return {}; });
  contentPromise ??= Promise.all([readDoc('strings'), readDoc('media')]).then(([strings, media]) => ({ strings, media }));
  return contentPromise;
}

const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export async function listPublished(coll) {
  return rows(await getDocs(query(collection(db, coll), where('published', '==', true), where('deleted', '==', false), orderBy('order'))));
}
// culture/{id} — same published+!deleted+order semantics as every other listPublished() collection.
export async function listCulture() {
  return listPublished('culture');
}
export async function listCommittee() {
  return rows(await getDocs(query(collection(db, 'committee'), where('isPublic', '==', true), where('deleted', '==', false), orderBy('order'))));
}
export async function listPhotos(albumId) {
  try {
    return rows(await getDocs(query(collection(db, 'albums', albumId, 'photos'), where('deleted', '==', false), orderBy('order'))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}
// pages/{id} — Phase 7 Task 1. Never surfaces common.error: an unpublished/absent doc, or any
// read failure, falls back to the code default in js/page-defaults.js so these pages always show
// real copy (same "nothing static" promise as culture cards, just with a static fallback instead
// of an empty list).
export async function getPage(id) {
  const def = PAGE_DEFAULTS[id];
  try {
    const pub = await getPublished('pages', id);
    return pub ? { title: pub.title, body: pub.body } : def;
  } catch (err) {
    console.warn('[content] getPage', err);
    return def;
  }
}

export async function getPublished(coll, id) {
  try {
    const s = await getDoc(doc(db, coll, id));
    return s.exists() && s.data().published === true && s.data().deleted === false ? { id: s.id, ...s.data() } : null;
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err, { allowNotFound: true })) throw err;
    return null;
  }
}

export async function listDonorWall(limitN = 50) {
  try {
    return rows(await getDocs(query(collection(db, 'donations'),
      where('showOnWall', '==', true), where('deleted', '==', false), orderBy('date', 'desc'), limit(limitN))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}

export async function listTransparencyYears() {
  try {
    return rows(await getDocs(query(collection(db, 'transparency'),
      where('published', '==', true), where('deleted', '==', false), orderBy('year', 'desc'))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}

export async function getTransparency(year) {
  try {
    const s = await getDoc(doc(db, 'transparency', String(year)));
    return s.exists() && s.data().published === true && s.data().deleted === false ? { id: s.id, ...s.data() } : null;
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err, { allowNotFound: true })) throw err;
    return null;
  }
}

// onAnnouncements(cb): realtime, published+!deleted, newest order first, non-expired only,
// pinned first within that. cb(list, { live }) — live means at least one visible row is isLive.
export function onAnnouncements(cb) {
  const q = query(collection(db, 'announcements'),
    where('published', '==', true), where('deleted', '==', false), orderBy('order', 'desc'), limit(20));
  return onSnapshot(q, snap => {
    const now = Date.now();
    const list = rows(snap)
      .filter(a => !a.expiresAt || new Date(a.expiresAt).getTime() > now)
      .sort((x, y) => (y.pinned - x.pinned) || (y.order - x.order));
    cb(list, { live: list.some(a => a.isLive) });
  }, err => { console.warn('[content] announcements', err); cb([], { live: false }); });
}

// news.html archive (Phase 7 Task 1): every published+non-deleted announcement, newest first, no
// limit and no expiresAt filter — unlike onAnnouncements() (the home ticker, capped at 5 and
// hiding expired items), this is the page an old announcement stays reachable from forever.
export async function listAnnouncementsAll() {
  try {
    return rows(await getDocs(query(collection(db, 'announcements'),
      where('published', '==', true), where('deleted', '==', false), orderBy('order', 'desc'))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}

export async function getMyMember(phone) {
  try {
    const s = await getDoc(doc(db, 'members', phone));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err, { allowNotFound: true })) throw err;
    return null;
  }
}

export async function listNotices() {
  try {
    return rows(await getDocs(query(collection(db, 'notices'),
      where('published', '==', true), where('deleted', '==', false), orderBy('order', 'desc'))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}

export async function listMyRoster(phone) {
  try {
    return rows(await getDocs(query(collection(db, 'roster'),
      where('memberPhones', 'array-contains', phone), where('published', '==', true), where('deleted', '==', false), orderBy('date'))));
  } catch (err) {
    console.warn('[content]', err);
    if (!isExpectedAccessError(err)) throw err;
    return [];
  }
}
