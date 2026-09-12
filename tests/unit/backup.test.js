// Phase 7 Task 7 (site-basics audit item 43): scripts/backup.mjs's pure parts — filename shaping
// and the "should this run at all" decision — tested without ever calling its main() (guarded by
// `import.meta.url === pathToFileURL(...)`, same pattern as scripts/bump-sw.mjs), so importing
// this module under plain `node --test` never touches the firebase-admin SDK's network/credential
// path even though the module itself statically imports 'firebase-admin/app'/'firestore' (safe:
// importing those packages does no I/O by itself — only initializeApp()/getFirestore() would).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupFilename, planRun } from '../../scripts/backup.mjs';

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
