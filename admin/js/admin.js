import { db, storage, doc, getDoc } from '../../js/firebase.js';
import {
  auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail,
} from '../../js/firebase-auth.js';
import { t, getLang, setLang, onLangChange, pick, setOverrides } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
import { resolveTheme, applyTheme, applyOverrides } from '../../js/theme.js';
import { getContent } from '../../js/content.js';
// sections/registerSection live in registry.js, not here — see that file for why:
// admin.js and every section file reference each other, and keeping the Map directly in
// this module makes a section's top-level registerSection() call crash (or, with a
// dynamic import, deadlock) on the circular reference back into this module.
import { sections, registerSection } from './registry.js';
export { registerSection };

const $ = id => document.getElementById(id);
// Admin follows the theme AND the string/colour/font overrides chosen in ✏️ লেখা / 🎨 ডিজাইন —
// its own labels are editable too (spec §1: "the only truly fixed text is the login form before
// any data loads"). settings/site and content/{strings,media} are all publicly readable, so this
// runs before login. onAuthStateChanged's route() below may resolve first (it does not wait on
// this promise) — acceptable, per the brief: labels/colours simply update on the next route().
Promise.all([getDoc(doc(db, 'settings', 'site')), getContent()]).then(([snap, c]) => {
  setOverrides(c.strings);
  applyTheme(resolveTheme(snap.data()?.design));
  applyOverrides(snap.data()?.designOverrides, snap.data()?.fonts);
  applyStrings();
  // route() may already have rendered a section (with pre-override strings) before this promise
  // settled — re-render it now so it picks up the overrides too. Guarded on `user`: before auth
  // resolves there is nothing routed yet (#adm-main is empty/hidden), and route() itself no-ops
  // without a user, so calling it early would be a silent, misleading no-op rather than a real skip.
  if (user) route();
}).catch(err => console.warn('[admin] theme', err));
let user = null;

function applyStrings() {
  document.querySelectorAll('[data-t]').forEach(n => { n.textContent = t(n.dataset.t); });
  $('adm-lang').textContent = getLang() === 'bn' ? 'EN' : 'বাং';
  $('adm-logout').textContent = t('admin.logout');
}
$('adm-lang').onclick = () => setLang(getLang() === 'bn' ? 'en' : 'bn');
onLangChange(() => { applyStrings(); route(); });

$('adm-login-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('adm-login-err').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
  } catch (err) {
    $('adm-login-err').textContent = err.code === 'auth/too-many-requests' ? t('admin.tooMany') : t('admin.loginFailed');
  }
};
$('adm-logout').onclick = () => signOut(auth);

// Item 36: forgot-password link on the login form — sendPasswordResetEmail with whatever email
// is currently in the form field (no separate lookup; a non-existent-account error from Firebase
// is intentionally indistinguishable from success in the UI so this can't be used to probe
// emails). Final-review fix wave I2: EVERY outcome past the empty-field guard collapses to the
// same success toast, matching this comment's own stated intent — a caught Firebase error
// (including 'auth/user-not-found') used to surface a distinct "couldn't send" toast, which is
// exactly the signal that lets someone probe whether an email has an admin account. console.warn
// logs that something failed, for our own diagnosis, but never the email address itself (the
// point of the fix is that the *user-visible* outcome carries no signal, not that we can't debug).
$('adm-forgot').onclick = async e => {
  e.preventDefault();
  const email = new FormData($('adm-login-form')).get('email');
  if (!email) { toast(t('common.error'), 'err'); return; }
  const link = e.currentTarget; link.style.pointerEvents = 'none';
  try { await sendPasswordResetEmail(auth, email); }
  catch (err) { console.warn('[admin] resetPassword', err); }
  finally { link.style.pointerEvents = ''; toast(t('admin.resetSent')); }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Only a real "not an admin" (Firestore denies the read) should sign the admin out. Any other
// error — e.g. a transient 'unavailable'/'failed-precondition' during Firestore's multi-tab
// primary-lease handoff — gets one retry, then is treated as "can't tell right now" rather than
// "not admin": it keeps the session and surfaces a generic error instead of logging the admin out.
async function isAdmin(u) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return { ok: true, admin: (await getDoc(doc(db, 'admins', u.uid))).exists() }; }
    catch (err) {
      if (err && err.code === 'permission-denied') return { ok: true, admin: false };
      if (attempt === 0) { await sleep(500); continue; }
    }
  }
  return { ok: false, admin: false }; // both attempts failed with a non-permission-denied error
}

onAuthStateChanged(auth, async u => {
  applyStrings();
  if (!u) { user = null; $('adm-login').hidden = false; $('adm-main').hidden = true; $('adm-logout').hidden = true; return; }
  if (user && u.uid === user.uid) return; // already verified in this tab; don't re-run the gate on a spurious re-fire
  const { ok, admin } = await isAdmin(u);
  if (ok && !admin) { toast(t('admin.notAdmin'), 'err'); await signOut(auth); return; }
  // Couldn't verify (both attempts failed with a non-permission-denied error): don't sign out, but
  // don't leave the admin staring at a blank page either — #adm-login and #adm-main are both
  // `hidden` by default in the HTML, and neither branch below this one has run yet, so without
  // this the page shows nothing at all. Show the login form (Auth still has a session; retrying
  // sign-in or reloading is the recoverable path) with the error surfaced.
  if (!ok) { $('adm-login').hidden = false; $('adm-main').hidden = true; toast(t('common.error'), 'err'); return; }
  user = u;
  $('adm-login').hidden = true; $('adm-main').hidden = false; $('adm-logout').hidden = false;
  route();
});

/** Ask for the password again before a sensitive action. Resolves true on success.
 * Item 39: a masked <dialog> (admin/index.html #reauth-dialog), not window.prompt() — prompt()
 * shows the password in clear text on a phone screen. showModal()/close() round-trips through a
 * Promise the same way prompt() used to, so every existing reauth() caller is unchanged. */
function reauth() {
  const dialog = $('reauth-dialog');
  const input = dialog.querySelector('input[type=password]');
  input.value = '';
  // Fix round 1 (finding 2): Cancel is a plain button now (see admin/index.html's comment on
  // #reauth-dialog) — it has no native submit behaviour, so it must close the dialog itself.
  // Reassigning .onclick each call is idempotent (no listener pile-up across repeated reauth()s).
  dialog.querySelector('#reauth-cancel').onclick = () => dialog.close('cancel');
  return new Promise(resolve => {
    const onClose = async () => {
      dialog.removeEventListener('close', onClose);
      // Final-review fix wave M7: read the password out, then clear the input immediately — on
      // every outcome (cancel, wrong password, success), not just success — so it never sits in
      // the DOM/memory after the dialog closes, waiting for whoever opens devtools next.
      const password = input.value;
      input.value = '';
      if (dialog.returnValue !== 'confirm' || !password) { resolve(false); return; }
      try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)); resolve(true); }
      catch { toast(t('admin.wrongPassword'), 'err'); resolve(false); }
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

const ctx = () => ({ db, storage, user, lang: getLang(), navigate: h => { location.hash = h; }, reauth });

// Item 37: "?" help link — one element in the top bar (shared by the dashboard and every section,
// since #adm-title is also shared that way) whose href tracks the current route. Anchors match the
// section key (e.g. #export, #log); docs/user-guide/admin-guide.md gets matching headings in
// Task 8 — see task-6-report.md for the full anchor list this points at.
const GUIDE = 'https://github.com/Hrishi91/trust_webpage/blob/main/docs/user-guide/admin-guide.md';

function dashboard() {
  const grid = el('div', { class: 'grid' });
  for (const [key, def] of sections) {
    grid.append(el('a', { class: 'card tile', href: `#${key}` },
      el('span', { class: 'icon', text: def.icon }), el('span', { text: def.titleKey ? t(def.titleKey) : pick(def.title) })));
  }
  return grid;
}

async function route() {
  if (!user) return;
  const main = $('adm-main'); main.replaceChildren();
  const key = location.hash.replace(/^#/, '').split('/')[0];
  const def = sections.get(key);
  $('adm-title').textContent = def ? (def.titleKey ? t(def.titleKey) : pick(def.title)) : 'Admin';
  $('adm-help').href = `${GUIDE}#${key || 'dashboard'}`;
  if (!def) { main.append(dashboard()); return; }
  main.append(el('a', { class: 'back', href: '#', text: '‹ ' + t('admin.dashboard') }));
  const box = el('div'); main.append(box);
  try { await def.render(box, ctx()); }
  catch (err) { console.error(err); box.replaceChildren(el('p', { class: 'err', text: t('common.error') })); toast(t('common.error'), 'err'); }
}
window.addEventListener('hashchange', route);

// Sections register themselves on import (order = dashboard order).
import './sections/announcements.js'; // Phase 3
import './sections/settings.js'; // Task 9
import './sections/design.js'; // Phase 5
import './sections/strings.js'; // Phase 6 Task 4
import './sections/media.js'; // Phase 6 Task 5
import './sections/culture.js'; // Phase 6 Task 5
import './sections/pages.js'; // Phase 7 Task 1
import './sections/log.js'; // Phase 7 Task 6 (item 34) — 18th tile
import './sections/history.js'; // Task 15
import './sections/committee.js'; // Task 16
import './sections/albums.js'; // Task 18
import './sections/events.js'; // Task 19
import './sections/export.js'; // Task 19
import './sections/donations.js'; // Phase 2
import './sections/transparency.js'; // Phase 2
import './sections/members.js'; // Phase 4
import './sections/notices.js'; // Phase 4
import './sections/roster.js'; // Phase 4
