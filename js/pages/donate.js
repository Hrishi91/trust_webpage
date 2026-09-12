import { mountShell, section, sectionHead, pageHeader } from '../shell.js';
import { listDonorWall } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate, toast, digits } from '../ui.js';
import { inr } from '../money.js';
import { parsePurposes } from '../ledger.js';
import { mediaUrl, httpsUrl } from '../media-slots.js';
import { shareRow } from '../share.js';

const main = document.getElementById('main');
const s = await mountShell('donate', 'donate.title');
if (s) {
  if (s.sectionVisibility.donate === false) {
    main.replaceChildren(el('p', { class: 'muted', text: t('common.empty') }));
  } else {
    let wall = [], errored = false;
    try {
      wall = await listDonorWall();
    } catch (err) {
      console.error(err);
      errored = true;
    }
    const purposes = parsePurposes(s.donatePurposes);
    // The three inputs are created per render() (placeholders follow the language) but held in these block-level bindings so the purpose chips — built in the same render — can fill the amount.
    let nameField, amountField, refField, amountErr;
    // Phase 7 Task 1 item 5: the donate page never learns whether the WhatsApp message was
    // actually sent (window.open is fire-and-forget), so "thank you" just means "you told us" —
    // re-render swaps the form out for a bilingual acknowledgement; "আবার" (again) brings it back.
    let thanked = false;

    const upiCard = () => {
      if (!s.upiId) {
        const wa = digits(s.contacts.whatsapp);
        return el('div', { class: 'notice' },
          el('p', { text: t('donate.soon') }),
          wa ? el('a', { class: 'btn', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', text: t('footer.whatsapp') }) : null);
      }
      const payHref = `upi://pay?pa=${encodeURIComponent(s.upiId)}&pn=${encodeURIComponent(pick(s.name))}&cu=INR`;
      return el('div', { class: 'upibig' },
        httpsUrl(s.upiQrUrl) ? el('img', { src: httpsUrl(s.upiQrUrl), alt: t('donate.scan'), style: 'width:160px;height:160px;object-fit:contain' }) : null,
        el('div', {},
          el('p', {}, el('code', { class: 'upi-id', text: s.upiId })),
          el('div', { class: 'row' },
            el('button', {
              class: 'btn', type: 'button', text: t('donate.copy'),
              onclick: async () => {
                if (!navigator.clipboard || !navigator.clipboard.writeText) return;
                try {
                  await navigator.clipboard.writeText(s.upiId);
                  toast(t('donate.copied'));
                } catch (err) { console.error(err); }
              },
            }),
            el('a', { class: 'btn', href: payHref, text: t('donate.upi') }))));
    };

    const confirmCard = () => {
      const wa = digits(s.contacts.whatsapp);
      if (!wa) return null;
      const refundLink = el('p', {}, el('a', { class: 'muted', href: 'privacy.html#refund', text: t('donate.refundLink') }));
      if (thanked) {
        return el('div', { class: 'card' }, refundLink,
          el('h2', { text: t('donate.thankYouTitle') }),
          el('p', { text: t('donate.thankYouBody') }),
          el('button', { class: 'btn secondary', type: 'button', text: t('donate.again'), onclick: () => { thanked = false; render(); } }));
      }
      return el('div', { class: 'card' }, refundLink,
        el('h2', { text: t('donate.confirm') }),
        el('form', {
          onsubmit: e => {
            e.preventDefault();
            const name = nameField.value.trim(), amount = Number(amountField.value), ref = refField.value.trim();
            // Item 25: an invalid amount now gets its own message under the field (linked to the
            // input via aria-describedby, so a screen reader announces it as part of the field),
            // not only a generic toast the field itself never referenced.
            if (!(amount > 0)) {
              amountErr.textContent = t('donate.errAmount');
              amountErr.hidden = false;
              amountField.setAttribute('aria-invalid', 'true');
              amountField.focus();
              return;
            }
            amountErr.hidden = true;
            amountField.removeAttribute('aria-invalid');
            const vals = { amount: String(amount), ref: ref || '—', name: name || '—' };
            const msg = t('donate.confirmMsg').replace(/\{(amount|ref|name)\}/g, (_, k) => vals[k]);
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
            thanked = true; render();
          },
        },
          el('div', { class: 'field' }, el('label', { for: nameField.id, text: t('donate.name') }), nameField),
          el('div', { class: 'field' }, el('label', { for: amountField.id, text: t('donate.amount') }), amountField, amountErr),
          el('div', { class: 'field' }, el('label', { for: refField.id, text: t('donate.ref') }), refField),
          el('button', { class: 'btn', type: 'submit', text: t('donate.confirm') })));
    };

    const render = () => {
      const lang = getLang();
      // Item 25: real <label for> elements (below, in confirmCard()) replace aria-label — a click
      // on the label now focuses the field, and the label text survives once the visitor starts
      // typing (a placeholder alone disappears).
      nameField = el('input', { id: 'donate-name', type: 'text', placeholder: t('donate.name') });
      amountField = el('input', { id: 'donate-amount', type: 'number', min: '0', placeholder: t('donate.amount'), 'aria-describedby': 'donate-amount-err' });
      refField = el('input', { id: 'donate-ref', type: 'text', placeholder: t('donate.ref') });
      amountErr = el('p', { id: 'donate-amount-err', class: 'err', 'aria-live': 'polite' });
      amountErr.hidden = true;
      const purposeCards = purposes.length ? el('div', { class: 'purpose' }, ...purposes.map(p => el('div', { class: 'pcard' }, el('b', { text: pick(p.title) }),
        el('div', { class: 'chips' }, ...p.amounts.map(a => el('i', { text: inr(a, lang), onclick: () => { amountField.value = String(a); amountField.focus(); } })))))) : null;
      main.replaceChildren(pageHeader({ crumb: t('nav.donate'), title: t('donate.title'), lead: s.has80G ? t('donate.tax80g') : '', image: mediaUrl(s.media, 'header.donate') }),
        section(el('div', { class: 'dgrid' },
          el('div', {}, upiCard(), purposeCards ? sectionHead(t('donate.purposeHeading')) : null, purposeCards),
          el('div', {}, confirmCard(), el('div', { class: 'form wall-card' }, el('span', { class: 'eyebrow', text: t('donate.wall') }),
            errored ? el('p', { class: 'muted', text: t('common.error') }) : wall.length ? el('div', { class: 'wall' }, ...wall.map(d => el('div', { class: 'donor' },
              el('span', { text: d.isAnonymous ? t('donate.anonymous') : d.donorName }), el('span', { text: inr(d.amount, lang) }), el('span', { class: 'muted', text: fmtDate(d.date, lang) })))) : el('p', { class: 'muted', text: t('common.empty') }),
            s.regNo ? el('small', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null))),
          shareRow({ url: location.href, title: t('donate.title') })));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
