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
  'nav.donate': { bn: 'দান', en: 'Donate' },
  'nav.transparency': { bn: 'হিসাব', en: 'Transparency' },
  'nav.members': { bn: 'সদস্য', en: 'Members' },
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
  'admin.donations': { bn: 'দান', en: 'Donations' },
  'admin.transparency': { bn: 'হিসাব', en: 'Transparency' },
  'admin.announcements': { bn: 'ঘোষণা', en: 'Announcements' },
  'admin.members': { bn: 'সদস্য', en: 'Members' },
  'admin.notices': { bn: 'নোটিশ', en: 'Notices' },
  'admin.roster': { bn: 'দায়িত্ব তালিকা', en: 'Duty roster' },
  'admin.design': { bn: 'ডিজাইন', en: 'Design' },
  'admin.designApply': { bn: 'চালু করুন', en: 'Apply' },
  'admin.designCurrent': { bn: 'চালু আছে', en: 'Current' },
  'admin.designPreview': { bn: 'প্রিভিউ', en: 'Preview' },
  'admin.designHint': { bn: 'যেটা বাছবেন সেটাই সবার কাছে দেখাবে। প্রিভিউ শুধু আপনার ট্যাবে।', en: 'The one you apply is what everyone sees. Preview affects only your tab.' },
  'admin.addRow': { bn: '+ সারি', en: '+ Row' },
  'admin.addPayment': { bn: '+ পেমেন্ট', en: '+ Payment' },
  // donate
  'donate.title': { bn: 'দান করুন', en: 'Donate' },
  'donate.upi': { bn: 'UPI দিয়ে দিন', en: 'Pay via UPI' },
  'donate.scan': { bn: 'QR স্ক্যান করুন', en: 'Scan the QR' },
  'donate.confirm': { bn: 'WhatsApp-এ জানান', en: 'Confirm on WhatsApp' },
  'donate.confirmMsg': { bn: 'আমি ₹{amount} দান করেছি (UPI ref: {ref})। নাম: {name}', en: 'I donated ₹{amount} (UPI ref: {ref}). Name: {name}' },
  'donate.wall': { bn: 'দাতাদের তালিকা', en: 'Donor wall' },
  'donate.anonymous': { bn: 'নাম প্রকাশে অনিচ্ছুক', en: 'Anonymous' },
  'donate.soon': { bn: 'অনলাইন দান শীঘ্রই চালু হবে — WhatsApp-এ যোগাযোগ করুন', en: 'Online donation opens soon — contact us on WhatsApp' },
  'donate.tax80g': { bn: '80G-এর আওতায় কর ছাড়যোগ্য', en: 'Tax-deductible under 80G' },
  'donate.copied': { bn: 'কপি হয়েছে', en: 'Copied' },
  // transparency
  'tr.title': { bn: 'আয়-ব্যয়ের হিসাব', en: 'Income & expense' },
  'tr.income': { bn: 'আয়', en: 'Income' },
  'tr.expense': { bn: 'ব্যয়', en: 'Expense' },
  'tr.balance': { bn: 'উদ্বৃত্ত', en: 'Balance' },
  'tr.docs': { bn: 'নথি', en: 'Documents' },
  'tr.year': { bn: 'বছর', en: 'Year' },
  'tr.regNo': { bn: 'রেজিস্ট্রেশন নং', en: 'Reg. no.' },
  // live hub
  'live.badge': { bn: '🔴 লাইভ', en: '🔴 LIVE' },
  'live.today': { bn: 'আজকের সূচি', en: "Today's schedule" },
  'live.announcements': { bn: 'ঘোষণা', en: 'Announcements' },
  // members
  'mem.title': { bn: 'সদস্যদের পাতা', en: "Members' page" },
  'mem.phone': { bn: 'মোবাইল নম্বর', en: 'Mobile number' },
  'mem.sendOtp': { bn: 'OTP পাঠান', en: 'Send OTP' },
  'mem.otp': { bn: 'OTP', en: 'OTP' },
  'mem.verify': { bn: 'যাচাই করুন', en: 'Verify' },
  'mem.notMember': { bn: 'এই নম্বর সদস্য তালিকায় নেই', en: 'This number is not on the members list' },
  'mem.pledge': { bn: 'প্রতিশ্রুতি', en: 'Pledge' },
  'mem.paid': { bn: 'দেওয়া হয়েছে', en: 'Paid' },
  'mem.due': { bn: 'বাকি', en: 'Due' },
  'mem.notices': { bn: 'নোটিশ', en: 'Notices' },
  'mem.duties': { bn: 'আমার দায়িত্ব', en: 'My duties' },
  'mem.logout': { bn: 'লগআউট', en: 'Logout' },
  'mem.tooMany': { bn: 'অনেকবার চেষ্টা হয়েছে — কয়েক মিনিট পরে আবার', en: 'Too many attempts — wait a few minutes.' },
  'mem.changeNumber': { bn: 'নম্বর বদলান', en: 'Change number' },
  'mem.resend': { bn: 'আবার OTP পাঠান', en: 'Resend OTP' },
  // credibility strip (home hero)
  'cred.registered': { bn: 'Registered Trust', en: 'Registered Trust' },
  'cred.80g': { bn: '80G', en: '80G' },
  // home page (inline literals moved in during Phase 6 Task 1)
  'home.glance': { bn: 'এক নজরে', en: 'At a glance' },
  'home.pujaStarts': { bn: 'পুজো শুরু', en: 'Puja starts' },
  'home.nextEvent': { bn: 'পরের অনুষ্ঠান', en: 'Next event' },
  'home.thisTheme': { bn: 'এই বছরের থিম', en: "This year's theme" },
  'home.ledgerPublished': { bn: 'প্রতি বছর প্রকাশিত', en: 'published every year' },
  'home.donateHeading': { bn: 'এক টাকাও ', en: 'Not one rupee ' },
  'home.donateHeadingEm': { bn: 'হিসাবের বাইরে নয়', en: 'outside the ledger' },
  'home.donateLead': { bn: 'UPI-তে দিন, WhatsApp-এ জানান। দাতাদের তালিকায় নাম উঠবে (চাইলে গোপন)।', en: 'Pay by UPI, confirm on WhatsApp. Your name joins the donor wall (or stays anonymous).' },
  'home.membersHeading': { bn: 'নিজের চাঁদা, নোটিশ, দায়িত্ব — এক জায়গায়', en: 'Your pledge, notices, duties — in one place' },
  'home.membersLead': { bn: 'কমিটির সদস্যরা মোবাইল নম্বর দিয়ে OTP-তে ঢুকুন।', en: 'Committee members sign in with a phone OTP.' },
  'home.cultureHeading': { bn: 'আমাদের মাটি, আমাদের শিল্প', en: 'Our soil, our craft' },
  'home.culturePill': { bn: 'দক্ষিণ দিনাজপুর', en: 'Dakshin Dinajpur' },
  'home.allMembers': { bn: 'সব সদস্য →', en: 'All members →' },
  // nav / footer
  'nav.menu': { bn: 'মেনু', en: 'Menu' },
  'footer.contact': { bn: 'যোগাযোগ', en: 'Contact' },
  'footer.map': { bn: 'মানচিত্রে দেখুন', en: 'View on map' },
  'footer.pages': { bn: 'পাতা', en: 'Pages' },
  'footer.trust': { bn: 'ট্রাস্ট', en: 'Trust' },
  'footer.whatsapp': { bn: 'WhatsApp', en: 'WhatsApp' },
  // donate page
  'donate.copy': { bn: 'কপি করুন', en: 'Copy' },
  'donate.name': { bn: 'নাম', en: 'Name' },
  'donate.amount': { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  'donate.ref': { bn: 'UPI রেফারেন্স', en: 'UPI reference' },
  'donate.purposeHeading': { bn: 'কোন খাতে', en: 'For what' },
  // transparency page
  'tr.total': { bn: 'মোট', en: 'Total' },
  'tr.download': { bn: 'ডাউনলোড', en: 'Download' },
  'tr.legal': { bn: 'আইনি তথ্য', en: 'Legal' },
  'tr.inProgress': { bn: 'প্রক্রিয়াধীন', en: 'in progress' },
  'tr.afterReg': { bn: 'রেজিস্ট্রেশনের পরে', en: 'after registration' },
  'tr.address': { bn: 'ঠিকানা', en: 'Address' },
  // committee page
  'committee.title': { bn: 'যাঁরা দায়িত্বে', en: 'Who is responsible' },
  'committee.members': { bn: 'সদস্যরা', en: 'Members' },
  // gallery page
  'gallery.best': { bn: 'সেরা মুহূর্ত', en: 'Best moments' },
  // admin — dashboard chrome
  'admin.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  'admin.backup': { bn: 'ব্যাকআপ', en: 'Backup' },
  'admin.settings': { bn: 'সেটিংস', en: 'Settings' },
  // admin — committee section form
  'admin.committee.name': { bn: 'নাম', en: 'Name' },
  'admin.committee.post': { bn: 'পদ', en: 'Post' },
  'admin.committee.photo': { bn: 'ছবি', en: 'Photo' },
  'admin.committee.isPublic': { bn: 'ওয়েবসাইটে দেখাও', en: 'Show on website' },
  'admin.committee.officer': { bn: 'পদাধিকারী (সামনে দেখাও)', en: 'Office-bearer (show first)' },
  // admin — events section form
  'admin.events.title': { bn: 'নাম', en: 'Title' },
  'admin.events.start': { bn: 'শুরু', en: 'Start' },
  'admin.events.end': { bn: 'শেষ (ঐচ্ছিক)', en: 'End (optional)' },
  'admin.events.venue': { bn: 'স্থান', en: 'Venue' },
  'admin.events.desc': { bn: 'বিবরণ', en: 'Description' },
  // admin — albums (gallery) section form
  'admin.albums.title': { bn: 'অ্যালবামের নাম', en: 'Album title' },
  'admin.albums.year': { bn: 'বছর', en: 'Year' },
  'admin.albums.cover': { bn: 'কভার ছবি', en: 'Cover photo' },
  'admin.albums.featured': { bn: 'সেরা মুহূর্ত strip-এ দেখাও', en: 'Show in best-moments strip' },
  'admin.albums.photosHeading': { bn: 'ছবি', en: 'Photos' },
  'admin.albums.addPhotos': { bn: 'ছবি যোগ করুন (একাধিক)', en: 'Add photos (multiple)' },
  // admin — transparency section form
  'admin.transparency.category': { bn: 'খাত', en: 'Category' },
  'admin.transparency.amount': { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  'admin.transparency.total': { bn: 'মোট', en: 'Total' },
  'admin.transparency.docTitle': { bn: 'শিরোনাম', en: 'Title' },
  'admin.transparency.docFile': { bn: 'PDF', en: 'PDF' },
  'admin.transparency.notes': { bn: 'নোট', en: 'Notes' },
  // admin — notices section form
  'admin.notices.title': { bn: 'শিরোনাম', en: 'Title' },
  'admin.notices.body': { bn: 'বিবরণ (HTML: <p> <b> <ul> <li>)', en: 'Body (HTML allowed)' },
  // admin — members section form
  'admin.members.phone': { bn: 'মোবাইল নম্বর', en: 'Phone number' },
  'admin.members.name': { bn: 'নাম', en: 'Name' },
  'admin.members.role': { bn: 'পদ', en: 'Role' },
  'admin.members.pledge': { bn: 'প্রতিশ্রুতি (₹)', en: 'Pledge (₹)' },
  'admin.members.active': { bn: 'সক্রিয়', en: 'Active' },
  'admin.members.inactive': { bn: 'নিষ্ক্রিয়', en: 'Inactive' },
  'admin.members.date': { bn: 'তারিখ', en: 'Date' },
  'admin.members.amount': { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  'admin.members.note': { bn: 'নোট', en: 'Note' },
  'admin.members.payments': { bn: 'পেমেন্ট', en: 'Payments' },
  // admin — history section form
  'admin.history.year': { bn: 'বছর', en: 'Year' },
  'admin.history.title': { bn: 'শিরোনাম', en: 'Title' },
  'admin.history.body': { bn: 'বিবরণ (HTML: <p> <b> <ul> <li> <img>)', en: 'Body (HTML allowed)' },
  'admin.history.images': { bn: 'ছবির URL (কমা দিয়ে)', en: 'Image URLs (comma separated)' },
  // admin — donations section form
  'admin.donations.modeCash': { bn: 'নগদ', en: 'Cash' },
  'admin.donations.modeUpi': { bn: 'UPI', en: 'UPI' },
  'admin.donations.modeBank': { bn: 'ব্যাঙ্ক', en: 'Bank' },
  'admin.donations.count': { bn: 'সংখ্যা', en: 'Count' },
  'admin.donations.total': { bn: 'মোট', en: 'Total' },
  'admin.donations.wall': { bn: 'দেয়ালে দেখানো হচ্ছে', en: 'On donor wall' },
  'admin.donations.year': { bn: 'বছর', en: 'Year' },
  'admin.donations.save': { bn: 'সেভ করুন', en: 'Save' },
  'admin.donations.donorName': { bn: 'দাতার নাম', en: 'Donor name' },
  'admin.donations.amount': { bn: 'পরিমাণ (₹)', en: 'Amount (₹)' },
  'admin.donations.date': { bn: 'তারিখ', en: 'Date' },
  'admin.donations.mode': { bn: 'মাধ্যম', en: 'Mode' },
  'admin.donations.receiptNo': { bn: 'রসিদ নং', en: 'Receipt no.' },
  'admin.donations.anonymous': { bn: 'নাম প্রকাশে অনিচ্ছুক', en: 'Anonymous' },
  'admin.donations.showOnWall': { bn: 'দেয়ালে দেখান', en: 'Show on donor wall' },
  'admin.donations.note': { bn: 'নোট', en: 'Note' },
  // admin — settings section form
  'admin.settings.name': { bn: 'ট্রাস্টের নাম', en: 'Trust name' },
  'admin.settings.tagline': { bn: 'ট্যাগলাইন', en: 'Tagline' },
  'admin.settings.address': { bn: 'ঠিকানা', en: 'Address' },
  'admin.settings.logoUrl': { bn: 'লোগো URL', en: 'Logo URL' },
  'admin.settings.mapUrl': { bn: 'Google Maps লিঙ্ক', en: 'Google Maps link' },
  'admin.settings.phone': { bn: 'ফোন', en: 'Phone' },
  'admin.settings.whatsapp': { bn: 'WhatsApp নম্বর (91 সহ)', en: 'WhatsApp number (with 91)' },
  'admin.settings.email': { bn: 'ইমেল', en: 'Email' },
  'admin.settings.regNo': { bn: 'রেজিস্ট্রেশন নম্বর', en: 'Registration no.' },
  'admin.settings.has80G': { bn: '80G আছে', en: 'Has 80G' },
  'admin.settings.upiId': { bn: 'UPI ID', en: 'UPI ID' },
  'admin.settings.upiQrUrl': { bn: 'UPI QR ছবির URL', en: 'UPI QR image URL' },
  'admin.settings.pujaDate': { bn: 'পুজোর তারিখ-সময়', en: 'Puja date-time' },
  'admin.settings.maintenance': { bn: 'Maintenance mode (সাইট বন্ধ)', en: 'Maintenance mode' },
  'admin.settings.donatePurposes': { bn: 'দানের খাত — প্রতি লাইনে: বাংলা | English | 501,1101', en: 'Donation purposes — per line: bn | en | 501,1101' },
  'admin.settings.visibleSections': { bn: 'কোন সেকশন দেখা যাবে', en: 'Visible sections' },
  'admin.settings.showPrefix': { bn: 'দেখাও:', en: 'Show:' },
  // admin — roster section form
  'admin.roster.date': { bn: 'তারিখ', en: 'Date' },
  'admin.roster.duty': { bn: 'দায়িত্ব', en: 'Duty' },
  'admin.roster.members': { bn: 'সদস্যরা', en: 'Members' },
  'admin.roster.note': { bn: 'নোট', en: 'Note' },
  // admin — announcements section form
  'admin.announcements.text': { bn: 'বার্তা', en: 'Message' },
  'admin.announcements.pinned': { bn: 'পিন করুন', en: 'Pin to top' },
  'admin.announcements.isLive': { bn: 'এখন লাইভ', en: 'Live now' },
  'admin.announcements.expiresAt': { bn: 'মেয়াদ শেষ (ঐচ্ছিক)', en: 'Expires at (optional)' },
  'admin.announcements.edit': { bn: 'সম্পাদনা', en: 'Edit' },
  'admin.announcements.expired': { bn: 'মেয়াদ শেষ', en: 'expired' },
};

// --- overrides layer (Phase 6: admin can override any default above) ---
let overrides = {};
/** Read-only snapshot of the current overrides map. */
export function getOverrides() { return overrides; }
/**
 * Replace the overrides map. Pass null to clear. Silently drops any entry that
 * isn't a plain {bn?, en?} object with string values — malformed Firestore data
 * (Task 2) must never crash rendering.
 */
export function setOverrides(map) {
  if (map == null) { overrides = {}; return; }
  const next = {};
  for (const [key, val] of Object.entries(map)) {
    if (!val || typeof val !== 'object') continue;
    const entry = {};
    if (typeof val.bn === 'string') entry.bn = val.bn;
    if (typeof val.en === 'string') entry.en = val.en;
    if (Object.keys(entry).length) next[key] = entry;
  }
  overrides = next;
}

/** The untouched code default for `key`, ignoring any override — used by the admin editor's "reset to default" action. */
export function defaultString(key, lang = current) {
  const e = STRINGS[key];
  return e ? pick(e, lang) : key;
}

export function t(key, lang = current) {
  const ov = overrides[key];
  if (ov && typeof ov[lang] === 'string' && ov[lang] !== '') return ov[lang];
  return defaultString(key, lang);
}

// --- STRING_GROUPS: every STRINGS key, bucketed by its dot-prefix for the admin's ✏️ লেখা list.
// Computed (not hand-maintained) so a new STRINGS key can never go unclassified or double-classified.
const PREFIX_TO_GROUP = { tr: 'transparency', mem: 'members' };
const GROUP_NAMES = [
  'nav', 'common', 'countdown', 'live', 'home', 'about', 'committee', 'gallery',
  'events', 'donate', 'transparency', 'members', 'footer', 'cred', 'admin',
];
export const STRING_GROUPS = (() => {
  const groups = Object.fromEntries(GROUP_NAMES.map(g => [g, []]));
  for (const key of Object.keys(STRINGS)) {
    const prefix = key.split('.')[0];
    const group = PREFIX_TO_GROUP[prefix] || prefix;
    if (!groups[group]) throw new Error(`i18n: STRINGS key "${key}" has no STRING_GROUPS bucket for prefix "${prefix}"`);
    groups[group].push(key);
  }
  return groups;
})();
