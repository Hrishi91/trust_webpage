// Pure i18n: no DOM, no Firebase. Safe under node --test.
export const LANGS = ['bn', 'en'];
let current = 'bn';
const listeners = new Set();
const store = typeof localStorage !== 'undefined' ? localStorage : null;
try { const s = store && store.getItem('lang'); if (LANGS.includes(s)) current = s; } catch { /* private mode */ }

export function getLang() { return current; }
export function setLang(l) {
  if (!LANGS.includes(l) || l === current) return;
  current = l;
  try { store && store.setItem('lang', l); } catch { /* ignore */ }
  listeners.forEach(cb => cb(l));
}
export function onLangChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/** field: {bn,en} | string | null → string (fallback to the other language). */
export function pick(field, lang = current) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const other = lang === 'bn' ? 'en' : 'bn';
  return (field[lang] || field[other] || '').toString();
}

export const STRINGS = {
  'nav.home': { bn: 'হোম', en: 'Home' },
  'nav.about': { bn: 'ইতিহাস', en: 'History' },
  'nav.committee': { bn: 'কমিটি', en: 'Committee' },
  'nav.gallery': { bn: 'গ্যালারি', en: 'Gallery' },
  'nav.events': { bn: 'অনুষ্ঠান', en: 'Events' },
  'countdown.days': { bn: 'দিন', en: 'days' },
  'countdown.hours': { bn: 'ঘণ্টা', en: 'hours' },
  'countdown.minutes': { bn: 'মিনিট', en: 'minutes' },
  'countdown.today': { bn: 'আজই পুজো!', en: "It's puja day!" },
  'events.upcoming': { bn: 'আসন্ন অনুষ্ঠান', en: 'Upcoming events' },
  'events.past': { bn: 'পুরনো অনুষ্ঠান', en: 'Past events' },
  'gallery.albums': { bn: 'অ্যালবাম', en: 'Albums' },
  'common.loading': { bn: 'লোড হচ্ছে…', en: 'Loading…' },
  'common.empty': { bn: 'এখনও কিছু নেই', en: 'Nothing here yet' },
  'common.error': { bn: 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন', en: 'Something went wrong, please retry' },
  'common.richUnavailable': { bn: 'লেখা দেখানো যাচ্ছে না', en: 'Text could not be shown' },
  'footer.maintenance': { bn: 'সাইটে কাজ চলছে, একটু পরে আসুন', en: 'Site under maintenance, please come back shortly' },
  // admin
  'admin.login': { bn: 'অ্যাডমিন লগইন', en: 'Admin login' },
  'admin.email': { bn: 'ইমেল', en: 'Email' },
  'admin.password': { bn: 'পাসওয়ার্ড', en: 'Password' },
  'admin.notAdmin': { bn: 'এই অ্যাকাউন্ট অ্যাডমিন নয়', en: 'This account is not an admin' },
  'admin.logout': { bn: 'লগআউট', en: 'Logout' },
  'admin.saveDraft': { bn: 'ড্রাফট সেভ', en: 'Save draft' },
  'admin.publish': { bn: 'পাবলিশ', en: 'Publish' },
  'admin.unpublish': { bn: 'আনপাবলিশ', en: 'Unpublish' },
  'admin.delete': { bn: 'মুছুন', en: 'Delete' },
  'admin.confirmDelete': { bn: 'সত্যিই মুছবেন? (পরে ফেরানো যাবে না)', en: 'Really delete? (cannot be undone from here)' },
  'admin.reauth': { bn: 'নিরাপত্তার জন্য পাসওয়ার্ড আবার দিন', en: 'Re-enter password for security' },
  'admin.saved': { bn: 'সেভ হয়েছে', en: 'Saved' },
  'admin.draft': { bn: 'ড্রাফট', en: 'Draft' },
  'admin.published': { bn: 'পাবলিশড', en: 'Published' },
  'admin.new': { bn: '+ নতুন', en: '+ New' },
  'admin.up': { bn: '↑', en: '↑' }, 'admin.down': { bn: '↓', en: '↓' },
  'admin.preview': { bn: 'প্রিভিউ', en: 'Preview' },
  'admin.export': { bn: 'সব ডেটা JSON export', en: 'Export all data as JSON' },
  'admin.loginFailed': { bn: 'লগইন হয়নি', en: 'Login failed.' },
  'admin.tooMany': { bn: 'অনেকবার চেষ্টা হয়েছে — কয়েক মিনিট পরে আবার', en: 'Too many attempts — wait a few minutes.' },
  'admin.wrongPassword': { bn: 'ভুল পাসওয়ার্ড', en: 'Wrong password' },
  'admin.emailUnverified': { bn: 'ইমেল verify হয়নি — লগআউট করে আবার লগইন করুন', en: 'Email not verified — log out and log in again' },
};
export function t(key, lang = current) {
  const e = STRINGS[key];
  return e ? pick(e, lang) : key;
}
