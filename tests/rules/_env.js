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
  // The admin gate is a doc, so seed it with rules off.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await ctx.firestore().doc(`admins/${ADMIN_UID}`).set({ createdAt: new Date() });
  });
  return {
    testEnv,
    anon: testEnv.unauthenticatedContext(),
    admin: testEnv.authenticatedContext(ADMIN_UID, { email: 'admin@example.com', email_verified: true }),
    other: testEnv.authenticatedContext(OTHER_UID, { email: 'x@example.com' }),
    seed: fn => testEnv.withSecurityRulesDisabled(ctx => fn(ctx.firestore(), ctx.storage())),
  };
}
