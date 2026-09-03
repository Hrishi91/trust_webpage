// Must be imported before 'firebase-admin' anywhere in the seed process. ES module imports are
// hoisted above top-level statements, so setting these env vars in the same file that imports
// firebase-admin would run too late — the admin SDK reads them at import time. Importing this
// tiny module first (before any firebase-admin import) guarantees the env vars land first.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
