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
});

test('unknown collections are denied even to admin', async () => {
  await assertFails(E.admin.firestore().doc('donations/x').set({ amount: 1 }));
  await assertFails(E.anon.firestore().doc('members/x').get());
});
