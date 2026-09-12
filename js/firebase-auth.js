// Auth entry point — imported only by the pages that actually sign someone in
// (js/pages/members.js, admin/js/admin.js). Split out of js/firebase.js (Phase 7 Task 4, item 31,
// site-basics audit: "load firebase-auth only where used") so index/about/donate/events/... never
// fetch the firebase-auth.js SDK chunk (41 KB) or pay for an initializeAuth() call they don't need.
import {
  initializeAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, browserLocalPersistence,
  RecaptchaVerifier, signInWithPhoneNumber, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { app, IS_LOCAL } from './firebase.js';

// Persistence is fixed at construction (not set post-hoc) so every tab — admin or public — uses
// the same backend from the first instant Auth exists. getAuth() defaults to
// indexedDBLocalPersistence; a page that later called setPersistence(browserLocalPersistence) left
// a window where a second same-origin tab could initialise Auth against the default IndexedDB
// backend before the switch happened. The SDK's cross-tab persistence sync then cleared the first
// tab's session outright — onAuthStateChanged(null) fired there with no error, no isAdmin() call,
// no network request (reproduced with Playwright: /admin/ login, then open committee.html in the
// same context — #adm-main.hidden flipped true and auth.currentUser went null within ~1s and
// stayed null). initializeAuth's persistence option applies before any tab can race ahead of it.
export const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: undefined });

if (IS_LOCAL) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

export {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential,
  EmailAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, sendPasswordResetEmail,
};

// Item 38 (?preview=1 branches on public pages): resolves once Auth's first onAuthStateChanged
// tick fires. Restoring a persisted admin session from browserLocalPersistence is asynchronous
// even though localStorage itself is synchronous — the SDK always fires at least one
// onAuthStateChanged tick later — so a preview branch that queries Firestore immediately after
// `await import('./firebase-auth.js')` can race that restore and reach Firestore with no ID token
// attached. A LIST query (getDocs on a collection, or onSnapshot) with no `published` filter then
// looks unsafe to the rules engine for an unauthenticated reader and firestore rejects the whole
// query outright — not just the rows that would've failed. Awaiting this after the dynamic import
// guarantees the session (or its genuine absence) is resolved before the query ever fires.
export function authReady() {
  return new Promise(resolve => { const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); }); });
}
