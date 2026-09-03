// Single Firebase entry point. Every other module imports from here — never from gstatic directly.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {
  initializeAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  getStorage, connectStorageEmulator, ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';
import { firebaseConfig, APPCHECK_SITE_KEY } from './firebase-config.js';

export const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

// Emulators are started with --project demo-trust (package.json); the seed and rules tests write there too.
// singleProjectMode does not merge namespaces, so the real projectId would see an empty database locally.
const config = IS_LOCAL ? { ...firebaseConfig, projectId: 'demo-trust' } : firebaseConfig;
export const app = initializeApp(config);

if (IS_LOCAL) {
  // Emulator runs have no App Check; debug token keeps the SDK quiet.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
} else if (APPCHECK_SITE_KEY && APPCHECK_SITE_KEY !== 'PASTE') {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}

// Repeat visits paint from cache; persistentLocalCache is the SDK-12 replacement
// for the deprecated enableIndexedDbPersistence.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
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
export const storage = getStorage(app);

if (IS_LOCAL) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp, writeBatch,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential,
  EmailAuthProvider,
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
};
