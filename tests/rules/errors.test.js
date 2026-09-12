// Phase 7 Task 7 (site-basics audit item 42): `errors/{id}` — client-side error reports written by
// js/errors.js. Create-only, bounded fields, no auth required (public site — every visitor,
// signed in or not, can throw an error); read is admin-only, update always fails. Final-review fix
// wave I6: unlike `audit` (permanent, never deletable — tests/rules/firestore.test.js's audit
// test), `errors` is now admin-deletable too — an ephemeral bug-report inbox, not a record of
// who-did-what, and privacy.html promises these are kept "at most 90 days".
//
// `at` must equal `request.time` — js/errors.js writes `serverTimestamp()`, which Firestore
// resolves to the server's own request time before rules evaluate, so this is the standard way to
// pin a create-time field server-side (a client could otherwise backdate/forge it with a literal
// Timestamp). firebase/compat's `firebase.firestore.FieldValue.serverTimestamp()` is the same
// sentinel emitted by the modular SDK's `serverTimestamp()` (js/firebase.js re-exports the latter)
// — @firebase/rules-unit-testing's `.firestore()` returns a compat Firestore instance (its own
// public_types/index.d.ts), so tests reach for the compat FieldValue instead of importing the
// modular 'firebase/firestore' package a second time under a different SDK surface.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import firebaseCompat from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { setup } from './_env.js';

let E;
before(async () => { E = await setup(); });
after(async () => { await E?.testEnv?.cleanup(); });

const serverTs = () => firebaseCompat.firestore.FieldValue.serverTimestamp();
const validReport = () => ({ message: 'TypeError: x is not a function', url: 'https://example.com/about.html', ua: 'Mozilla/5.0', stack: 'at foo (about.js:12)', at: serverTs() });

test('errors: anon create with a valid bounded shape succeeds', async () => {
  await assertSucceeds(E.anon.firestore().collection('errors').add(validReport()));
});

test('errors: oversized message fails', async () => {
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), message: 'x'.repeat(501) }));
});

test('errors: oversized url/ua/stack each fail', async () => {
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), url: 'x'.repeat(301) }));
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), ua: 'x'.repeat(301) }));
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), stack: 'x'.repeat(2001) }));
});

test('errors: an extra key fails', async () => {
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), extra: 'nope' }));
});

test('errors: a missing field or wrong type fails', async () => {
  const { message, ...noMessage } = validReport();
  await assertFails(E.anon.firestore().collection('errors').add(noMessage));
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), message: 42 }));
});

test('errors: a client-supplied literal `at` (not request.time) fails', async () => {
  await assertFails(E.anon.firestore().collection('errors').add({ ...validReport(), at: new Date() }));
});

test('errors: anon read fails; admin read succeeds; update always fails', async () => {
  const ref = await E.admin.firestore().collection('errors').add(validReport());
  await assertFails(E.anon.firestore().doc(`errors/${ref.id}`).get());
  await assertFails(E.anon.firestore().collection('errors').get());
  await assertSucceeds(E.admin.firestore().doc(`errors/${ref.id}`).get());
  await assertSucceeds(E.admin.firestore().collection('errors').get());
  await assertFails(E.admin.firestore().doc(`errors/${ref.id}`).update({ message: 'edited' }));
});

// Final-review fix wave I6: unlike `audit` (append-only forever), `errors` is now admin-deletable
// — the one deliberate asymmetry firestore.rules' own comment on this collection explains.
test('errors: anon delete fails; admin delete succeeds (item 42/I6 asymmetry from `audit`)', async () => {
  const anonRef = await E.admin.firestore().collection('errors').add(validReport());
  await assertFails(E.anon.firestore().doc(`errors/${anonRef.id}`).delete());

  const adminRef = await E.admin.firestore().collection('errors').add(validReport());
  await assertSucceeds(E.admin.firestore().doc(`errors/${adminRef.id}`).delete());
  const gone = await E.admin.firestore().doc(`errors/${adminRef.id}`).get();
  assert.equal(gone.exists, false);
});
