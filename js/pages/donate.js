import { mountShell, section, sectionHead, pageHeader } from '../shell.js';
import { listDonorWall } from '../content.js';
import { pick, t, getLang, STRINGS } from '../i18n.js';
import { el, fmtDate, toast, digits } from '../ui.js';
import { inr } from '../money.js';
import { parsePurposes } from '../ledger.js';
import { mediaUrl } from '../media-slots.js';

const COPY_LABEL = STRINGS['donate.copy'];
const NAME_LABEL = STRINGS['donate.name'];
const AMOUNT_LABEL = STRINGS['donate.amount'];
const REF_LABEL = STRINGS['donate.ref'];

const main = document.getElementById('main');
const s = await mountShell('donate', t('donate.title'));
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
    let nameField, amountField, refField;

    const upiCard = () => {
      if (!s.upiId) {
        const wa = digits(s.contacts.whatsapp);
        return el('div', { class: 'notice' },
          el('p', { text: t('donate.soon') }),
          wa ? el('a', { class: 'btn', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', text: t('footer.whatsapp') }) : null);
      }
      const payHref = `upi://pay?pa=${encodeURIComponent(s.upiId)}&pn=${encodeURIComponent(pick(s.name))}&cu=INR`;
      return el('div', { class: 'upibig' },
        s.upiQrUrl ? el('img', { src: s.upiQrUrl, alt: t('donate.scan'), style: 'width:160px;height:160px;object-fit:contain' }) : null,
        el('div', {},
          el('p', {}, el('code', { class: 'upi-id', text: s.upiId })),
          el('div', { class: 'row' },
            el('button', {
              class: 'btn', type: 'button', text: pick(COPY_LABEL),
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
      return el('div', { class: 'card' },
        el('h2', { text: t('donate.confirm') }),
        el('form', {
          onsubmit: e => {
            e.preventDefault();
            const name = nameField.value.trim(), amount = Number(amountField.value), ref = refField.value.trim();
            if (!(amount > 0)) { toast(t('common.error'), 'err'); return; }
            const vals = { amount: String(amount), ref: ref || '—', name: name || '—' };
            const msg = t('donate.confirmMsg').replace(/\{(amount|ref|name)\}/g, (_, k) => vals[k]);
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
          },
        },
          el('div', { class: 'row' }, nameField),
          el('div', { class: 'row' }, amountField),
          el('div', { class: 'row' }, refField),
          el('button', { class: 'btn', type: 'submit', text: t('donate.confirm') })));
    };

    const render = () => {
      const lang = getLang();
      nameField = el('input', { type: 'text', placeholder: pick(NAME_LABEL), 'aria-label': pick(NAME_LABEL) });
      amountField = el('input', { type: 'number', min: '0', placeholder: pick(AMOUNT_LABEL), 'aria-label': pick(AMOUNT_LABEL) });
      refField = el('input', { type: 'text', placeholder: pick(REF_LABEL), 'aria-label': pick(REF_LABEL) });
      const purposeCards = purposes.length ? el('div', { class: 'purpose' }, ...purposes.map(p => el('div', { class: 'pcard' }, el('b', { text: pick(p.title) }),
        el('div', { class: 'chips' }, ...p.amounts.map(a => el('i', { text: inr(a, lang), onclick: () => { amountField.value = String(a); amountField.focus(); } })))))) : null;
      main.replaceChildren(pageHeader({ crumb: t('nav.donate'), title: t('donate.title'), lead: s.has80G ? t('donate.tax80g') : '', image: mediaUrl(s.media, 'header.donate') }),
        section(el('div', { class: 'dgrid' },
          el('div', {}, upiCard(), purposeCards ? sectionHead(t('donate.purposeHeading')) : null, purposeCards),
          el('div', {}, confirmCard(), el('div', { class: 'form wall-card' }, el('span', { class: 'eyebrow', text: t('donate.wall') }),
            errored ? el('p', { class: 'muted', text: t('common.error') }) : wall.length ? el('div', { class: 'wall' }, ...wall.map(d => el('div', { class: 'donor' },
              el('span', { text: d.isAnonymous ? t('donate.anonymous') : d.donorName }), el('span', { text: inr(d.amount, lang) }), el('span', { class: 'muted', text: fmtDate(d.date, lang) })))) : el('p', { class: 'muted', text: t('common.empty') }),
            s.regNo ? el('small', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null)))));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
