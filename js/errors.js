// js/errors.js — Item 42 (site-basics audit): reports uncaught client-side errors to a bounded
// `errors` Firestore collection (firestore.rules) so the admin can see real production errors
// (📜 লগ → ত্রুটি tab) without adding a third-party error-tracking account. Imported once from
// js/shell.js (Task 7 brief: "so every public page reports") — every public page calls
// mountShell(), so importing it there wires this up everywhere without a per-page import.
//
// Never imports js/firebase-auth.js: public pages import only js/firebase.js (CLAUDE.md's
// auth split, Phase 7 Task 4 item 31) — error reporting must work for a visitor who never signs
// in, and must not pull in the 41 KB Auth SDK chunk just to report a crash.
import { db, collection, addDoc, serverTimestamp, IS_LOCAL } from './firebase.js';

const MAX_REPORTS_PER_LOAD = 5;
let sent = 0;

/** Pure-ish (no I/O): the `url` field's shape — origin+pathname only, no query/hash, bounded to
 * firestore.rules' 300-char cap. Query strings can carry incidental PII (e.g. a reset token). */
function reportUrl() {
  return `${location.origin}${location.pathname}`.slice(0, 300);
}

function clip(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

async function report(message, stack) {
  if (sent >= MAX_REPORTS_PER_LOAD) return;
  sent++;
  try {
    await addDoc(collection(db, 'errors'), {
      message: clip(message == null ? 'Unknown error' : String(message), 500) || 'Unknown error',
      url: reportUrl(),
      ua: clip(navigator.userAgent, 300),
      stack: clip(stack == null ? '' : String(stack), 2000),
      at: serverTimestamp(),
    });
  } catch (err) {
    // Never throws itself — a failed error report must not become a second error, and rules can
    // legitimately deny this (e.g. App Check enforcement later); just note it and move on.
    console.warn('[errors] report failed', err);
  }
}

// Dev/e2e default is unchanged: localhost visits (including every existing e2e test, none of
// which expects an `errors` write) don't report unless a test opts in with `?errors=1` — same
// opt-in pattern js/sw-register.js uses for `?sw=1`.
const enabled = !IS_LOCAL || new URLSearchParams(location.search).has('errors');
if (enabled) {
  window.addEventListener('error', e => {
    try { report(e.message, e.error?.stack); } catch { /* never throw */ }
  });
  window.addEventListener('unhandledrejection', e => {
    try { report(e.reason?.message ?? String(e.reason), e.reason?.stack); } catch { /* never throw */ }
  });
}
