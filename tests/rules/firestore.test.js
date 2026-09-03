import { test, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setup, ADMIN_UID } from './_env.js';

let E;
before(async () => { E = await setup(); });
after(async () => { await E?.testEnv?.cleanup(); });

const pub = { title: { bn: 'ক', en: 'k' }, published: true, deleted: false, order: 1 };
const draft = { ...pub, published: false };
const gone = { ...pub, deleted: true };

// ---- settings/site ----
test('settings: anyone reads, only admin writes', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.anon.firestore().doc('settings/site').get());
  await assertFails(E.anon.firestore().doc('settings/site').set({ name: 'x' }));
  await assertFails(E.other.firestore().doc('settings/site').set({ name: 'x' }));
  // Same uid as admin, admins/{uid} doc exists — only email_verified differs; gate must still deny.
  await assertFails(E.unverified.firestore().doc('settings/site').set({ name: { bn: 'a', en: 'b' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ name: { bn: 'a', en: 'b' } }));
  await assertFails(E.admin.firestore().doc('settings/site').delete());
});

// ---- published-content collections share one shape ----
for (const coll of ['history', 'events', 'albums']) {
  test(`${coll}: public sees published+not-deleted only; admin sees all; no hard delete`, async () => {
    await E.seed(async db => {
      await db.doc(`${coll}/p`).set(pub);
      await db.doc(`${coll}/d`).set(draft);
      await db.doc(`${coll}/g`).set(gone);
      await db.doc(`${coll}/legacy`).set({ title: pub.title, published: true, order: 5 });
    });
    const a = E.anon.firestore();
    await assertSucceeds(a.doc(`${coll}/p`).get());
    await assertFails(a.doc(`${coll}/d`).get());
    await assertFails(a.doc(`${coll}/g`).get());
    await assertFails(a.doc(`${coll}/legacy`).get());
    // list query must carry the constraints or it is rejected
    await assertSucceeds(a.collection(coll).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(a.collection(coll).get());
    await assertSucceeds(E.admin.firestore().doc(`${coll}/d`).get());
    await assertSucceeds(E.admin.firestore().collection(coll).get());
    await assertFails(a.doc(`${coll}/new`).set(pub));
    await assertFails(E.other.firestore().doc(`${coll}/new`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/new`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/new`).update({ deleted: true }));
    await assertFails(E.admin.firestore().doc(`${coll}/new`).delete());
    await assertFails(E.admin.firestore().doc(`${coll}/nodel`).set({ title: pub.title, published: true, order: 9 }));
    await assertFails(E.admin.firestore().doc(`${coll}/new`).update({ deleted: 'yes' }));
  });
}

test('committee: isPublic gates read', async () => {
  await E.seed(async db => {
    await db.doc('committee/p').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: true, deleted: false, order: 1 });
    await db.doc('committee/h').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: false, deleted: false, order: 2 });
    await db.doc('committee/g').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: true, deleted: true, order: 3 });
  });
  await assertSucceeds(E.anon.firestore().doc('committee/p').get());
  await assertFails(E.anon.firestore().doc('committee/h').get());
  await assertFails(E.anon.firestore().doc('committee/g').get());
  await assertSucceeds(E.anon.firestore().collection('committee').where('isPublic', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('committee').get());
  await assertFails(E.other.firestore().doc('committee/p').update({ post: 'hacked' }));
  await assertSucceeds(E.admin.firestore().collection('committee').get()); // admin list includes non-public/deleted rows — Export depends on this
  await assertSucceeds(E.admin.firestore().doc('committee/h').update({ isPublic: true }));
  await assertFails(E.admin.firestore().doc('committee/nodel').set({ name: { bn: 'x', en: 'x' }, post: { bn: 'y', en: 'y' }, isPublic: true, order: 9 }));
  await assertFails(E.admin.firestore().doc('committee/h').update({ deleted: 'yes' }));
});

test('albums/photos: readable only under a published album', async () => {
  await E.seed(async db => {
    await db.doc('albums/pub').set(pub);
    await db.doc('albums/pub/photos/1').set({ url: 'u', deleted: false, order: 1 });
    await db.doc('albums/pub/photos/g').set({ url: 'u', deleted: true, order: 2 });
    await db.doc('albums/drf').set(draft);
    await db.doc('albums/drf/photos/1').set({ url: 'u', deleted: false, order: 1 });
    await db.doc('albums/gone').set({ ...pub, deleted: true });
    await db.doc('albums/gone/photos/1').set({ url: 'u', deleted: false, order: 1 });
  });
  await assertSucceeds(E.anon.firestore().doc('albums/pub/photos/1').get());
  await assertFails(E.anon.firestore().doc('albums/drf/photos/1').get());
  await assertFails(E.anon.firestore().doc('albums/pub/photos/g').get());
  await assertFails(E.anon.firestore().doc('albums/gone/photos/1').get());
  await assertSucceeds(E.anon.firestore().collection('albums/pub/photos').where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('albums/drf/photos').where('deleted', '==', false).get());
  await assertFails(E.other.firestore().doc('albums/pub/photos/2').set({ url: 'x', deleted: false, order: 2 }));
  await assertSucceeds(E.admin.firestore().doc('albums/pub/photos/2').set({ url: 'x', deleted: false, order: 2 }));
  await assertFails(E.admin.firestore().doc('albums/pub/photos/2').delete());
  await assertFails(E.admin.firestore().doc('albums/pub/photos/nodel').set({ url: 'u', order: 9 }));
  await assertFails(E.admin.firestore().doc('albums/pub/photos/2').update({ deleted: 'yes' }));
});

test('admins: only admin reads, nobody writes from client', async () => {
  await assertFails(E.anon.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertFails(E.other.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertSucceeds(E.admin.firestore().doc(`admins/${ADMIN_UID}`).get());
  await assertFails(E.other.firestore().doc('admins/other-uid-2').set({ createdAt: new Date() }));
  await assertFails(E.admin.firestore().doc('admins/new').set({ createdAt: new Date() }));
});

test('audit: admin create with own uid only; append-only', async () => {
  const row = { uid: ADMIN_UID, action: 'update', path: 'settings/site', before: {}, after: {}, at: new Date() };
  await assertFails(E.anon.firestore().collection('audit').add(row));
  await assertFails(E.other.firestore().collection('audit').add({ ...row, uid: 'other-uid-2' }));
  await assertFails(E.admin.firestore().collection('audit').add({ ...row, uid: 'spoof' }));
  await assertFails(E.admin.firestore().collection('audit').add({ action: 'x', at: new Date() }));
  await assertSucceeds(E.admin.firestore().doc('audit/a1').set(row));
  await assertFails(E.admin.firestore().doc('audit/a1').update({ action: 'x' }));
  await assertFails(E.admin.firestore().doc('audit/a1').delete());
  await assertFails(E.other.firestore().doc('audit/a1').get());
  await assertSucceeds(E.admin.firestore().doc('audit/a1').get());
  await assertSucceeds(E.admin.firestore().collection('audit').get()); // admin list — Export depends on this
});

test('unknown collections are denied even to admin', async () => {
  await assertFails(E.admin.firestore().doc('donations/x').set({ amount: 1 }));
  await assertFails(E.anon.firestore().doc('members/x').get());
});

// ---- Phase 2: donations ----
test('donations: public reads only wall rows; admin all; no phone field ever; no delete', async () => {
  const row = { donorName: 'X', amount: 500, date: '2026-09-01', mode: 'upi', receiptNo: 'R1', year: 2026, isAnonymous: false, showOnWall: true, deleted: false, order: 1 };
  await E.seed(async db => { await db.doc('donations/w').set(row); await db.doc('donations/h').set({ ...row, showOnWall: false }); await db.doc('donations/g').set({ ...row, deleted: true }); });
  const a = E.anon.firestore();
  await assertSucceeds(a.doc('donations/w').get());
  await assertFails(a.doc('donations/h').get());
  await assertFails(a.doc('donations/g').get());
  await assertSucceeds(a.collection('donations').where('showOnWall', '==', true).where('deleted', '==', false).get());
  await assertFails(a.collection('donations').where('deleted', '==', false).get());
  await assertFails(E.member.firestore().doc('donations/h').get());
  await assertSucceeds(E.admin.firestore().collection('donations').get());
  await assertFails(a.doc('donations/new').set(row));
  await assertFails(E.admin.firestore().doc('donations/p').set({ ...row, phone: '9800000000' }));   // phone field forbidden
  await assertSucceeds(E.admin.firestore().doc('donations/new').set(row));
  await assertFails(E.admin.firestore().doc('donations/new').delete());
});

// ---- Phase 2: transparency ----
test('transparency: published only for public; admin all', async () => {
  const doc = { year: 2025, income: [{ category: { bn: 'চাঁদা', en: 'Donations' }, amount: 100 }], expense: [], documents: [], notes: { bn: '', en: '' }, published: true, deleted: false, order: 2025 };
  await E.seed(async db => { await db.doc('transparency/2025').set(doc); await db.doc('transparency/2024').set({ ...doc, year: 2024, published: false }); });
  await assertSucceeds(E.anon.firestore().doc('transparency/2025').get());
  await assertFails(E.anon.firestore().doc('transparency/2024').get());
  await assertSucceeds(E.anon.firestore().collection('transparency').where('published', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('transparency').get());
  await assertFails(E.other.firestore().doc('transparency/2025').update({ published: false }));
  await assertSucceeds(E.admin.firestore().doc('transparency/2024').update({ published: true }));
  await assertFails(E.admin.firestore().doc('transparency/2024').delete());
});

// ---- Phase 3: announcements ----
test('announcements: published only; admin writes; no delete', async () => {
  const an = { text: { bn: 'x', en: 'x' }, pinned: false, isLive: false, expiresAt: '', published: true, deleted: false, order: 1 };
  await E.seed(async db => { await db.doc('announcements/p').set(an); await db.doc('announcements/d').set({ ...an, published: false }); });
  await assertSucceeds(E.anon.firestore().doc('announcements/p').get());
  await assertFails(E.anon.firestore().doc('announcements/d').get());
  await assertSucceeds(E.anon.firestore().collection('announcements').where('published', '==', true).where('deleted', '==', false).get());
  await assertFails(E.anon.firestore().collection('announcements').get());
  await assertFails(E.member.firestore().doc('announcements/new').set(an));
  await assertSucceeds(E.admin.firestore().doc('announcements/new').set(an));
  await assertFails(E.admin.firestore().doc('announcements/new').delete());
});

// ---- Phase 4: members / notices / roster ----
test('members: own doc only; inactive still reads own; nobody else; admin writes only', async () => {
  await assertSucceeds(E.member.firestore().doc('members/+919999999999').get());
  await assertFails(E.member.firestore().doc('members/+918888888888').get());
  await assertSucceeds(E.inactive.firestore().doc('members/+917777777777').get());
  await assertFails(E.anon.firestore().doc('members/+919999999999').get());
  await assertFails(E.other.firestore().doc('members/+919999999999').get());          // email-only user
  await assertFails(E.member.firestore().collection('members').get());
  await assertSucceeds(E.admin.firestore().collection('members').get());
  await assertFails(E.member.firestore().doc('members/+919999999999').update({ pledge: 0 }));
  await assertSucceeds(E.admin.firestore().doc('members/+919999999999').update({ pledge: 6000 }));
  await assertFails(E.admin.firestore().doc('members/+919999999999').delete());
});
test('notices + roster: active members and admin read; inactive/anon denied; admin writes', async () => {
  await E.seed(async db => {
    await db.doc('notices/n1').set({ title: { bn: 'x', en: 'x' }, body: { bn: '', en: '' }, published: true, deleted: false, order: 1 });
    await db.doc('roster/r1').set({ date: '2026-09-15', duty: { bn: 'গেট', en: 'Gate' }, memberPhones: ['+919999999999'], note: '', published: true, deleted: false, order: 1 });
  });
  for (const c of ['notices', 'roster']) {
    await assertSucceeds(E.member.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertSucceeds(E.otherMember.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.inactive.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.anon.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.member.firestore().doc(`${c}/x`).set({ published: true, deleted: false, order: 9 }));
    await assertSucceeds(E.admin.firestore().collection(c).get());
  }
  await assertSucceeds(E.member.firestore().collection('roster').where('memberPhones', 'array-contains', '+919999999999').where('published', '==', true).where('deleted', '==', false).get());
});
