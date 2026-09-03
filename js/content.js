import { db, collection, doc, getDoc, getDocs, query, where, orderBy } from './firebase.js';

export const DEFAULT_SETTINGS = {
  name: { bn: 'গণেশ পুজো ট্রাস্ট', en: 'Ganesh Puja Trust' }, tagline: { bn: '', en: '' },
  address: { bn: '', en: '' }, theme: { bn: '', en: '' }, logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '', email: '' }, regNo: '', has80G: false, upiId: '', upiQrUrl: '',
  pujaDate: '', maintenance: false, defaultLang: 'bn',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: false, transparency: false, members: false },
};

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

const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export async function listPublished(coll) {
  return rows(await getDocs(query(collection(db, coll), where('published', '==', true), where('deleted', '==', false), orderBy('order'))));
}
export async function listCommittee() {
  return rows(await getDocs(query(collection(db, 'committee'), where('isPublic', '==', true), where('deleted', '==', false), orderBy('order'))));
}
export async function listPhotos(albumId) {
  try {
    return rows(await getDocs(query(collection(db, 'albums', albumId, 'photos'), where('deleted', '==', false), orderBy('order'))));
  } catch (err) {
    console.warn('[content]', err);
    return [];
  }
}
export async function getPublished(coll, id) {
  try {
    const s = await getDoc(doc(db, coll, id));
    return s.exists() && s.data().published === true && s.data().deleted === false ? { id: s.id, ...s.data() } : null;
  } catch (err) {
    console.warn('[content]', err);
    return null;
  }
}
