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

test('settings: design must be one of the five theme names when present', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ design: 'mukha' }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ tagline: { bn: 'x', en: 'y' } }, { merge: true })); // design absent is fine
  await assertFails(E.admin.firestore().doc('settings/site').set({ design: 'neon' }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ design: 7 }, { merge: true }));
  await assertFails(E.anon.firestore().doc('settings/site').set({ design: 'mukha' }, { merge: true }));
});

// ---- published-content collections share one shape ----
// Phase 7 Task 1 (Fix round 1): pages/{id} has the same published+!deleted / admin-write / no-hard-delete
// shape as history/events/albums, but write rule restricts to fixed ids only (privacy/refund/trust/contact/
// faq/news/downloads/notfound). The loop tests all three with arbitrary IDs; pages uses 'faq' (a fixed ID).
for (const coll of ['history', 'events', 'albums', 'pages']) {
  test(`${coll}: public sees published+not-deleted only; admin sees all; no hard delete`, async () => {
    const docId = coll === 'pages' ? 'faq' : 'new';  // pages uses fixed IDs only
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
    await assertFails(a.doc(`${coll}/${docId}`).set(pub));
    await assertFails(E.other.firestore().doc(`${coll}/${docId}`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/${docId}`).set(pub));
    await assertSucceeds(E.admin.firestore().doc(`${coll}/${docId}`).update({ deleted: true }));
    await assertFails(E.admin.firestore().doc(`${coll}/${docId}`).delete());
    await assertFails(E.admin.firestore().doc(`${coll}/nodel`).set({ title: pub.title, published: true, order: 9 }));
    await assertFails(E.admin.firestore().doc(`${coll}/${docId}`).update({ deleted: 'yes' }));
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

test('collections without rules are denied even to admin (uses a truly unmatched path)', async () => {
  await assertFails(E.admin.firestore().doc('zzz_unknown/x').set({ amount: 1 }));
  await assertFails(E.anon.firestore().doc('zzz_unknown/x').get());
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
  await assertFails(E.admin.firestore().doc('donations/p2').set({ ...row, contact: { phone: '98' } }));  // nested phone forbidden — closed key set
  await assertFails(E.admin.firestore().doc('donations/p3').set({ ...row, mobile: '98' }));               // any unlisted key forbidden
  const { deleted: _d, ...rowNoDeleted } = row;
  await assertFails(E.admin.firestore().doc('donations/nodel').set(rowNoDeleted));                        // hasDeletedFlag
  await assertSucceeds(E.admin.firestore().doc('donations/new').set(row));
  await assertFails(E.admin.firestore().doc('donations/new').update({ deleted: 'yes' }));                 // hasDeletedFlag
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
  const { deleted: _d, ...docNoDeleted } = doc;
  await assertFails(E.admin.firestore().doc('transparency/nodel').set(docNoDeleted));   // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('transparency/2025').update({ deleted: 'yes' }));   // hasDeletedFlag
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
  const { deleted: _d, ...anNoDeleted } = an;
  await assertFails(E.admin.firestore().doc('announcements/nodel').set(anNoDeleted));   // hasDeletedFlag
  await assertSucceeds(E.admin.firestore().doc('announcements/new').set(an));
  await assertFails(E.admin.firestore().doc('announcements/new').update({ deleted: 'yes' }));   // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('announcements/new').delete());
});

// ---- Phase 4: members / notices / roster ----
test('members: own doc only; inactive still reads own; removed (soft-deleted) cannot; nobody else; admin writes only', async () => {
  await assertSucceeds(E.member.firestore().doc('members/+919999999999').get());
  await assertFails(E.member.firestore().doc('members/+918888888888').get());
  await assertSucceeds(E.inactive.firestore().doc('members/+917777777777').get());
  await assertFails(E.removed.firestore().doc('members/+916666666666').get());        // deleted:true own doc — own-doc read requires deleted==false
  await assertFails(E.anon.firestore().doc('members/+919999999999').get());
  await assertFails(E.other.firestore().doc('members/+919999999999').get());          // email-only user
  await assertFails(E.member.firestore().collection('members').get());
  await assertSucceeds(E.admin.firestore().collection('members').get());
  await assertSucceeds(E.admin.firestore().doc('members/+916666666666').get());       // admin still sees deleted rows
  await assertFails(E.member.firestore().doc('members/+919999999999').update({ pledge: 0 }));
  await assertSucceeds(E.admin.firestore().doc('members/+919999999999').update({ pledge: 6000 }));
  await assertFails(E.admin.firestore().doc('members/+915555555555').set({ name: { bn: 'x', en: 'x' }, role: { bn: '', en: '' }, pledge: 0, payments: [], active: true, order: 9 }));   // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('members/+919999999999').update({ deleted: 'yes' }));   // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('members/+919999999999').delete());
});
test('notices + roster: active members and admin read; inactive/removed/other/anon denied; isLive() enforced; admin writes', async () => {
  await E.seed(async db => {
    await db.doc('notices/n1').set({ title: { bn: 'x', en: 'x' }, body: { bn: '', en: '' }, published: true, deleted: false, order: 1 });
    await db.doc('notices/draft').set({ title: { bn: 'x', en: 'x' }, body: { bn: '', en: '' }, published: false, deleted: false, order: 2 });
    await db.doc('notices/gone').set({ title: { bn: 'x', en: 'x' }, body: { bn: '', en: '' }, published: true, deleted: true, order: 3 });
    await db.doc('roster/r1').set({ date: '2026-09-15', duty: { bn: 'গেট', en: 'Gate' }, memberPhones: ['+919999999999'], note: '', published: true, deleted: false, order: 1 });
    await db.doc('roster/draft').set({ date: '2026-09-16', duty: { bn: 'x', en: 'x' }, memberPhones: [], note: '', published: false, deleted: false, order: 2 });
    await db.doc('roster/gone').set({ date: '2026-09-17', duty: { bn: 'x', en: 'x' }, memberPhones: [], note: '', published: true, deleted: true, order: 3 });
  });
  const existingId = { notices: 'n1', roster: 'r1' };
  for (const c of ['notices', 'roster']) {
    await assertSucceeds(E.member.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertSucceeds(E.otherMember.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.inactive.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    await assertFails(E.removed.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());   // soft-deleted member — activeMember() must exclude
    await assertFails(E.other.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());     // email-only, not a member at all
    await assertFails(E.anon.firestore().collection(c).where('published', '==', true).where('deleted', '==', false).get());
    // isLive(): draft and soft-deleted rows are never readable, even direct-get by an active member
    await assertFails(E.member.firestore().doc(`${c}/draft`).get());
    await assertFails(E.member.firestore().doc(`${c}/gone`).get());
    // a list query missing the `published` constraint must be rejected outright (rules can't filter it)
    await assertFails(E.member.firestore().collection(c).where('deleted', '==', false).get());
    await assertFails(E.member.firestore().doc(`${c}/x`).set({ published: true, deleted: false, order: 9 }));
    await assertFails(E.admin.firestore().doc(`${c}/nodel`).set({ published: true, order: 9 }));                    // hasDeletedFlag
    await assertFails(E.admin.firestore().doc(`${c}/${existingId[c]}`).update({ deleted: 'yes' }));                  // hasDeletedFlag
    await assertSucceeds(E.admin.firestore().collection(c).get());
  }
  await assertSucceeds(E.member.firestore().collection('roster').where('memberPhones', 'array-contains', '+919999999999').where('published', '==', true).where('deleted', '==', false).get());
});

// ---- Phase 6 Task 2: content/strings, content/media, culture, settings overrides ----
test('content: strings/media readable by anyone; only admin writes; only those two doc ids; no delete', async () => {
  await E.seed(async db => {
    await db.doc('content/strings').set({ 'nav.home': { bn: 'ক', en: 'k' } });
    await db.doc('content/media').set({ hero: 'https://example.com/hero.jpg' });
  });
  await assertSucceeds(E.anon.firestore().doc('content/strings').get());
  await assertSucceeds(E.anon.firestore().doc('content/media').get());
  await assertFails(E.anon.firestore().doc('content/strings').set({ x: { bn: 'a', en: 'b' } }));
  await assertFails(E.other.firestore().doc('content/strings').set({ x: { bn: 'a', en: 'b' } }));
  await assertFails(E.unverified.firestore().doc('content/strings').set({ 'nav.home': { bn: 'x', en: 'y' } }));
  await assertSucceeds(E.admin.firestore().doc('content/strings').set({ 'nav.home': { bn: 'গ', en: 'g' } }));
  await assertSucceeds(E.admin.firestore().doc('content/media').set({ hero: 'https://example.com/new.jpg' }));
  await assertFails(E.admin.firestore().doc('content/other').set({ x: 1 }));
  await assertFails(E.admin.firestore().doc('content/strings').delete());
});

test('culture: published+not-deleted for public; admin sees all; write needs deleted flag; no delete', async () => {
  await E.seed(async db => {
    await db.doc('culture/p').set(pub);
    await db.doc('culture/d').set(draft);
    await db.doc('culture/g').set(gone);
    await db.doc('culture/cu-draft').set(draft);
  });
  const a = E.anon.firestore();
  await assertSucceeds(a.doc('culture/p').get());
  await assertFails(a.doc('culture/d').get());
  await assertFails(a.doc('culture/g').get());
  await assertSucceeds(a.collection('culture').where('published', '==', true).where('deleted', '==', false).get());
  await assertFails(a.collection('culture').get());
  await assertSucceeds(E.admin.firestore().collection('culture').get());
  await assertFails(E.other.firestore().doc('culture/new').set(pub));
  await assertFails(E.unverified.firestore().doc('culture/c9').set({ ...pub }));
  await assertFails(E.unverified.firestore().doc('culture/cu-draft').get());
  await assertSucceeds(E.admin.firestore().doc('culture/new').set(pub));
  await assertFails(E.admin.firestore().doc('culture/nodel').set({ title: pub.title, published: true, order: 9 }));   // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('culture/new').update({ deleted: 'yes' }));                               // hasDeletedFlag
  await assertFails(E.admin.firestore().doc('culture/new').delete());
});

test('settings: designOverrides validated per whitelisted key as #rrggbb', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ designOverrides: { sindoor: '#c9361a' } }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ tagline: { bn: 'x', en: 'y' } }, { merge: true })); // designOverrides absent is fine
  await assertFails(E.admin.firestore().doc('settings/site').set({ designOverrides: { sindoor: 'red' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ designOverrides: { evil: '#000000' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ designOverrides: 'nope' }, { merge: true }));
  await assertFails(E.anon.firestore().doc('settings/site').set({ designOverrides: { sindoor: '#c9361a' } }, { merge: true }));
});

test('settings: fonts validated against the whitelist, empty string allowed (theme default)', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ fonts: { display: 'Atma' } }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ fonts: { display: '', body: 'Hind Siliguri' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ fonts: { display: 'Comic Sans' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ fonts: { evil: 'Atma' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ fonts: 'nope' }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ fonts: 5 }, { merge: true }));
});

test('settings: homeSections must be a list within the size cap; per-element shape is validated client-side (Task 3)', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ homeSections: [{ key: 'hero', on: true }] }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ homeSections: Array.from({ length: 11 }, (_, i) => ({ key: 'x' + i, on: true })) }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ homeSections: 'nope' }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ homeSections: Array.from({ length: 12 }, (_, i) => ({ key: 'x' + i, on: true })) }, { merge: true }));
});

// Phase 6 Task 6: settings.social — each of the four links must be '' or https://.
test('settings: social must be https:// or empty per whitelisted key', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ social: { facebook: 'https://facebook.com/x' } }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ social: { facebook: '', youtube: '', instagram: '', whatsappGroup: '' } }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ tagline: { bn: 'x', en: 'y' } }, { merge: true })); // social absent is fine
  await assertFails(E.admin.firestore().doc('settings/site').set({ social: { facebook: 'http://facebook.com/x' } }, { merge: true })); // not https
  await assertFails(E.admin.firestore().doc('settings/site').set({ social: { facebook: 'javascript:alert(1)' } }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ social: { evil: 'https://x.com' } }, { merge: true })); // unknown key
  await assertFails(E.admin.firestore().doc('settings/site').set({ social: 'nope' }, { merge: true }));
  await assertFails(E.anon.firestore().doc('settings/site').set({ social: { facebook: 'https://facebook.com/x' } }, { merge: true }));
});

// Phase 7 Task 1: settings.trustees — a bounded list for trust.html (rules can't validate list
// element shape, same as homeSections — just the type + size cap).
test('settings: trustees must be a list within the size cap', async () => {
  await E.seed(db => db.doc('settings/site').set({ name: { bn: 'ট্রাস্ট', en: 'Trust' } }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ trustees: [{ name: { bn: 'ক', en: 'k' }, role: { bn: 'সভাপতি', en: 'President' } }] }, { merge: true }));
  await assertSucceeds(E.admin.firestore().doc('settings/site').set({ tagline: { bn: 'x', en: 'y' } }, { merge: true })); // trustees absent is fine
  await assertFails(E.admin.firestore().doc('settings/site').set({ trustees: 'nope' }, { merge: true }));
  await assertFails(E.admin.firestore().doc('settings/site').set({ trustees: Array.from({ length: 21 }, () => ({})) }, { merge: true }));
  await assertFails(E.anon.firestore().doc('settings/site').set({ trustees: [] }, { merge: true }));
});

// Phase 7 Task 1 (Fix round 1): pages — only the eight fixed ids can be written
test('pages: only fixed ids (privacy, refund, trust, contact, faq, news, downloads, notfound) can be written', async () => {
  await assertFails(E.admin.firestore().doc('pages/evil').set(pub));
  await assertSucceeds(E.admin.firestore().doc('pages/faq').set({ title: { bn: 'প্রশ্নোত্তর', en: 'FAQ' }, body: { bn: '', en: '' }, published: false, deleted: false }));
});
