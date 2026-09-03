// Seeds the running emulators. Never points at production: it refuses unless the emulator env
// vars are set to something that looks like a local emulator host.
//
// Import order matters: static ES imports are hoisted and evaluated in program order before any
// top-level code in *this* file runs, so setting process.env.FIRESTORE_EMULATOR_HOST /
// FIREBASE_AUTH_EMULATOR_HOST here (after `import 'firebase-admin/app'`) would run too late — the
// admin SDK reads those vars at import time. `_emulator-env.js` has no imports of its own, so it
// is evaluated first and sets the env vars before firebase-admin is ever imported.
import './_emulator-env.js';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const looksLocal = h => !!h && (h.includes('127.0.0.1') || h.includes('localhost'));
if (!looksLocal(firestoreHost) || !looksLocal(authHost)) {
  throw new Error('seed refuses to run outside the emulator');
}

const app = initializeApp({ projectId: 'demo-trust' });
const db = getFirestore(app), auth = getAuth(app);
const bi = (bn, en) => ({ bn, en });

// Reset first: the admin e2e suite creates real documents with auto-generated IDs (e.g. the
// "create + publish an event" test) that a plain upsert-by-fixed-ID below would never touch —
// left alone, a stray published doc from one run corrupts item-count assertions on the next.
// recursiveDelete also clears albums/*/photos subcollections.
for (const coll of ['history', 'events', 'albums', 'committee']) {
  await db.recursiveDelete(db.collection(coll));
}

const admin = await auth.createUser({ email: 'admin@example.com', password: 'password12345', emailVerified: true }).catch(() => auth.getUserByEmail('admin@example.com'));
await db.doc(`admins/${admin.uid}`).set({ createdAt: new Date() });
await db.doc('settings/site').set({
  name: bi('গণেশ পুজো ট্রাস্ট', 'Ganesh Puja Trust'), tagline: bi('সবার পুজো', 'Everyone\'s puja'),
  address: bi('মালদা', 'Malda'), theme: bi('', ''), logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '', email: '' }, regNo: '', has80G: false, upiId: '', upiQrUrl: '',
  pujaDate: new Date(Date.now() + 10 * 86400000).toISOString(), maintenance: false, defaultLang: 'bn',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: false, transparency: false, members: false },
});
const base = { deleted: false, createdAt: new Date() };
await db.doc('history/h1').set({ ...base, year: 2025, title: bi('২০২৫', '2025'), body: bi('<p>গত বছর</p>', '<p>Last year</p>'), images: [], order: 2025, published: true });
await db.doc('history/h2').set({ ...base, year: 2024, title: bi('ড্রাফট', 'Draft'), body: bi('', ''), images: [], order: 2024, published: false });
await db.doc('events/e1').set({ ...base, title: bi('আগামী', 'Upcoming'), venue: bi('মণ্ডপ', 'Pandal'), desc: bi('', ''), start: new Date(Date.now() + 5 * 86400000).toISOString(), end: '', order: 1, published: true });
await db.doc('events/e2').set({ ...base, title: bi('ড্রাফট', 'Draft event'), venue: bi('', ''), desc: bi('', ''), start: new Date().toISOString(), end: '', order: 2, published: false });
await db.doc('albums/a1').set({ ...base, title: bi('২০২৫ পুজো', 'Puja 2025'), year: 2025, coverUrl: 'https://placehold.co/400x300', order: 1, published: true });
await db.doc('albums/a1/photos/p1').set({ ...base, url: 'https://placehold.co/800x600', caption: bi('', ''), order: 1 });
await db.doc('albums/a1/photos/p2').set({ ...base, url: 'https://placehold.co/801x600', caption: bi('', ''), order: 2 });
await db.doc('albums/a2').set({ ...base, title: bi('ড্রাফট', 'Draft album'), year: 2024, coverUrl: '', order: 2, published: false });
await db.doc('committee/c1').set({ ...base, name: bi('সভাপতি', 'President'), post: bi('সভাপতি', 'President'), photoUrl: '', order: 1, isPublic: true });
await db.doc('committee/c2').set({ ...base, name: bi('গোপন', 'Hidden'), post: bi('', ''), photoUrl: '', order: 2, isPublic: false });
console.log('seeded; admin uid', admin.uid);
process.exit(0);
