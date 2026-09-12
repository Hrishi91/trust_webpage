// Phase 7 Task 7 (site-basics audit item 43): scripts/backup.mjs's pure parts — filename shaping
// and the "should this run at all" decision — tested without ever calling its main() (guarded by
// `import.meta.url === pathToFileURL(...)`, same pattern as scripts/bump-sw.mjs), so importing
// this module under plain `node --test` never touches the firebase-admin SDK's network/credential
// path even though the module itself statically imports 'firebase-admin/app'/'firestore' (safe:
// importing those packages does no I/O by itself — only initializeApp()/getFirestore() would).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupFilename, planRun, planEncryption, encrypt, decrypt } from '../../scripts/backup.mjs';

test('backupFilename: backup-YYYY-MM-DD.json from a given date, UTC', () => {
  assert.equal(backupFilename(new Date('2026-09-12T23:59:00Z')), 'backup-2026-09-12.json');
  assert.equal(backupFilename(new Date('2026-01-01T00:00:00Z')), 'backup-2026-01-01.json');
});

test('backupFilename: defaults to now when no date is given', () => {
  const name = backupFilename();
  assert.match(name, /^backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test('planRun: FIREBASE_SA present (non-empty) -> run', () => {
  assert.deepEqual(planRun({ FIREBASE_SA: '{"project_id":"x"}' }), { run: true });
});

test('planRun: FIREBASE_SA missing, BACKUP_OPTIONAL=1 -> skip with exit 0', () => {
  const plan = planRun({ BACKUP_OPTIONAL: '1' });
  assert.equal(plan.run, false);
  assert.equal(plan.exitCode, 0);
  assert.match(plan.message, /skipping/i);
});

test('planRun: FIREBASE_SA missing, BACKUP_OPTIONAL unset -> fail with exit 1', () => {
  const plan = planRun({});
  assert.equal(plan.run, false);
  assert.equal(plan.exitCode, 1);
  assert.match(plan.message, /FIREBASE_SA/);
});

test('planRun: FIREBASE_SA blank/whitespace-only counts as missing', () => {
  assert.equal(planRun({ FIREBASE_SA: '   ' }).run, false);
  assert.equal(planRun({ FIREBASE_SA: '' }).run, false);
});

test('planRun never echoes the FIREBASE_SA value itself in its message', () => {
  const secret = '{"private_key":"-----BEGIN PRIVATE KEY-----super-secret-----END PRIVATE KEY-----"}';
  const plan = planRun({ FIREBASE_SA: secret });
  assert.equal(plan.run, true);
  assert.equal('message' in plan, false);
});

// Final-review fix wave C1: BACKUP_PASSPHRASE is a second, independent refusal reason from
// FIREBASE_SA — this repo is public, so a missing passphrase must refuse even when FIREBASE_SA
// is present and reading Firestore would otherwise succeed.
test('planEncryption: BACKUP_PASSPHRASE present (non-empty) -> run', () => {
  assert.deepEqual(planEncryption({ BACKUP_PASSPHRASE: 'a strong secret' }), { run: true });
});

test('planEncryption: BACKUP_PASSPHRASE missing, BACKUP_OPTIONAL=1 -> skip with exit 0', () => {
  const plan = planEncryption({ BACKUP_OPTIONAL: '1' });
  assert.equal(plan.run, false);
  assert.equal(plan.exitCode, 0);
  assert.match(plan.message, /skipping/i);
});

test('planEncryption: BACKUP_PASSPHRASE missing, BACKUP_OPTIONAL unset -> fail with exit 1', () => {
  const plan = planEncryption({});
  assert.equal(plan.run, false);
  assert.equal(plan.exitCode, 1);
  assert.match(plan.message, /BACKUP_PASSPHRASE/);
});

test('planEncryption: BACKUP_PASSPHRASE blank/whitespace-only counts as missing', () => {
  assert.equal(planEncryption({ BACKUP_PASSPHRASE: '   ' }).run, false);
  assert.equal(planEncryption({ BACKUP_PASSPHRASE: '' }).run, false);
});

test('planEncryption never echoes the BACKUP_PASSPHRASE value itself in its message', () => {
  const plan = planEncryption({ BACKUP_PASSPHRASE: 'super-secret-passphrase' });
  assert.equal(plan.run, true);
  assert.equal('message' in plan, false);
});

test('encrypt/decrypt: round trip returns the original plaintext', () => {
  const plaintext = Buffer.from(JSON.stringify({ members: [{ id: '+919999999999' }], donations: [] }), 'utf8');
  const encrypted = encrypt(plaintext, 'correct horse battery staple');
  assert.notDeepEqual(encrypted, plaintext); // never accidentally a no-op
  assert.deepEqual(decrypt(encrypted, 'correct horse battery staple'), plaintext);
});

test('encrypt: two calls with the same plaintext+passphrase never produce the same bytes (random salt+iv)', () => {
  const plaintext = Buffer.from('same input twice', 'utf8');
  const a = encrypt(plaintext, 'p'), b = encrypt(plaintext, 'p');
  assert.notDeepEqual(a, b);
});

test('decrypt: wrong passphrase throws rather than returning garbage/tampered plaintext', () => {
  const encrypted = encrypt(Buffer.from('secret data', 'utf8'), 'right passphrase');
  assert.throws(() => decrypt(encrypted, 'wrong passphrase'));
});

test('decrypt: a truncated/corrupted file throws', () => {
  const encrypted = encrypt(Buffer.from('secret data', 'utf8'), 'p');
  const corrupted = Buffer.concat([encrypted.subarray(0, encrypted.length - 1), Buffer.from([encrypted[encrypted.length - 1] ^ 0xff])]);
  assert.throws(() => decrypt(corrupted, 'p'));
});
