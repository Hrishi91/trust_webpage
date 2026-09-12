// Single Firebase entry point for app/Firestore/Storage — every module that doesn't need Auth
// imports from here, never from gstatic directly. Auth lives in js/firebase-auth.js instead
// (Phase 7 Task 4, item 31): most pages never sign anyone in, so they must never pay for the
// firebase-auth.js SDK chunk (41 KB, per the site-basics audit) or an initializeAuth() call.
// Only js/pages/members.js and admin/js/admin.js import js/firebase-auth.js.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp, writeBatch, arrayUnion, deleteField,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
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
} else {
  console.warn('[firebase] App Check site key not set — do not enable enforcement');
}

// Repeat visits paint from cache; persistentLocalCache is the SDK-12 replacement
// for the deprecated enableIndexedDbPersistence.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const storage = getStorage(app);

if (IS_LOCAL) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, Timestamp, writeBatch, arrayUnion, deleteField,
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
};
