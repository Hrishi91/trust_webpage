#!/usr/bin/env node
// Owner-run: enables phone-auth sign-in and merges the site's authorized domains on the
// production Identity Toolkit config. Uses the same owner-OAuth REST pattern as the earlier
// (uncommitted) Phase-1 one-off scripts: firebase-tools' own refresh token, exchanged against
// its public OAuth client (embedded in the CLI source, not a project secret) — no service
// account key touches disk. This script IS committed, unlike its predecessors, because it must
// be re-run whenever the site's custom domain changes (see docs/user-guide/deploy.md).
//
// Never logs an access/refresh token. Refuses to run if `firebase login` hasn't been done.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const FIREBASE_TOOLS_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_TOOLS_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const TEST_PHONE_NUMBERS = { '+919999999999': '123456' };
const BASE_DOMAINS = ['localhost', 'ganesh-puja-trust.firebaseapp.com', 'ganesh-puja-trust.web.app', 'hrishi91.github.io'];

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

// Extra domain for the future custom domain, e.g. --domain trust.example.org
const domainArgIdx = process.argv.indexOf('--domain');
const extraDomain = domainArgIdx !== -1 ? process.argv[domainArgIdx + 1] : null;

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

const existingTestNumbers = current.signIn?.phoneNumber?.testPhoneNumbers ?? {};
const mergedTestNumbers = { ...existingTestNumbers, ...TEST_PHONE_NUMBERS };

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
console.log('  testPhoneNumbers:', updated.signIn?.phoneNumber?.testPhoneNumbers ?? {});
console.log('  authorizedDomains:', updated.authorizedDomains ?? []);
