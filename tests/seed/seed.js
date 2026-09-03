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
const looksLocal = h => !!h && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h);
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
for (const coll of ['history', 'events', 'albums', 'committee', 'donations', 'transparency', 'announcements', 'members', 'notices', 'roster']) {
  await db.recursiveDelete(db.collection(coll));
}

const admin = await auth.createUser({ email: 'admin@example.com', password: 'password12345', emailVerified: true }).catch(() => auth.getUserByEmail('admin@example.com'));
await db.doc(`admins/${admin.uid}`).set({ createdAt: new Date() });
await db.doc('settings/site').set({
  name: bi('গণেশ পুজো ট্রাস্ট', 'Ganesh Puja Trust'), tagline: bi('সবার পুজো', 'Everyone\'s puja'),
  address: bi('মালদা', 'Malda'), theme: bi('', ''), logoUrl: '', mapUrl: '',
  contacts: { phone: '', whatsapp: '919800000000', email: '' }, regNo: 'WB/2026/DEMO', has80G: false, upiId: 'trust@upi', upiQrUrl: '',
  pujaDate: new Date(Date.now() + 10 * 86400000).toISOString(), maintenance: false, defaultLang: 'bn',
  sectionVisibility: { about: true, committee: true, gallery: true, events: true, donate: true, transparency: true, members: true },
});
const base = { deleted: false, createdAt: new Date() };
await db.doc('history/h1').set({ ...base, year: 2025, title: bi('২০২৫', '2025'), body: bi('<p>গত বছর</p>', '<p>Last year</p>'), images: [], order: 2025, published: true });
await db.doc('history/h2').set({ ...base, year: 2024, title: bi('ড্রাফট', 'Draft'), body: bi('', ''), images: [], order: 2024, published: false });
await db.doc('events/e1').set({ ...base, title: bi('আগামী', 'Upcoming'), venue: bi('মণ্ডপ', 'Pandal'), desc: bi('', ''), start: new Date(Date.now() + 5 * 86400000).toISOString(), end: '', order: 1, published: true });
await db.doc('events/e2').set({ ...base, title: bi('ড্রাফট', 'Draft event'), venue: bi('', ''), desc: bi('', ''), start: new Date().toISOString(), end: '', order: 2, published: false });
await db.doc('albums/a1').set({ ...base, title: bi('২০২৫ পুজো', 'Puja 2025'), year: 2025, coverUrl: 'https://placehold.co/400x300', order: 2025000, published: true });
await db.doc('albums/a1/photos/p1').set({ ...base, url: 'https://placehold.co/800x600', caption: bi('', ''), order: 1 });
await db.doc('albums/a1/photos/p2').set({ ...base, url: 'https://placehold.co/801x600', caption: bi('', ''), order: 2 });
await db.doc('albums/a2').set({ ...base, title: bi('ড্রাফট', 'Draft album'), year: 2024, coverUrl: '', order: 2024000, published: false });
await db.doc('committee/c1').set({ ...base, name: bi('সভাপতি', 'President'), post: bi('সভাপতি', 'President'), photoUrl: '', order: 1, isPublic: true });
await db.doc('committee/c2').set({ ...base, name: bi('গোপন', 'Hidden'), post: bi('', ''), photoUrl: '', order: 2, isPublic: false });

// Phase 2–4: members (phone auth), notices, roster, donations, transparency, announcements.
// member-1 is also created as an Auth-emulator phone user so `npm run e2e`/manual OTP login can
// exercise the members portal against the production test number (+919999999999 → code 123456,
// configured on production by scripts/auth-config.mjs; the Auth emulator hands out its own code
// via GET http://127.0.0.1:9099/emulator/v1/projects/demo-trust/verificationCodes).
const member1 = await auth.createUser({ uid: 'member-1', phoneNumber: '+919999999999' }).catch(() => auth.getUser('member-1'));
await db.doc('members/+919999999999').set({
  ...base, name: bi('সদস্য এক', 'Member One'), role: bi('সম্পাদক', 'Secretary'), pledge: 5000,
  payments: [{ date: '2026-08-01', amount: 2000, note: '' }, { date: '2026-08-20', amount: 1500, note: '' }],
  active: true, order: 1,
});
await db.doc('members/+918888888888').set({
  ...base, name: bi('সদস্য দুই', 'Member Two'), role: bi('কোষাধ্যক্ষ', 'Treasurer'), pledge: 3000,
  payments: [], active: true, order: 2,
});
await db.doc('members/+917777777777').set({
  ...base, name: bi('সদস্য তিন', 'Member Three'), role: bi('সদস্য', 'Member'), pledge: 1000,
  payments: [], active: false, order: 3,
});

const noticeBase = Date.now();
await db.doc('notices/n1').set({ ...base, title: bi('পুজোর মিটিং', 'Puja meeting'), body: bi('<p>আগামী শনিবার মিটিং</p>', '<p>Meeting next Saturday</p>'), published: true, order: noticeBase });
await db.doc('notices/n2').set({ ...base, title: bi('ড্রাফট নোটিশ', 'Draft notice'), body: bi('', ''), published: false, order: noticeBase + 1 });

const rosterDate1 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const rosterDate2 = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
await db.doc('roster/r1').set({
  ...base, date: rosterDate1, duty: bi('গেট ডিউটি', 'Gate duty'), memberPhones: ['+919999999999'],
  note: '', published: true, order: new Date(rosterDate1).getTime(),
});
await db.doc('roster/r2').set({
  ...base, date: rosterDate2, duty: bi('প্রসাদ বিতরণ', 'Prasad distribution'), memberPhones: ['+918888888888'],
  note: '', published: true, order: new Date(rosterDate2).getTime(),
});

const donationRows = [
  { id: 'd1', donorName: 'রাম দাস', amount: 1100, date: '2026-06-01', mode: 'upi', receiptNo: 'R-2026-D1', isAnonymous: false, showOnWall: true, note: '' },
  { id: 'd2', donorName: 'শ্যাম রায়', amount: 2100, date: '2026-07-15', mode: 'cash', receiptNo: 'R-2026-D2', isAnonymous: false, showOnWall: true, note: '' },
  { id: 'd3', donorName: 'গোপন দাতা', amount: 5000, date: '2026-08-01', mode: 'bank', receiptNo: 'R-2026-D3', isAnonymous: false, showOnWall: false, note: 'hidden from wall' },
  { id: 'd4', donorName: 'অজ্ঞাত', amount: 500, date: '2026-08-10', mode: 'upi', receiptNo: 'R-2026-D4', isAnonymous: true, showOnWall: true, note: '' },
];
for (const d of donationRows) {
  await db.doc(`donations/${d.id}`).set({
    ...base, donorName: d.donorName, amount: d.amount, date: d.date, mode: d.mode, receiptNo: d.receiptNo,
    year: Number(d.date.slice(0, 4)), isAnonymous: d.isAnonymous, showOnWall: d.showOnWall, note: d.note,
    order: new Date(d.date).getTime(), published: true,
  });
}

await db.doc('transparency/2025').set({
  ...base, year: 2025,
  income: [{ category: bi('চাঁদা', 'Subscription'), amount: 42000 }, { category: bi('রোড শো', 'Road show'), amount: 8000 }, { category: bi('বাস', 'Bus'), amount: 5000 }],
  expense: [{ category: bi('প্রতিমা', 'Idol'), amount: 20000 }, { category: bi('মণ্ডপ', 'Pandal'), amount: 15000 }],
  documents: [{ title: bi('অডিট ২০২৫', 'Audit 2025'), url: 'https://example.com/audit-2025.pdf' }],
  notes: bi('২০২৫ সালের হিসাব', 'Accounts for 2025'), order: 2025, published: true,
});
await db.doc('transparency/2024').set({
  ...base, year: 2024,
  income: [{ category: bi('চাঁদা', 'Subscription'), amount: 30000 }],
  expense: [{ category: bi('প্রতিমা', 'Idol'), amount: 18000 }],
  documents: [], notes: bi('', ''), order: 2024, published: false,
});

const annBase = Date.now();
await db.doc('announcements/an1').set({ ...base, text: bi('স্বাগতম! এই বছরের পুজো শুরু হচ্ছে।', 'Welcome! This year\'s puja is starting.'), pinned: true, isLive: false, expiresAt: '', order: annBase, published: true });
await db.doc('announcements/an2').set({ ...base, text: bi('এখন লাইভ: সন্ধ্যা আরতি', 'Live now: evening aarti'), pinned: false, isLive: true, expiresAt: '', order: annBase + 1, published: true });
await db.doc('announcements/an3').set({ ...base, text: bi('গতকালের ঘোষণা (মেয়াদ শেষ)', 'Yesterday\'s announcement (expired)'), pinned: false, isLive: false, expiresAt: new Date(Date.now() - 86400000).toISOString(), order: annBase - 1000, published: true });

console.log('seeded; admin uid', admin.uid, '; member uid', member1.uid);
process.exit(0);
