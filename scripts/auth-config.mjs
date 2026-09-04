#!/usr/bin/env node
// Owner-run: enables phone-auth sign-in and merges the site's authorized domains on the
// production Identity Toolkit config. Uses the same owner-OAuth REST pattern as the earlier
// (uncommitted) Phase-1 one-off scripts: firebase-tools' own refresh token, exchanged against
// its public OAuth client (embedded in the CLI source, not a project secret) — no service
// account key touches disk. This script IS committed, unlike its predecessors, because it must
// be re-run whenever the site's custom domain changes (see docs/user-guide/deploy.md).
//
// Never logs an access/refresh token, and never logs a test-number's OTP code — only the number
// itself. Refuses to run if `firebase login` hasn't been done.
//
// Flags:
//   --domain <hostname>       merge one extra authorized domain (e.g. the custom domain)
//   --with-test-number        merge the fixed demo test number ({TEST_NUMBER: TEST_CODE}) into
//                              testPhoneNumbers. Without this flag the script does NOT touch
//                              existing testPhoneNumbers at all — it neither adds nor removes.
//   --remove-test-number      remove TEST_NUMBER from testPhoneNumbers (go-live step, before
//                              real members are loaded). If both flags are given, removal wins.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isHostname } from './lib/hostname.mjs';
import { parseArgs } from './lib/args.mjs';

const FIREBASE_TOOLS_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_TOOLS_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const TEST_NUMBER = '+919999999999';
const TEST_CODE = '123456';

const args = parseArgs(process.argv.slice(2));

const configstorePath = join(homedir(), '.config/configstore/firebase-tools.json');
let configstore;
try {
  configstore = JSON.parse(readFileSync(configstorePath, 'utf8'));
} catch {
  console.error(`auth-config: no firebase-tools login found at ${configstorePath}. Run "firebase login" first.`);
  process.exit(1);
}
const refreshToken = configstore?.tokens?.refresh_token;
if (!refreshToken) {
  console.error('auth-config: firebase-tools.json has no tokens.refresh_token. Run "firebase login" first.');
  process.exit(1);
}

let firebaserc;
try {
  firebaserc = JSON.parse(readFileSync(join(process.cwd(), '.firebaserc'), 'utf8'));
} catch {
  console.error('auth-config: could not read .firebaserc in the current directory. Run this from the repo root.');
  process.exit(1);
}
const projectId = firebaserc?.projects?.default;
if (!projectId) {
  console.error('auth-config: could not read projects.default from .firebaserc.');
  process.exit(1);
}
// The Firebase-hosted domains are always <projectId>.firebaseapp.com / <projectId>.web.app;
// the GitHub Pages domain isn't derivable from the project id, so it stays a literal.
const BASE_DOMAINS = ['localhost', `${projectId}.firebaseapp.com`, `${projectId}.web.app`, 'hrishi91.github.io'];

// Extra domain for the future custom domain, e.g. --domain trust.example.org. Validated as a
// bare hostname (no scheme/path/port) before anything touches the network or production config —
// a malformed or malicious value here must never reach an authorizedDomains write.
let extraDomain = null;
if (args.domain !== null) {
  extraDomain = args.domain;
  if (extraDomain === undefined) {
    console.error('auth-config: --domain requires a value, e.g. --domain example.org');
    process.exit(1);
  }
  if (!isHostname(extraDomain)) {
    console.error('auth-config: --domain must be a bare hostname, e.g. example.org');
    process.exit(1);
  }
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: FIREBASE_TOOLS_CLIENT_ID,
      client_secret: FIREBASE_TOOLS_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    console.error(`auth-config: token refresh failed (${res.status}).`);
    process.exit(1);
  }
  const body = await res.json();
  if (!body.access_token) {
    console.error('auth-config: token refresh response had no access_token.');
    process.exit(1);
  }
  return body.access_token;
}

const accessToken = await getAccessToken();
const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

const getRes = await fetch(configUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!getRes.ok) {
  console.error(`auth-config: GET config failed (${getRes.status}): ${await getRes.text()}`);
  process.exit(1);
}
const current = await getRes.json();

const existingDomains = current.authorizedDomains ?? [];
const wantedDomains = [...BASE_DOMAINS, ...(extraDomain ? [extraDomain] : [])];
const mergedDomains = [...new Set([...existingDomains, ...wantedDomains])];

// Default: leave testPhoneNumbers exactly as it is on the server — this script must never
// silently re-add a test number that an earlier --remove-test-number run (or a manual console
// edit) took out. Only an explicit flag changes it; if both are given, removal wins (the safer
// default when someone passes both by mistake right before real members are loaded).
const existingTestNumbers = current.signIn?.phoneNumber?.testPhoneNumbers ?? {};
const mergedTestNumbers = { ...existingTestNumbers };
if (args.withTestNumber) mergedTestNumbers[TEST_NUMBER] = TEST_CODE;
if (args.removeTestNumber) delete mergedTestNumbers[TEST_NUMBER];

const patchBody = {
  signIn: { phoneNumber: { enabled: true, testPhoneNumbers: mergedTestNumbers } },
  authorizedDomains: mergedDomains,
};

const patchRes = await fetch(`${configUrl}?updateMask=signIn.phoneNumber,authorizedDomains`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});
if (!patchRes.ok) {
  console.error(`auth-config: PATCH config failed (${patchRes.status}): ${await patchRes.text()}`);
  process.exit(1);
}
const updated = await patchRes.json();

console.log(`auth-config: project ${projectId}`);
console.log(`  signIn.phoneNumber.enabled = ${updated.signIn?.phoneNumber?.enabled}`);
// Numbers only, never the OTP codes — this is a plain console.log a shared terminal/CI log
// could capture, and the codes are meant to stay a secret between the script and Firebase.
console.log('  testPhoneNumbers (numbers only):', Object.keys(updated.signIn?.phoneNumber?.testPhoneNumbers ?? {}));
console.log('  authorizedDomains:', updated.authorizedDomains ?? []);
