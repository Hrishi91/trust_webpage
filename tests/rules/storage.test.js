import { test, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setup } from './_env.js';

let E;
before(async () => { E = await setup(); });
after(async () => { await E.testEnv.cleanup(); });

const png = new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]);
const meta = { contentType: 'image/png' };

// Deviation from the brief: @firebase/rules-unit-testing v5's context.storage() returns a
// *compat* Storage instance (it internally calls `this.getApp().storage(...)`, and getApp()
// is a compat FirebaseApp — confirmed in node_modules/@firebase/rules-unit-testing/dist/index.cjs.js).
// The modular `ref`/`uploadBytes`/`getBytes`/`deleteObject` functions from 'firebase/storage'
// reject a compat Storage instance, so this file uses the compat Reference API
// (`storage().ref(path).put(...)`, `.getMetadata()`, `.delete()`) with the same assertions.

test('storage: anon cannot write, admin can; anyone reads public/', async () => {
  await assertFails(E.anon.storage().ref('public/a.png').put(png, meta));
  await assertFails(E.other.storage().ref('public/a.png').put(png, meta));
  await assertSucceeds(E.admin.storage().ref('public/a.png').put(png, meta));
  await assertSucceeds(E.anon.storage().ref('public/a.png').getMetadata());
});

test('storage: content type and size enforced', async () => {
  await assertFails(E.admin.storage().ref('public/x.exe').put(png, { contentType: 'application/x-msdownload' }));
  await assertSucceeds(E.admin.storage().ref('public/doc.pdf').put(png, { contentType: 'application/pdf' }));
  const big = new Uint8Array(5 * 1024 * 1024 + 1);
  await assertFails(E.admin.storage().ref('public/big.png').put(big, meta));
});

test('storage: outside public/ is dead even for admin', async () => {
  await assertFails(E.admin.storage().ref('private/a.png').put(png, meta));
  // getMetadata() on a nonexistent object throws object-not-found, not permission-denied,
  // and assertFails only recognizes permission-denied. Seed the object with rules disabled first.
  await E.seed((db, storage) => storage.ref('private/a.png').put(png, meta));
  await assertFails(E.anon.storage().ref('private/a.png').getMetadata());
});

test('storage: only admin deletes', async () => {
  await assertSucceeds(E.admin.storage().ref('public/del.png').put(png, meta));
  await assertFails(E.other.storage().ref('public/del.png').delete());
  await assertSucceeds(E.admin.storage().ref('public/del.png').delete());
});
