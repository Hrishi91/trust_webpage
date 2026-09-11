// js/media-slots.js — pure (no DOM, no Firebase). The fixed slot registry for content/media
// (Phase 6 "nothing static", spec §1/§3): the admin can only put an image into one of these named
// slots — layout is fixed, the picture is not. Each empty slot falls back to the existing
// hand-drawn art / ॐ mark / nothing, so an untouched site looks exactly as it does today.
export const SLOTS = [
  { id: 'hero', label: { bn: 'হিরো ছবি (প্রতিমা/ব্যানার)', en: 'Hero image' },
    where: { bn: 'হোম-এর ওপরে, আঁকা গণেশের বদলে', en: 'Home top, replaces the drawn Ganesh' },
    folder: 'public/ui/hero', max: 1600 },
  { id: 'garland', label: { bn: 'মালা স্ট্রিপ', en: 'Garland strip' },
    where: { bn: 'হোম হিরোর নিচে, আঁকা মালার বদলে', en: 'Home hero bottom, replaces the drawn garland' },
    folder: 'public/ui/garland', max: 1600 },
  { id: 'brandMark', label: { bn: 'ব্র্যান্ড মার্ক', en: 'Brand mark' },
    where: { bn: 'নেভিগেশনে, ॐ চিহ্নের বদলে', en: 'Nav bar, replaces the ॐ mark' },
    folder: 'public/ui/brand', max: 1600 },
  { id: 'favicon', label: { bn: 'ফেভিকন', en: 'Favicon' },
    where: { bn: 'ব্রাউজার ট্যাব আইকন', en: 'Browser tab icon' },
    folder: 'public/ui/favicon', max: 1600 },
  { id: 'ogImage', label: { bn: 'শেয়ার ছবি (OG)', en: 'Share image (OG)' },
    where: { bn: 'সাইটের লিঙ্ক শেয়ার করলে', en: 'Shown when the site link is shared' },
    folder: 'public/ui/og', max: 1600 },
  { id: 'donateBand', label: { bn: 'দান-ব্যান্ড ছবি', en: 'Donate-band image' },
    where: { bn: 'হোমে দানের অংশে', en: 'Home page, donate band section' },
    folder: 'public/ui/donate-band', max: 1600 },
  { id: 'membersTeaser', label: { bn: 'সদস্য-অংশের ছবি', en: 'Members-teaser image' },
    where: { bn: 'হোমে সদস্যদের অংশে', en: 'Home page, members teaser section' },
    folder: 'public/ui/members-teaser', max: 1600 },
  { id: 'header.about', label: { bn: 'ইতিহাস পাতার হেডার ছবি', en: 'History page header image' },
    where: { bn: 'ইতিহাস পাতার ওপরে', en: 'Top of the history page' },
    folder: 'public/ui/header-about', max: 1600 },
  { id: 'header.committee', label: { bn: 'কমিটি পাতার হেডার ছবি', en: 'Committee page header image' },
    where: { bn: 'কমিটি পাতার ওপরে', en: 'Top of the committee page' },
    folder: 'public/ui/header-committee', max: 1600 },
  { id: 'header.gallery', label: { bn: 'গ্যালারি পাতার হেডার ছবি', en: 'Gallery page header image' },
    where: { bn: 'গ্যালারি পাতার ওপরে', en: 'Top of the gallery page' },
    folder: 'public/ui/header-gallery', max: 1600 },
  { id: 'header.events', label: { bn: 'অনুষ্ঠান পাতার হেডার ছবি', en: 'Events page header image' },
    where: { bn: 'অনুষ্ঠান পাতার ওপরে', en: 'Top of the events page' },
    folder: 'public/ui/header-events', max: 1600 },
  { id: 'header.donate', label: { bn: 'দান পাতার হেডার ছবি', en: 'Donate page header image' },
    where: { bn: 'দান পাতার ওপরে', en: 'Top of the donate page' },
    folder: 'public/ui/header-donate', max: 1600 },
  { id: 'header.transparency', label: { bn: 'হিসাব পাতার হেডার ছবি', en: 'Transparency page header image' },
    where: { bn: 'হিসাব পাতার ওপরে', en: 'Top of the transparency page' },
    folder: 'public/ui/header-transparency', max: 1600 },
  { id: 'header.members', label: { bn: 'সদস্য পাতার হেডার ছবি', en: 'Members page header image' },
    where: { bn: 'সদস্য পাতার ওপরে', en: 'Top of the members page' },
    folder: 'public/ui/header-members', max: 1600 },
];

/**
 * media[id] → its URL, but only when it is a non-empty https:// string. Anything else (absent
 * slot, wrong protocol, non-string Firestore garbage) returns '' so callers can just do
 * `mediaUrl(media, 'hero') || fallbackArt()` without an extra type check.
 */
export function mediaUrl(media, id) {
  const v = media?.[id];
  return typeof v === 'string' && v.startsWith('https://') ? v : '';
}
