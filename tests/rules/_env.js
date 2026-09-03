import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT = 'demo-trust';
export const ADMIN_UID = 'admin-uid-1';
export const OTHER_UID = 'other-uid-2';

export async function setup() {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
  // The admin gate is a doc, so seed it with rules off.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await ctx.firestore().doc(`admins/${ADMIN_UID}`).set({ createdAt: new Date() });
    await ctx.firestore().doc('members/+919999999999').set({ name: { bn: 'ম', en: 'M' }, role: { bn: '', en: '' }, pledge: 5000, payments: [], active: true, deleted: false, order: 1 });
    await ctx.firestore().doc('members/+918888888888').set({ name: { bn: 'অ', en: 'O' }, role: { bn: '', en: '' }, pledge: 1000, payments: [], active: true, deleted: false, order: 2 });
    await ctx.firestore().doc('members/+917777777777').set({ name: { bn: 'ই', en: 'I' }, role: { bn: '', en: '' }, pledge: 0, payments: [], active: false, deleted: false, order: 3 });
  });
  return {
    testEnv,
    anon: testEnv.unauthenticatedContext(),
    admin: testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com', email_verified: true }),
    // Same uid as the admin — the admins/{uid} doc exists either way — only the email_verified
    // claim differs, so this isolates the verified-email gate from the admins-doc gate.
    unverified: testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com', email_verified: false }),
    other: testEnv.authenticatedContext(OTHER_UID, { email: 'x@example.com' }),
    member: testEnv.authenticatedContext('member-uid-1', { phone_number: '+919999999999' }),
    otherMember: testEnv.authenticatedContext('member-uid-2', { phone_number: '+918888888888' }),
    inactive: testEnv.authenticatedContext('member-uid-3', { phone_number: '+917777777777' }),
    seed: fn => testEnv.withSecurityRulesDisabled(ctx => fn(ctx.firestore(), ctx.storage())),
  };
}
