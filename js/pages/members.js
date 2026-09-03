import { mountShell } from '../shell.js';
import { getMyMember, listNotices, listMyRoster } from '../content.js';
import {
  auth, IS_LOCAL, RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged,
} from '../firebase.js';
import { t, pick, getLang } from '../i18n.js';
import { el, toast, fmtDate, digits } from '../ui.js';
import { inr, sum, balance } from '../money.js';
import { renderRich } from '../rich.js';

// Normalises a raw phone input into E.164 — same rule as admin/js/sections/members.js:
// strip everything but digits, 10 digits -> +91-prefixed, 11-14 digits -> '+'-prefixed,
// anything else is invalid.
function normalizePhone(raw) {
  const d = digits(raw);
  if (d.length === 10) return `+91${d}`;
  if (d.length >= 11 && d.length <= 14) return `+${d}`;
  return null;
}

const main = document.getElementById('main');
const s = await mountShell('members', t('nav.members'));
if (s) {
  if (s.sectionVisibility.members === false) {
    main.replaceChildren(el('p', { class: 'muted', text: t('common.empty') }));
  } else {
    if (IS_LOCAL) auth.settings.appVerificationDisabledForTesting = true;

    // --- logged-out (phone OTP) state ---
    let verifier = null;
    function getVerifier() {
      if (!verifier) verifier = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' });
      return verifier;
    }
    let confirmationResult = null;
    let awaitingOtp = false;

    // --- logged-in (member) state — cached so langchange re-renders without refetching ---
    let currentUser = null;
    let cachedPhone = null;
    let member = null;
    let notices = [];
    let roster = [];
    let dataLoaded = false;

    async function loadData(phone) {
      if (dataLoaded && cachedPhone === phone) return;
      cachedPhone = phone;
      member = await getMyMember(phone); // null on absent doc AND on permission-denied — content.js
      if (member) {
        notices = await listNotices();      // content.js catches denial internally -> []
        roster = await listMyRoster(phone); // same
      } else {
        notices = [];
        roster = [];
      }
      dataLoaded = true;
    }

    function renderLoggedOut() {
      const phoneInput = el('input', { type: 'tel', placeholder: '+91', 'aria-label': t('mem.phone') });
      const sendBtn = el('button', { class: 'btn', type: 'button', text: t('mem.sendOtp') });
      const otpInput = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: t('mem.otp'), 'aria-label': t('mem.otp') });
      const verifyBtn = el('button', { class: 'btn', type: 'button', text: t('mem.verify') });
      // The inner div carries the 'row' (flex) class; the outer one is the thing we toggle via
      // the `hidden` property. Putting 'row' (display:flex) directly on the toggled element would
      // let that author rule beat the UA's `[hidden] { display:none }` at equal specificity — the
      // element would stay visually flexed even while hidden.
      const otpRow = el('div', {}, el('div', { class: 'row otp' }, otpInput, verifyBtn));
      otpRow.hidden = !awaitingOtp;
      if (awaitingOtp) { phoneInput.disabled = true; sendBtn.disabled = true; }

      sendBtn.onclick = async () => {
        const phone = normalizePhone(phoneInput.value);
        if (!phone) { toast(t('common.error'), 'err'); phoneInput.focus(); return; }
        sendBtn.disabled = true;
        const v = getVerifier();
        try {
          confirmationResult = await signInWithPhoneNumber(auth, phone, v);
          awaitingOtp = true;
          phoneInput.disabled = true;
          otpRow.hidden = false;
          otpInput.value = '';
          otpInput.focus();
        } catch (err) {
          console.warn('[members] sendOtp', err);
          if (err && err.code === 'auth/invalid-phone-number') { toast(t('common.error'), 'err'); phoneInput.focus(); }
          else if (err && err.code === 'auth/too-many-requests') { toast(t('admin.tooMany'), 'err'); }
          else { toast(t('common.error'), 'err'); }
          sendBtn.disabled = false;
        } finally {
          // The verifier's only job is producing the assertion signInWithPhoneNumber just sent —
          // an invisible widget left alive past that point (rather than cleared and rebuilt fresh
          // next time) was reproduced, in isolation against the Auth emulator with no app code
          // involved, to cause onAuthStateChanged to fire the freshly-signed-in user and then,
          // ~1s later, null — the session gone for good, nothing persisted, no error. Clearing it
          // right here (success or failure) avoids that.
          try { v.clear(); } catch (clearErr) { console.warn('[members] verifier clear', clearErr); }
          verifier = null;
        }
      };

      verifyBtn.onclick = async () => {
        if (!confirmationResult) return;
        const code = otpInput.value.trim();
        if (!code) { toast(t('common.error'), 'err'); otpInput.focus(); return; }
        verifyBtn.disabled = true;
        try {
          await confirmationResult.confirm(code);
          // onAuthStateChanged fires next and switches to the logged-in view.
        } catch (err) {
          console.warn('[members] verify', err);
          toast(t('common.error'), 'err');
          verifyBtn.disabled = false;
        }
      };

      main.replaceChildren(
        el('h1', { text: t('mem.title') }),
        el('div', { class: 'card' },
          el('div', { class: 'row' }, phoneInput, sendBtn),
          otpRow));
    }

    function renderCard() {
      const lang = getLang();
      if (!member) {
        main.replaceChildren(
          el('h1', { text: t('mem.title') }),
          el('p', { text: t('mem.notMember') }),
          el('button', { class: 'btn', type: 'button', text: t('mem.logout'), onclick: () => signOut(auth) }));
        return;
      }
      const payments = member.payments ?? [];
      const paid = sum(payments);
      const due = balance(member.pledge || 0, payments);
      const statsEl = el('div', { class: 'stats' },
        el('div', { class: 'stat' }, el('b', { text: inr(member.pledge || 0, lang) }), el('span', { text: t('mem.pledge') })),
        el('div', { class: 'stat' }, el('b', { text: inr(paid, lang) }), el('span', { text: t('mem.paid') })),
        el('div', { class: 'stat' }, el('b', { text: inr(due, lang) }), el('span', { text: t('mem.due') })));
      const paymentsList = payments.length
        ? el('div', {}, ...payments.map(p => el('p', { text: `${fmtDate(p.date, lang)} · ${inr(p.amount, lang)}${p.note ? ' · ' + p.note : ''}` })))
        : el('p', { class: 'muted', text: t('common.empty') });

      const noticesList = notices.length
        ? el('div', {}, ...notices.map(n => el('div', { class: 'card' }, el('h3', { text: pick(n.title, lang) }), renderRich(pick(n.body, lang)))))
        : el('p', { class: 'muted', text: t('common.empty') });

      const rosterList = roster.length
        ? el('div', {}, ...roster.map(r => el('p', { text: `${fmtDate(r.date, lang)} · ${pick(r.duty, lang)}${r.note ? ' · ' + r.note : ''}` })))
        : el('p', { class: 'muted', text: t('common.empty') });

      main.replaceChildren(
        el('h1', { text: t('mem.title') }),
        el('div', { class: 'card' },
          el('h2', { text: pick(member.name, lang) }),
          member.role ? el('p', { class: 'muted', text: pick(member.role, lang) }) : null,
          statsEl,
          paymentsList),
        el('h2', { text: t('mem.notices') }),
        noticesList,
        el('h2', { text: t('mem.duties') }),
        rosterList,
        el('button', { class: 'btn', type: 'button', text: t('mem.logout'), onclick: () => signOut(auth) }));
    }

    document.addEventListener('langchange', () => {
      if (currentUser) renderCard();
      else renderLoggedOut();
    });

    // Guards against onAuthStateChanged firing out of order (a stale invocation's async work
    // resolving after a newer one already rendered) — only the most-recently-fired invocation is
    // allowed to touch the DOM.
    let authSeq = 0;
    onAuthStateChanged(auth, async user => {
      const seq = ++authSeq;
      if (user && user.phoneNumber) {
        currentUser = user;
        main.replaceChildren(el('p', { class: 'muted', text: t('common.loading') }));
        try {
          await loadData(user.phoneNumber);
        } catch (err) {
          console.warn('[members] loadData', err);
        }
        if (seq !== authSeq) return;
        renderCard();
      } else {
        // Logged out, or a logged-in EMAIL user (the admin) — the admin has no phoneNumber and
        // must not be signed out from here; just show the phone-login form.
        currentUser = null;
        cachedPhone = null; member = null; notices = []; roster = []; dataLoaded = false;
        confirmationResult = null;
        awaitingOtp = false;
        if (seq !== authSeq) return;
        renderLoggedOut();
      }
    });
  }
}
