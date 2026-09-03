// Pure helpers first (unit-tested); DOM helpers below guard on typeof document.
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function countdown(iso, now = new Date()) {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return { days: 0, hours: 0, minutes: 0, past: true };
  let ms = target - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, past: true };
  const days = Math.floor(ms / 86400000); ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000); ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  return { days, hours, minutes, past: false };
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'; // Bengali digits U+09E6–U+09EF (not Devanagari U+0966–)
export function bnDigits(s) { return String(s).replace(/\d/g, d => BN_DIGITS[d]); }
const MONTHS = {
  bn: ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
export function fmtDate(iso, lang = 'bn') {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return '';
  const out = `${d.getDate()} ${MONTHS[lang === 'bn' ? 'bn' : 'en'][d.getMonth()]} ${d.getFullYear()}`;
  return lang === 'bn' ? bnDigits(out) : out;
}

// ---- DOM helpers (browser only) ----
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  // skips null/undefined/false so `cond && el(...)` is safe
  for (const c of children.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
export function toast(msg, kind = 'ok') {
  const t = el('div', { class: `toast toast-${kind}`, text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 3000);
}
