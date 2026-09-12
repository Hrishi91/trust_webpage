#!/usr/bin/env node
// scripts/backup.mjs — Phase 7 Task 7 (site-basics audit item 43): scheduled automated backup.
// Run by .github/workflows/backup.yml (weekly cron + workflow_dispatch); can also be run locally
// (`FIREBASE_SA=$(cat sa.json) node scripts/backup.mjs`) against a real project's own service
// account. Exports every collection/doc admin/js/sections/export-colls.js's COLLS/DOCS already
// track for the manual 📤 ব্যাকআপ export (reused, not retyped, so the two can never disagree —
// same "single source of truth" discipline as scripts/sync-head.mjs/bump-sw.mjs) to a dated
// `backup-<YYYY-MM-DD>.json`, uploaded as a workflow artifact (90-day retention) by the caller.
//
// Never prints FIREBASE_SA itself — only reads it once to build a service-account credential.
// Refuses to run without it: exits 0 when BACKUP_OPTIONAL=1 (the workflow always sets this, so a
// repo with the secret not yet added gets a clear skipped run instead of a red X), exits 1
// otherwise (a local run with no secret set should fail loudly, not silently do nothing).
//
// main() only runs when this file is executed directly (checked at the bottom, same guard
// scripts/bump-sw.mjs uses) — tests/unit/backup.test.js imports `backupFilename`/`planRun`
// directly without ever calling main(), so the admin SDK is imported (safe, no I/O) but never
// initialized under `node --test`.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLS, DOCS } from '../admin/js/sections/export-colls.js';

/** Pure: the dated output filename for `date` (defaults to now), 'backup-YYYY-MM-DD.json'. */
export function backupFilename(date = new Date()) {
  return `backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Pure: decide whether to run at all, given the process environment — no I/O, no admin SDK.
 * `{ run: true }` when FIREBASE_SA looks present; otherwise `{ run: false, exitCode, message }`
 * so the caller knows both what to print and how to exit (0 when BACKUP_OPTIONAL=1, else 1). */
export function planRun(env) {
  if (typeof env.FIREBASE_SA === 'string' && env.FIREBASE_SA.trim()) return { run: true };
  const optional = env.BACKUP_OPTIONAL === '1';
  return {
    run: false,
    exitCode: optional ? 0 : 1,
    message: optional
      ? 'scripts/backup.mjs: FIREBASE_SA secret not set — skipping this scheduled backup (BACKUP_OPTIONAL=1).'
      : 'scripts/backup.mjs: FIREBASE_SA is not set. Export it (a Firestore-read-only service account\'s JSON key — see docs/user-guide/deploy.md) and re-run, or set BACKUP_OPTIONAL=1 to skip instead of failing.',
  };
}

async function exportAll(db) {
  const out = { exportedAt: new Date().toISOString() };
  for (const p of DOCS) {
    const [c, id] = p.split('/');
    const snap = await db.doc(`${c}/${id}`).get();
    out[p] = snap.exists ? snap.data() : null;
  }
  for (const c of COLLS) {
    if (c === 'photos') continue; // albums/{id}/photos — nested per-album just below, not a root collection
    const snap = await db.collection(c).get();
    out[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  for (const a of out.albums ?? []) {
    const photos = await db.collection('albums').doc(a.id).collection('photos').get();
    a.photos = photos.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return out;
}

async function main() {
  const plan = planRun(process.env);
  if (!plan.run) {
    console.log(plan.message);
    process.exit(plan.exitCode);
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SA);
  } catch {
    console.error('scripts/backup.mjs: FIREBASE_SA is not valid JSON.');
    process.exit(1);
  }
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);
  const out = await exportAll(db);
  const filename = backupFilename();
  writeFileSync(filename, JSON.stringify(out, null, 2));
  console.log(`scripts/backup.mjs: wrote ${filename} (${COLLS.length} collections, ${DOCS.length} docs).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
