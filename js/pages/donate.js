import { mountShell } from '../shell.js';
import { listDonorWall } from '../content.js';
import { pick, t, getLang } from '../i18n.js';
import { el, fmtDate, toast } from '../ui.js';
import { inr } from '../money.js';

const COPY_LABEL = { bn: 'কপি করুন', en: 'Copy' };
const NAME_LABEL = { bn: 'নাম', en: 'Name' };
const AMOUNT_LABEL = { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' };
const REF_LABEL = { bn: 'UPI রেফারেন্স', en: 'UPI reference' };

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

    const upiCard = () => {
      if (!s.upiId) {
        return el('div', { class: 'notice' },
          el('p', { text: t('donate.soon') }),
          s.contacts.whatsapp ? el('a', { class: 'btn', href: `https://wa.me/${s.contacts.whatsapp}`, target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null);
      }
      const payHref = `upi://pay?pa=${encodeURIComponent(s.upiId)}&pn=${encodeURIComponent(pick(s.name))}&cu=INR`;
      return el('div', { class: 'card' },
        el('h2', { text: t('donate.upi') }),
        el('p', {}, el('code', { class: 'upi-id', text: s.upiId })),
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
        s.upiQrUrl ? el('div', {}, el('p', { class: 'muted', text: t('donate.scan') }), el('img', { src: s.upiQrUrl, alt: t('donate.scan'), style: 'max-width:260px;width:100%' })) : null,
        el('p', {}, el('a', { class: 'btn', href: payHref, text: t('donate.upi') })));
    };

    const confirmCard = () => {
      if (!s.contacts.whatsapp) return null;
      const nameField = el('input', { type: 'text', placeholder: pick(NAME_LABEL), 'aria-label': pick(NAME_LABEL) });
      const amountField = el('input', { type: 'number', min: '0', placeholder: pick(AMOUNT_LABEL), 'aria-label': pick(AMOUNT_LABEL) });
      const refField = el('input', { type: 'text', placeholder: pick(REF_LABEL), 'aria-label': pick(REF_LABEL) });
      return el('div', { class: 'card' },
        el('h2', { text: t('donate.confirm') }),
        el('form', {
          onsubmit: e => {
            e.preventDefault();
            const name = nameField.value.trim(), amount = Number(amountField.value), ref = refField.value.trim();
            if (!(amount > 0)) { toast(t('common.error'), 'err'); return; }
            const msg = t('donate.confirmMsg')
              .replace('{amount}', String(amount))
              .replace('{ref}', ref || '—')
              .replace('{name}', name || '—');
            window.open(`https://wa.me/${s.contacts.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
          },
        },
          el('div', { class: 'row' }, nameField),
          el('div', { class: 'row' }, amountField),
          el('div', { class: 'row' }, refField),
          el('button', { class: 'btn', type: 'submit', text: t('donate.confirm') })));
    };

    const render = () => {
      const lang = getLang();
      main.replaceChildren(...[
        el('h1', { text: t('donate.title') }),
        upiCard(),
        confirmCard(),
        s.has80G ? el('p', { class: 'muted', text: t('donate.tax80g') }) : null,
        s.regNo ? el('p', { class: 'muted', text: `${t('tr.regNo')} ${s.regNo}` }) : null,
        el('h2', { text: t('donate.wall') }),
        errored ? el('p', { class: 'muted', text: t('common.error') })
          : wall.length ? el('div', {}, ...wall.map(d => el('div', { class: 'donor' },
              el('span', { text: d.isAnonymous ? t('donate.anonymous') : d.donorName }),
              el('span', { text: inr(d.amount, lang) }),
              el('span', { text: fmtDate(d.date, lang) }))))
            : el('p', { class: 'muted', text: t('common.empty') }),
      ].filter(Boolean));
    };
    render();
    document.addEventListener('langchange', render);
  }
}
