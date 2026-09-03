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
      const phoneErr = el('p', { class: 'err' });
      phoneErr.hidden = true;
      const sendBtn = el('button', { class: 'btn', type: 'button', text: t('mem.sendOtp') });
      const otpInput = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: t('mem.otp'), 'aria-label': t('mem.otp') });
      const verifyBtn = el('button', { class: 'btn', type: 'button', text: t('mem.verify') });
      const resendBtn = el('button', { class: 'btn', type: 'button', text: t('mem.resend') });
      const changeBtn = el('a', { href: '#', text: t('mem.changeNumber') });
      // The inner divs carry the 'row' (flex) class; the outer one is the thing we toggle via
      // the `hidden` property. Putting 'row' (display:flex) directly on the toggled element would
      // let that author rule beat the UA's `[hidden] { display:none }` at equal specificity — the
      // element would stay visually flexed even while hidden.
      const otpRow = el('div', {},
        el('div', { class: 'row otp' }, otpInput, verifyBtn),
        el('div', { class: 'row' }, resendBtn, changeBtn));
      otpRow.hidden = !awaitingOtp;
      if (awaitingOtp) { phoneInput.disabled = true; sendBtn.disabled = true; }

      function showPhoneErr(msg) { phoneErr.textContent = msg; phoneErr.hidden = false; }
      function clearPhoneErr() { phoneErr.hidden = true; }

      async function sendOtp() {
        const phone = normalizePhone(phoneInput.value);
        if (!phone) { showPhoneErr(t('common.error')); toast(t('common.error'), 'err'); phoneInput.focus(); return; }
        clearPhoneErr();
        sendBtn.disabled = true;
        resendBtn.disabled = true;
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
          if (err && err.code === 'auth/invalid-phone-number') {
            showPhoneErr(t('common.error'));
            toast(t('common.error'), 'err');
            phoneInput.focus();
          } else if (err && err.code === 'auth/too-many-requests') {
            toast(t('mem.tooMany'), 'err');
          } else {
            toast(t('common.error'), 'err');
          }
        } finally {
          // The verifier is rebuilt from scratch after every attempt, success or failure — a
          // fix-round-1 review argued for reusing one solved instance across Resend/Change-number
          // instead (to dodge size:'invisible''s clear() not emptying #recaptcha, so a fresh
          // RecaptchaVerifier on the same non-empty div throws "reCAPTCHA has already been
          // rendered in this element"), but that was verified false here: a network trace of a
          // reused verifier's second signInWithPhoneNumber call showed the recaptchaConfig
          // request re-firing and then nothing — recaptchaParams/accounts:sendVerificationCode
          // never followed, sendBtn stayed disabled forever, no error thrown anywhere. Rebuilding
          // fixes both problems at once: clear() the widget, then explicitly empty #recaptcha
          // (clear() alone doesn't, which is what would trigger "already rendered" on the next
          // `new RecaptchaVerifier(...)` in getVerifier() above), then null the reference. (Note,
          // for anyone chasing the *other* symptom this file's history mentions — a session torn
          // down ~1s after a successful sign-in — that traces to Auth's own ProactiveRefresh:
          // Firestore's internal token-listener arms it, it calls getIdToken(true) shortly after
          // sign-in, and when that refresh fails against the emulator, _logoutIfInvalidated
          // silently signs the user out. Unrelated to this verifier's lifetime either way.)
          try { v.clear(); } catch (clearErr) { console.warn('[members] verifier clear', clearErr); }
          document.getElementById('recaptcha').replaceChildren();
          verifier = null;
          sendBtn.disabled = false;
          resendBtn.disabled = false;
        }
      }

      sendBtn.onclick = sendOtp;
      resendBtn.onclick = sendOtp;

      changeBtn.onclick = e => {
        e.preventDefault();
        awaitingOtp = false;
        confirmationResult = null;
        otpRow.hidden = true;
        phoneInput.disabled = false;
        sendBtn.disabled = false;
        clearPhoneErr();
        phoneInput.focus();
      };

      verifyBtn.onclick = async () => {
        if (!confirmationResult) return;
        const code = otpInput.value.trim();
        if (!/^\d{6}$/.test(code)) { toast(t('common.error'), 'err'); otpInput.focus(); return; }
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
          phoneErr,
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
