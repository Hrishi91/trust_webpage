import { collection, addDoc, serverTimestamp } from '../../js/firebase.js';
export async function logAudit(ctx, action, path, before = null, after = null) {
  try {
    await addDoc(collection(ctx.db, 'audit'), {
      uid: ctx.user.uid, action, path,
      before: before ?? null, after: after ?? null, at: serverTimestamp(),
    });
  } catch (e) { console.warn('audit failed', e); }
}
