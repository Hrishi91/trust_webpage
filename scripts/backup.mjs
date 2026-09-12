#!/usr/bin/env node
// scripts/backup.mjs — Phase 7 Task 7 (site-basics audit item 43): scheduled automated backup.
// Run by .github/workflows/backup.yml (weekly cron + workflow_dispatch); can also be run locally
// (`FIREBASE_SA=$(cat sa.json) BACKUP_PASSPHRASE=... node scripts/backup.mjs`) against a real
// project's own service account. Exports every collection/doc admin/js/sections/export-colls.js's
// COLLS/DOCS already track for the manual 📤 ব্যাকআপ export (reused, not retyped, so the two can
// never disagree — same "single source of truth" discipline as scripts/sync-head.mjs/bump-sw.mjs)
// to a dated `backup-<YYYY-MM-DD>.json.enc`, uploaded as a workflow artifact (90-day retention) by
// the caller.
//
// Final-review fix wave C1: this repo is PUBLIC. A GitHub Actions artifact inherits the
// repository's own visibility — there is no separate ACL — so an un-encrypted export would have
// published members' phone-linked ids, hidden donations, notices/roster, non-public committee
// rows and client error reports to anyone on the internet. The export is therefore encrypted
// (AES-256-GCM, key = scrypt(BACKUP_PASSPHRASE, random salt)) in memory before anything ever
// touches disk — plaintext JSON is never written. `scripts/backup-decrypt.mjs` reverses it with
// the same passphrase. `.github/workflows/backup.yml` also refuses to even reach this script on a
// public repo unless the owner has explicitly opted in (its own job-level guard step) — this
// script's own refusal below is the second, independent layer, not a substitute for that one.
//
// Never prints FIREBASE_SA or BACKUP_PASSPHRASE themselves — only reads them once. Refuses to run
// without either: exits 0 when BACKUP_OPTIONAL=1 (the workflow always sets this, so a repo with a
// secret not yet added gets a clear skipped run instead of a red X), exits 1 otherwise (a local
// run with no secret set should fail loudly, not silently do nothing or — worse — write plaintext).
//
// main() only runs when this file is executed directly (checked at the bottom, same guard
// scripts/bump-sw.mjs uses) — tests/unit/backup.test.js imports `backupFilename`/`planRun`/
// `planEncryption`/`encrypt`/`decrypt` directly without ever calling main(), so the admin SDK is
// imported (safe, no I/O) but never initialized under `node --test`.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLS, DOCS } from '../admin/js/sections/export-colls.js';

const SALT_LEN = 16, IV_LEN = 12, KEY_LEN = 32; // AES-256-GCM: 32-byte key, 12-byte iv (NIST-recommended), 16-byte auth tag (createCipheriv's default)

/** Pure: the dated output filename for `date` (defaults to now), 'backup-YYYY-MM-DD.json' — the
 * plaintext-shaped name; main() appends '.enc' at the write call site since the file on disk is
 * never plaintext (the '.json' name still describes what's inside once decrypted). */
export function backupFilename(date = new Date()) {
  return `backup-${date.toISOString().slice(0, 10)}.json`;
}

/** AES-256-GCM encrypt: random salt+iv prepended to the auth tag + ciphertext, so
 * `decrypt()` needs only the passphrase and this one buffer — nothing else to keep in sync. */
export function encrypt(plaintext, passphrase) {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(passphrase, salt, KEY_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), ciphertext]);
}

/** Reverses encrypt() with the same passphrase. Throws (a bad passphrase or corrupted/truncated
 * file fails GCM's auth-tag check) rather than ever returning tampered/garbage plaintext. */
export function decrypt(encrypted, passphrase) {
  const salt = encrypted.subarray(0, SALT_LEN);
  const iv = encrypted.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = encrypted.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
  const ciphertext = encrypted.subarray(SALT_LEN + IV_LEN + 16);
  const key = scryptSync(passphrase, salt, KEY_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
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

/** Pure: same shape as planRun(), gating on BACKUP_PASSPHRASE instead — a separate, independent
 * refusal reason (this repo is public; an unencrypted export must never be written, even if
 * FIREBASE_SA is present and reading Firestore would otherwise succeed). */
export function planEncryption(env) {
  if (typeof env.BACKUP_PASSPHRASE === 'string' && env.BACKUP_PASSPHRASE.trim()) return { run: true };
  const optional = env.BACKUP_OPTIONAL === '1';
  return {
    run: false,
    exitCode: optional ? 0 : 1,
    message: optional
      ? 'scripts/backup.mjs: BACKUP_PASSPHRASE secret not set — skipping this scheduled backup (BACKUP_OPTIONAL=1).'
      : 'scripts/backup.mjs: BACKUP_PASSPHRASE is not set. This repo is public — a backup is never written unencrypted. Set BACKUP_PASSPHRASE to a strong secret (see docs/user-guide/deploy.md) and re-run, or set BACKUP_OPTIONAL=1 to skip instead of failing.',
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
  // Checked before touching Firestore at all: no point spending a read quota on an export this
  // process is about to refuse to write anyway.
  const encPlan = planEncryption(process.env);
  if (!encPlan.run) {
    console.log(encPlan.message);
    process.exit(encPlan.exitCode);
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
  const encrypted = encrypt(Buffer.from(JSON.stringify(out, null, 2), 'utf8'), process.env.BACKUP_PASSPHRASE);
  const filename = `${backupFilename()}.enc`;
  writeFileSync(filename, encrypted); // encrypted bytes only — plaintext JSON never touches disk
  console.log(`scripts/backup.mjs: wrote ${filename} (encrypted, ${COLLS.length} collections, ${DOCS.length} docs).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
