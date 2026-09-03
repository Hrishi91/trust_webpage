import {
  db, storage, auth, doc, getDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence,
} from '../../js/firebase.js';
import { t, getLang, setLang, onLangChange, pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
// sections/registerSection live in registry.js, not here — see that file for why:
// admin.js and every section file reference each other, and keeping the Map directly in
// this module makes a section's top-level registerSection() call crash (or, with a
// dynamic import, deadlock) on the circular reference back into this module.
import { sections, registerSection } from './registry.js';
export { registerSection };

const $ = id => document.getElementById(id);
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
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
  } catch (err) {
    $('adm-login-err').textContent = err.code === 'auth/too-many-requests' ? t('admin.tooMany') : t('admin.loginFailed');
  }
};
$('adm-logout').onclick = () => signOut(auth);

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
      return { ok: false, admin: false };
    }
  }
}

onAuthStateChanged(auth, async u => {
  applyStrings();
  if (!u) { user = null; $('adm-login').hidden = false; $('adm-main').hidden = true; $('adm-logout').hidden = true; return; }
  if (user && u.uid === user.uid) return; // already verified in this tab; don't re-run the gate on a spurious re-fire
  const { ok, admin } = await isAdmin(u);
  if (ok && !admin) { toast(t('admin.notAdmin'), 'err'); await signOut(auth); return; }
  if (!ok) { toast(t('common.error'), 'err'); return; } // couldn't verify; keep the session, don't sign out
  user = u;
  $('adm-login').hidden = true; $('adm-main').hidden = false; $('adm-logout').hidden = false;
  route();
});

/** Ask for the password again before a sensitive action. Resolves true on success. */
async function reauth() {
  const pw = prompt(t('admin.reauth'));
  if (!pw) return false;
  try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw)); return true; }
  catch { toast(t('admin.wrongPassword'), 'err'); return false; }
}

const ctx = () => ({ db, storage, user, lang: getLang(), navigate: h => { location.hash = h; }, reauth });

function dashboard() {
  const grid = el('div', { class: 'grid' });
  for (const [key, def] of sections) {
    grid.append(el('a', { class: 'card tile', href: `#${key}` },
      el('span', { class: 'icon', text: def.icon }), el('span', { text: pick(def.title) })));
  }
  return grid;
}

async function route() {
  if (!user) return;
  const main = $('adm-main'); main.replaceChildren();
  const key = location.hash.replace(/^#/, '').split('/')[0];
  const def = sections.get(key);
  $('adm-title').textContent = def ? pick(def.title) : 'Admin';
  if (!def) { main.append(dashboard()); return; }
  main.append(el('a', { class: 'back', href: '#', text: '‹ ' + pick({ bn: 'ড্যাশবোর্ড', en: 'Dashboard' }) }));
  const box = el('div'); main.append(box);
  try { await def.render(box, ctx()); }
  catch (err) { console.error(err); box.replaceChildren(el('p', { class: 'err', text: t('common.error') })); toast(t('common.error'), 'err'); }
}
window.addEventListener('hashchange', route);

// Sections register themselves on import (order = dashboard order).
import './sections/settings.js'; // Task 9
import './sections/history.js'; // Task 15
import './sections/committee.js'; // Task 16
import './sections/albums.js'; // Task 18
// import './sections/events.js'; // Task 18
import './sections/export.js'; // Task 19
