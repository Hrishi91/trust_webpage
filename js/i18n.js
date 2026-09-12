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
  // Item 44: "শেষ আপডেট: <date>" stamp on transparency/committee/about (js/shell.js's updatedStamp()).
  'common.updated': { bn: 'শেষ আপডেট:', en: 'Last updated:' },
  // Phase 7 Task 4 (item 28): <noscript> note baked into every page's static shell, literal (JS
  // never runs to translate it) — bn first, same convention as the rest of this file's defaults.
  'common.noscript': { bn: 'এই ওয়েবসাইটের পুরো তথ্য দেখতে JavaScript চালু করুন।', en: 'Please enable JavaScript to see the full content of this website.' },
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
  'admin.exportJson': { bn: 'JSON ⬇', en: 'JSON ⬇' },
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
  // admin — 🎨 ডিজাইন colour/font/home-section extension (Phase 6 Task 6)
  'admin.design.colours': { bn: 'রং', en: 'Colours' },
  'admin.design.colourHint': { bn: 'খালি রাখলে থিমের নিজের রং দেখাবে। কনট্রাস্ট ব্যাজ শুধু পরামর্শ — সেভ আটকায় না।', en: 'Leave a field blank to use the theme\'s own colour. The contrast badge is advisory only — it never blocks saving.' },
  'admin.design.resetColour': { bn: 'থিমের রং-এ ফেরাও', en: 'Reset to theme colour' },
  'admin.design.invalidHex': { bn: 'ভুল রং কোড (যেমন #c9361a)', en: 'Invalid colour code (e.g. #c9361a)' },
  'admin.design.fonts': { bn: 'ফন্ট', en: 'Fonts' },
  'admin.design.fonts.display': { bn: 'শিরোনামের ফন্ট', en: 'Display font' },
  'admin.design.fonts.body': { bn: 'লেখার ফন্ট', en: 'Body font' },
  'admin.design.fontsTheme': { bn: 'থিমের ফন্ট', en: "Theme's font" },
  'admin.design.homeSections': { bn: 'হোম-এর section', en: 'Home sections' },
  'admin.design.homeSectionsHint': { bn: '↑ ↓ দিয়ে ক্রম বদলান, টিক তুলে লুকান', en: 'Reorder with ↑ ↓, untick to hide' },
  'admin.design.saveOverrides': { bn: 'সেভ করুন', en: 'Save' },
  'admin.design.colour.bg': { bn: 'পটভূমি (hero)', en: 'Background (hero)' },
  'admin.design.colour.bg2': { bn: 'পটভূমি ২', en: 'Background 2' },
  'admin.design.colour.ivory': { bn: 'পাতার পটভূমি', en: 'Page background' },
  'admin.design.colour.ivory2': { bn: 'পাতার পটভূমি ২', en: 'Page background 2' },
  'admin.design.colour.ink': { bn: 'লেখা', en: 'Text' },
  'admin.design.colour.muted': { bn: 'হালকা লেখা', en: 'Muted text' },
  'admin.design.colour.sindoor': { bn: 'সিঁদুর (accent)', en: 'Sindoor (accent)' },
  'admin.design.colour.pitambar': { bn: 'পীতাম্বর', en: 'Pitambar' },
  'admin.design.colour.durva': { bn: 'দূর্বা', en: 'Durva' },
  'admin.design.colour.gold': { bn: 'সোনালি', en: 'Gold' },
  'admin.design.colour.cta': { bn: 'বোতাম', en: 'Button' },
  'admin.design.colour.ctaInk': { bn: 'বোতামের লেখা', en: 'Button text' },
  'admin.design.colour.card': { bn: 'কার্ড', en: 'Card' },
  'admin.design.colour.heroAccent': { bn: 'হিরো accent', en: 'Hero accent' },
  'admin.design.colour.tickerInk': { bn: 'টিকার লেখা', en: 'Ticker text' },
  'admin.design.section.hero': { bn: 'হিরো', en: 'Hero' },
  'admin.design.section.cred': { bn: 'বিশ্বাসযোগ্যতা strip', en: 'Credibility strip' },
  'admin.design.section.glance': { bn: 'এক নজরে', en: 'At a glance' },
  'admin.design.section.story': { bn: 'থিম story', en: 'Theme story' },
  'admin.design.section.culture': { bn: 'সংস্কৃতি card', en: 'Culture cards' },
  'admin.design.section.gallery': { bn: 'গ্যালারি', en: 'Gallery' },
  'admin.design.section.schedule': { bn: 'সূচি', en: 'Schedule' },
  'admin.design.section.ledger': { bn: 'হিসাব', en: 'Ledger' },
  'admin.design.section.donate': { bn: 'দান band', en: 'Donate band' },
  'admin.design.section.committee': { bn: 'কমিটি', en: 'Committee' },
  'admin.design.section.members': { bn: 'সদস্য', en: 'Members' },
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
  'cred.registered': { bn: 'নিবন্ধিত ট্রাস্ট', en: 'Registered Trust' },
  'cred.80g': { bn: '80G', en: '80G' },
  'cred.est': { bn: 'প্রতিষ্ঠিত', en: 'Est.' },
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
  // donate page — refund-policy link + on-site thank-you state (Phase 7 Task 1)
  'donate.refundLink': { bn: 'দান ফেরত নীতি', en: 'Refund policy' },
  'donate.thankYouTitle': { bn: 'ধন্যবাদ!', en: 'Thank you!' },
  'donate.thankYouBody': {
    bn: 'আপনার বার্তা WhatsApp-এ পাঠানো হয়েছে। কোষাধ্যক্ষ যাচাই করে শীঘ্রই যোগাযোগ করবেন।',
    en: 'Your message has been sent on WhatsApp. The treasurer will verify and get back to you shortly.',
  },
  'donate.again': { bn: 'আবার', en: 'Again' },
  // page chrome — privacy/terms + "about the trust" (Phase 7 Task 1)
  'page.privacy.title': { bn: 'গোপনীয়তা ও শর্তাবলী', en: 'Privacy & terms' },
  'page.privacy.crumb': { bn: 'নীতি', en: 'Policy' },
  'page.trust.title': { bn: 'ট্রাস্ট সম্পর্কে', en: 'About the trust' },
  'page.trust.crumb': { bn: 'পরিচিতি', en: 'About' },
  'page.trust.trustees': { bn: 'ট্রাস্টিগণ', en: 'Trustees' },
  // donation/refund policy — its own pages/refund doc, shown as a #refund section on privacy.html
  'refund.title': { bn: 'দান ফেরত নীতি', en: 'Donation / refund policy' },
  // contact page
  'contact.title': { bn: 'যোগাযোগ', en: 'Contact' },
  'contact.crumb': { bn: 'যোগাযোগ', en: 'Contact' },
  'contact.name': { bn: 'আপনার নাম (ঐচ্ছিক)', en: 'Your name (optional)' },
  'contact.message': { bn: 'বার্তা', en: 'Message' },
  'contact.messagePlaceholder': { bn: 'আপনার প্রশ্ন বা বার্তা লিখুন…', en: 'Type your question or message…' },
  'contact.send': { bn: 'WhatsApp-এ পাঠান', en: 'Send on WhatsApp' },
  'contact.needMessage': { bn: 'অনুগ্রহ করে একটি বার্তা লিখুন', en: 'Please write a message' },
  // FAQ page
  'faq.title': { bn: 'সচরাচর জিজ্ঞাসা', en: 'FAQ' },
  'faq.crumb': { bn: 'প্রশ্নোত্তর', en: 'Q&A' },
  // news archive (past the home ticker's 5)
  'news.title': { bn: 'খবর ও ঘোষণা', en: 'News & updates' },
  'news.crumb': { bn: 'আর্কাইভ', en: 'Archive' },
  // downloads — every published transparency document, across years, on one page
  'downloads.title': { bn: 'ডাউনলোড', en: 'Downloads' },
  'downloads.crumb': { bn: 'নথিপত্র', en: 'Documents' },
  // 404
  'notfound.title': { bn: 'পাতাটি পাওয়া যায়নি', en: 'Page not found' },
  'notfound.crumb': { bn: '৪০৪', en: '404' },
  'notfound.home': { bn: 'হোমে ফিরুন', en: 'Back to home' },
  // Phase 7 Task 2 — share row (js/share.js), on home/gallery/events/donate/transparency/news
  'share.share': { bn: 'শেয়ার', en: 'Share' },
  'share.whatsapp': { bn: 'WhatsApp', en: 'WhatsApp' },
  'share.facebook': { bn: 'Facebook', en: 'Facebook' },
  'share.copy': { bn: 'লিংক কপি করুন', en: 'Copy link' },
  'share.copied': { bn: 'লিংক কপি হয়েছে', en: 'Link copied' },
  // Phase 7 Task 2 — .ics "add to calendar" link per event row (js/ics.js)
  'events.addToCalendar': { bn: 'ক্যালেন্ডারে যোগ', en: 'Add to calendar' },
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
  // admin — Phase 7 Task 6: audit log viewer, restore, forgot password, help links, masked reauth, search
  'admin.log': { bn: 'লগ', en: 'Log' },
  'admin.log.filter': { bn: 'কালেকশন', en: 'Collection' },
  'admin.log.all': { bn: 'সব', en: 'All' },
  'admin.log.at': { bn: 'সময়', en: 'Time' },
  'admin.log.action': { bn: 'কাজ', en: 'Action' },
  'admin.log.path': { bn: 'পাথ', en: 'Path' },
  'admin.log.uid': { bn: 'অ্যাডমিন', en: 'Admin' },
  'admin.log.details': { bn: 'বিস্তারিত', en: 'Details' },
  // admin — Phase 7 Task 7 (item 42): 📜 লগ gains an ত্রুটি (error) tab reading `errors`.
  'admin.log.tabAudit': { bn: 'অডিট', en: 'Audit' },
  'admin.log.tabErrors': { bn: 'ত্রুটি', en: 'Errors' },
  'admin.log.message': { bn: 'বার্তা', en: 'Message' },
  'admin.log.url': { bn: 'ঠিকানা', en: 'URL' },
  'admin.showDeleted': { bn: 'মুছে ফেলা দেখাও', en: 'Show deleted' },
  'admin.restore': { bn: 'পুনরুদ্ধার', en: 'Restore' },
  'admin.forgotPassword': { bn: 'পাসওয়ার্ড ভুলে গেছেন?', en: 'Forgot password?' },
  'admin.resetSent': { bn: 'রিসেট লিঙ্ক ইমেলে পাঠানো হয়েছে', en: 'Reset link sent to your email' },
  'admin.resetFailed': { bn: 'রিসেট পাঠানো যায়নি', en: 'Could not send reset link' },
  'admin.help': { bn: '?', en: '?' },
  'admin.confirm': { bn: 'ঠিক আছে', en: 'Confirm' },
  'admin.cancel': { bn: 'বাতিল', en: 'Cancel' },
  'admin.search': { bn: 'খুঁজুন…', en: 'Search…' },
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
  // admin — ⚙️ সেটিংস additions: social/estYear/credItems/metaDescription (Phase 6 Task 6)
  'admin.settings.socialHeading': { bn: 'সোশ্যাল লিঙ্ক', en: 'Social links' },
  'admin.settings.facebook': { bn: 'Facebook URL', en: 'Facebook URL' },
  'admin.settings.youtube': { bn: 'YouTube URL', en: 'YouTube URL' },
  'admin.settings.instagram': { bn: 'Instagram URL', en: 'Instagram URL' },
  'admin.settings.whatsappGroup': { bn: 'WhatsApp গ্রুপ URL', en: 'WhatsApp group URL' },
  'admin.settings.socialInvalid': { bn: 'https:// দিয়ে শুরু হতে হবে, অথবা খালি রাখুন', en: 'Must start with https:// or be left empty' },
  'admin.settings.estYear': { bn: 'প্রতিষ্ঠার বছর', en: 'Established year' },
  'admin.settings.credItems': { bn: 'বিশ্বাসযোগ্যতা strip-এর নিজস্ব আইটেম — প্রতি লাইনে: বাংলা | English', en: "Custom credibility-strip items — per line: bn | en" },
  'admin.settings.metaDescription': { bn: 'Meta description (সার্চে দেখাবে)', en: 'Meta description (shown in search results)' },
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
  // admin — ✏️ লেখা string editor (Phase 6 Task 4)
  'admin.strings': { bn: 'লেখা', en: 'Text' },
  'admin.stringsHint': {
    bn: 'সব লেখা এখানে বদলাতে পারবেন। খালি রাখলে ডিফল্ট লেখা দেখাবে। সেভ করার পর অ্যাডমিন প্যানেলের নিজের লেবেল (যেমন এই পাতার শিরোনাম) পরের রুট/রিলোডে বদলাবে, খোলা ট্যাবে সঙ্গে সঙ্গে নয়।',
    en: 'Change any text here. Leave a field blank to use the default. The admin panel\'s own labels (like this page\'s heading) update on the next route or reload, not instantly in an open tab.',
  },
  'admin.strings.search': { bn: 'খুঁজুন (key বা লেখা দিয়ে)', en: 'Search (by key or text)' },
  'admin.strings.reset': { bn: 'default-এ ফেরাও', en: 'Reset to default' },
  'admin.strings.save': { bn: 'সেভ করুন', en: 'Save' },
  'admin.strings.group.nav': { bn: 'নেভিগেশন', en: 'Navigation' },
  'admin.strings.group.common': { bn: 'সাধারণ', en: 'Common' },
  'admin.strings.group.countdown': { bn: 'কাউন্টডাউন', en: 'Countdown' },
  'admin.strings.group.live': { bn: 'লাইভ', en: 'Live' },
  'admin.strings.group.home': { bn: 'হোম', en: 'Home' },
  'admin.strings.group.about': { bn: 'ইতিহাস', en: 'History' },
  'admin.strings.group.committee': { bn: 'কমিটি', en: 'Committee' },
  'admin.strings.group.gallery': { bn: 'গ্যালারি', en: 'Gallery' },
  'admin.strings.group.events': { bn: 'অনুষ্ঠান', en: 'Events' },
  'admin.strings.group.donate': { bn: 'দান', en: 'Donate' },
  'admin.strings.group.transparency': { bn: 'হিসাব', en: 'Transparency' },
  'admin.strings.group.members': { bn: 'সদস্য', en: 'Members' },
  'admin.strings.group.footer': { bn: 'ফুটার', en: 'Footer' },
  'admin.strings.group.cred': { bn: 'বিশ্বাসযোগ্যতা', en: 'Credibility' },
  'admin.strings.group.admin': { bn: 'অ্যাডমিন', en: 'Admin' },
  'admin.strings.group.page': { bn: 'পাতা', en: 'Pages' },
  'admin.strings.group.refund': { bn: 'দান ফেরত', en: 'Refund' },
  'admin.strings.group.contact': { bn: 'যোগাযোগ', en: 'Contact' },
  'admin.strings.group.faq': { bn: 'প্রশ্নোত্তর', en: 'FAQ' },
  'admin.strings.group.news': { bn: 'খবর', en: 'News' },
  'admin.strings.group.downloads': { bn: 'ডাউনলোড', en: 'Downloads' },
  'admin.strings.group.notfound': { bn: '৪০৪', en: '404' },
  // admin — 🖼️ UI ছবি media slots (Phase 6 Task 5)
  'admin.media': { bn: 'UI ছবি', en: 'UI images' },
  'admin.media.usingArt': { bn: 'আঁকা art/ default দেখাচ্ছে', en: 'Showing drawn art / default' },
  'admin.media.remove': { bn: 'সরাও', en: 'Remove' },
  'admin.media.save': { bn: 'সেভ করুন', en: 'Save' },
  'admin.media.faviconHint': { bn: 'বর্গাকার (square) PNG সবচেয়ে ভালো দেখাবে', en: 'A square PNG works best' },
  'admin.media.ogHint': { bn: 'সংরক্ষিত — এখনও কোথাও দেখানো হয় না', en: 'Reserved — not shown anywhere yet' },
  'admin.media.nothingChanged': { bn: 'কিছু বদলায়নি', en: 'Nothing changed' },
  // admin — 🏺 সংস্কৃতি culture cards (Phase 6 Task 5)
  'admin.culture': { bn: 'সংস্কৃতি', en: 'Culture' },
  'admin.culture.title': { bn: 'শিরোনাম', en: 'Title' },
  'admin.culture.tag': { bn: 'ট্যাগ', en: 'Tag' },
  'admin.culture.text': { bn: 'বিবরণ', en: 'Text' },
  'admin.culture.image': { bn: 'ছবি', en: 'Image' },
  // admin — 📄 পাতা pages editor (Phase 7 Task 1)
  'admin.pages': { bn: 'পাতা', en: 'Pages' },
  'admin.pages.title': { bn: 'শিরোনাম', en: 'Title' },
  'admin.pages.body': {
    bn: 'লেখা (অনুমোদিত HTML: p, br, b, strong, i, em, ul, ol, li, h3, h4, a, img, blockquote)',
    en: 'Body (allowed HTML: p, br, b, strong, i, em, ul, ol, li, h3, h4, a, img, blockquote)',
  },
  // Phase 7 Task 3 — accessibility: skip link, lightbox dialog, form errors
  'a11y.skip': { bn: 'মূল অংশে যান', en: 'Skip to main content' },
  'gallery.close': { bn: 'বন্ধ করুন', en: 'Close' },
  'gallery.prev': { bn: 'আগের ছবি', en: 'Previous photo' },
  'gallery.next': { bn: 'পরের ছবি', en: 'Next photo' },
  'donate.errAmount': { bn: 'সঠিক পরিমাণ লিখুন', en: 'Enter a valid amount' },
  'mem.errPhone': { bn: 'সঠিক মোবাইল নম্বর লিখুন', en: 'Enter a valid mobile number' },
  'mem.errOtp': { bn: '৬ সংখ্যার OTP লিখুন', en: 'Enter the 6-digit OTP' },
  'admin.albums.altPlaceholder': { bn: 'অল্ট টেক্সট (স্ক্রিন রিডারের জন্য)', en: 'Alt text (for screen readers)' },
};

// --- overrides layer (Phase 6: admin can override any default above) ---
let overrides = {};
/** Read-only snapshot of the current overrides map (a shallow copy — callers may not mutate the live map). */
export function getOverrides() { return { ...overrides }; }
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
  // Phase 7 Task 1: pages & legal — privacy/trust share the generic 'page' prefix (page.privacy.*,
  // page.trust.*); refund/contact/faq/news/downloads/notfound each get their own, matching their
  // STRINGS key prefix.
  'page', 'refund', 'contact', 'faq', 'news', 'downloads', 'notfound',
  // Phase 7 Task 2: SEO & share
  'share',
  // Phase 7 Task 3: accessibility (skip link, gallery dialog controls, form-error copy)
  'a11y',
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
