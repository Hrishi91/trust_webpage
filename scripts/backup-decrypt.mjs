#!/usr/bin/env node
// scripts/backup-decrypt.mjs — final-review fix wave C1: reverses scripts/backup.mjs's
// AES-256-GCM encryption of a downloaded `backup-<date>.json.enc` workflow artifact, given the
// same BACKUP_PASSPHRASE the workflow used. Never prints the passphrase; never prints plaintext
// to stdout — it always writes a file, so a Firestore export (which can contain member phone
// numbers, notices, donation records) never lands in a terminal scrollback/log.
//
// Usage:
//   BACKUP_PASSPHRASE=... node scripts/backup-decrypt.mjs backup-2026-09-13.json.enc [out.json]
// `out` defaults to the input path with its trailing '.enc' removed.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { decrypt } from './backup.mjs';

function main() {
  const [, , inputPath, outPath] = process.argv;
  if (!inputPath) {
    console.error('Usage: BACKUP_PASSPHRASE=<passphrase> node scripts/backup-decrypt.mjs <backup-file.json.enc> [out.json]');
    process.exit(1);
  }
  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (!passphrase || !passphrase.trim()) {
    console.error('scripts/backup-decrypt.mjs: BACKUP_PASSPHRASE is not set.');
    process.exit(1);
  }
  const encrypted = readFileSync(inputPath);
  let plaintext;
  try {
    plaintext = decrypt(encrypted, passphrase);
  } catch {
    console.error('scripts/backup-decrypt.mjs: decryption failed — wrong BACKUP_PASSPHRASE, or the file is corrupted/truncated.');
    process.exit(1);
  }
  const out = outPath || inputPath.replace(/\.enc$/, '');
  writeFileSync(out, plaintext);
  console.log(`scripts/backup-decrypt.mjs: wrote ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
