// Code defaults for pages/{id} docs (Phase 7 Task 1 — "nothing static": same pattern as
// js/culture.js). getPage(id) in js/content.js falls back to these when the Firestore doc is
// absent or unpublished, so every one of these seven pages + the 404 page always renders real
// copy, never a blank admin-only draft. Bodies are rich HTML — only the tags js/rich.js allows
// (p, br, b, strong, i, em, ul, ol, li, h3, h4, a, blockquote) are ever rendered.
const bi = (bn, en) => ({ bn, en });

export const PAGE_DEFAULTS = {
  privacy: {
    title: bi('গোপনীয়তা ও শর্তাবলী', 'Privacy & terms'),
    body: bi(
      '<h3>গোপনীয়তা নীতি</h3>' +
      '<p>গণেশ পুজো ট্রাস্ট (বালুরঘাট, দক্ষিণ দিনাজপুর) এই ওয়েবসাইটে যে তথ্য রাখে, তা এখানে জানানো হলো।</p>' +
      '<h4>আমরা কী তথ্য রাখি</h4>' +
      '<ul>' +
      '<li>দাতার নাম, দানের পরিমাণ ও তারিখ — দাতা রাজি হলে তবেই পাবলিক দাতা-তালিকায় দেখানো হয়, নয়তো শুধু ট্রাস্টের হিসাবের খাতায় থাকে।</li>' +
      '<li>সদস্যদের ফোন নম্বর — শুধু সদস্য পোর্টালে লগইনের জন্য ব্যবহৃত হয়, প্রকাশ্যে দেখানো হয় না।</li>' +
      '<li>অ্যাডমিন প্যানেলে কে কী পরিবর্তন করলেন তার একটি লগ (audit log) রাখা হয়, শুধু ট্রাস্টের নিজস্ব ব্যবস্থাপনার জন্য।</li>' +
      '</ul>' +
      '<p>এই তথ্য বিজ্ঞাপনদাতা বা অন্য কোনো তৃতীয় পক্ষের সঙ্গে ভাগ করা হয় না। যতদিন ট্রাস্ট সক্রিয় থাকবে, হিসাবের প্রমাণ হিসেবে ততদিন রাখা হয়। আপনার তথ্য মুছে ফেলতে চাইলে নিচের যোগাযোগ মাধ্যমে (WhatsApp/ইমেল) জানান।</p>' +
      '<h3>ব্যবহারের শর্তাবলী</h3>' +
      '<p>এই ওয়েবসাইট শুধু তথ্য জানানোর জন্য। এখানে দেওয়া তথ্য যথাসাধ্য সঠিক রাখার চেষ্টা করা হয়, তবে কোনো নিশ্চয়তা ছাড়াই ("as is") দেওয়া হয়। ওয়েবসাইট ব্যবহারের ফলে কোনো ক্ষতি হলে ট্রাস্ট দায়ী থাকবে না।</p>',
      '<h3>Privacy policy</h3>' +
      '<p>Ganesh Puja Trust (Balurghat, Dakshin Dinajpur) publishes here what it holds on this website.</p>' +
      '<h4>What we hold</h4>' +
      '<ul>' +
      '<li>Donor name, donation amount and date — shown on the public donor wall only when the donor agrees; otherwise it stays only in the trust\'s own accounts.</li>' +
      '<li>Members\' phone numbers — used only to sign in to the members portal, never shown publicly.</li>' +
      '<li>An audit log of who changed what in the admin panel, kept only for the trust\'s own management.</li>' +
      '</ul>' +
      '<p>This data is never shared with advertisers or any other third party. It is kept as long as the trust is active, as proof for its accounts. To ask us to delete your data, use the WhatsApp/email contact below.</p>' +
      '<h3>Terms of use</h3>' +
      '<p>This website is for information only. We try to keep everything here accurate, but it is provided "as is" with no warranty. The trust is not liable for any loss arising from using this website.</p>',
    ),
  },
  refund: {
    title: bi('দান ফেরত নীতি', 'Donation / refund policy'),
    body: bi(
      '<p>UPI-তে টাকা পাঠাতে গিয়ে ভুল হলে (ভুল পরিমাণ পাঠানো, ভুল করে ট্রাস্টের আইডিতে টাকা চলে আসা ইত্যাদি), আমরা তা ফেরত দিতে প্রস্তুত।</p>' +
      '<ul>' +
      '<li>ভুল করে পাঠানো টাকার কথা <b>৭ দিনের মধ্যে</b> WhatsApp-এ জানাতে হবে, লেনদেনের প্রমাণসহ (transaction ID/স্ক্রিনশট)।</li>' +
      '<li>কোষাধ্যক্ষ লেনদেন যাচাই করার পর, একই UPI আইডিতে টাকা ফেরত পাঠানো হবে।</li>' +
      '<li>এই নীতি শুধু ভুল করে পাঠানো টাকার জন্য — স্বেচ্ছায় দেওয়া দান ফেরতযোগ্য নয়।</li>' +
      '</ul>',
      '<p>If a UPI transfer to us was a mistake (wrong amount, or money sent to the trust by accident), we are happy to return it.</p>' +
      '<ul>' +
      '<li>Report a mistaken transfer on WhatsApp within <b>7 days</b>, with proof of the transaction (transaction ID/screenshot).</li>' +
      '<li>Once the treasurer verifies the transaction, the amount is returned to the same UPI ID.</li>' +
      '<li>This policy covers mistaken transfers only — a donation given intentionally is not refundable.</li>' +
      '</ul>',
    ),
  },
  trust: {
    title: bi('ট্রাস্ট সম্পর্কে', 'About the trust'),
    body: bi(
      '<h3>আমাদের উদ্দেশ্য</h3>' +
      '<p>গণেশ পুজো ট্রাস্ট বালুরঘাট, দক্ষিণ দিনাজপুরের একটি স্থানীয় উদ্যোগ, ২০২১ সালে শুরু হয়েছিল প্রতিবছর গণেশ পুজো সবাইকে নিয়ে, স্বচ্ছভাবে আয়োজন করার লক্ষ্যে।</p>' +
      '<h4>ট্রাস্টি ও স্বেচ্ছাসেবক</h4>' +
      '<p>ট্রাস্টের সিদ্ধান্ত নেন ট্রাস্টিরা (নিচে তালিকা); পুজোর দিনগুলোয় কমিটির সদস্য ও স্বেচ্ছাসেবকরা কাজ করেন — তাঁদের পরিচয় কমিটি পাতায় আছে।</p>' +
      '<h4>দানের টাকা কোথায় যায়</h4>' +
      '<p>প্রতিমা, মণ্ডপ, ভোগ, আলো-শব্দ ইত্যাদি খরচে — পুরো হিসাব হিসাব পাতায় বছরভিত্তিক দেওয়া আছে।</p>' +
      '<p>ট্রাস্টের সরকারি রেজিস্ট্রেশন প্রক্রিয়াধীন।</p>',
      '<h3>Our purpose</h3>' +
      '<p>Ganesh Puja Trust is a local initiative in Balurghat, Dakshin Dinajpur, started in 2021 to run the Ganesh Puja every year with everyone\'s participation, transparently.</p>' +
      '<h4>Trustees and volunteers</h4>' +
      '<p>Trustees (listed below) make the trust\'s decisions; committee members and volunteers do the work on puja days — see the committee page for who they are.</p>' +
      '<h4>Where donations go</h4>' +
      '<p>The idol, pandal, bhog, lights and sound, and similar costs — the full year-by-year accounts are on the transparency page.</p>' +
      '<p>The trust\'s formal registration is in progress.</p>',
    ),
  },
  contact: {
    title: bi('যোগাযোগ', 'Contact'),
    body: bi(
      '<p>যেকোনো প্রশ্ন, পরামর্শ বা অভিযোগ থাকলে নিচের যেকোনো মাধ্যমে যোগাযোগ করুন, অথবা নিচের ফর্ম পূরণ করে সরাসরি WhatsApp-এ বার্তা পাঠান।</p>',
      '<p>For any question, suggestion or complaint, reach us through any of the details below, or use the form to send a message straight to WhatsApp.</p>',
    ),
  },
  faq: {
    title: bi('সচরাচর জিজ্ঞাসা', 'FAQ'),
    body: bi(
      '<h4>ট্রাস্টের 80G সার্টিফিকেট আছে কি?</h4><p>এখনও নেই — রেজিস্ট্রেশন প্রক্রিয়াধীন। সার্টিফিকেট পেলে এই পাতা ও হিসাব পাতায় জানানো হবে।</p>' +
      '<h4>দানের টাকা কোথায় খরচ হয়?</h4><p>প্রতিমা, মণ্ডপ, ভোগ ইত্যাদিতে — পুরো হিসাব হিসাব পাতায় বছরভিত্তিক আছে।</p>' +
      '<h4>কীভাবে দান করব?</h4><p>দান পাতা থেকে UPI-তে সরাসরি পাঠাতে পারেন, অথবা QR কোড স্ক্যান করে।</p>' +
      '<h4>কীভাবে সদস্য হবো?</h4><p>WhatsApp বা ইমেলে যোগাযোগ করুন — কমিটি কথা বলে সদস্য করে নেবে।</p>' +
      '<h4>পুজো কবে?</h4><p>হোম পাতায় কাউন্টডাউন ও অনুষ্ঠান পাতায় দিনক্ষণ দেওয়া আছে।</p>' +
      '<h4>স্বেচ্ছাসেবক হতে পারব কি?</h4><p>অবশ্যই — যোগাযোগ পাতা থেকে জানান, পুজোর আগে ডিউটি ভাগ করে দেওয়া হবে।</p>' +
      '<h4>হিসাব কীভাবে দেখব?</h4><p>হিসাব পাতায় বছরভিত্তিক আয়-ব্যয় ও নথি দেওয়া আছে; সব নথি এক জায়গায় ডাউনলোড পাতায়ও পাবেন।</p>' +
      '<h4>যোগাযোগ কীভাবে করব?</h4><p>ফোন, WhatsApp, ইমেল অথবা যোগাযোগ পাতার ফর্ম থেকে।</p>',
      '<h4>Does the trust have 80G status?</h4><p>Not yet — registration is in progress. This page and the transparency page will be updated once it comes through.</p>' +
      '<h4>Where does the donated money go?</h4><p>The idol, pandal, bhog, and similar costs — full year-by-year accounts are on the transparency page.</p>' +
      '<h4>How do I donate?</h4><p>Send directly via UPI from the donate page, or scan the QR code there.</p>' +
      '<h4>How do I become a member?</h4><p>Reach us on WhatsApp or email — the committee will get in touch and sign you up.</p>' +
      '<h4>When is the puja?</h4><p>See the countdown on the home page and the exact dates on the events page.</p>' +
      '<h4>Can I volunteer?</h4><p>Yes — let us know via the contact page and duties are shared out before the puja.</p>' +
      '<h4>How do I see the accounts?</h4><p>The transparency page has year-by-year income/expense and documents; every document is also on the downloads page.</p>' +
      '<h4>How do I get in touch?</h4><p>Phone, WhatsApp, email, or the form on the contact page.</p>',
    ),
  },
  news: {
    title: bi('খবর ও ঘোষণা', 'News & updates'),
    body: bi('<p>সব ঘোষণা এখানে, নতুন থেকে পুরনো ক্রমে — হোম পাতার টিকার-এ শুধু সাম্প্রতিক কটি দেখা যায়।</p>',
             '<p>Every announcement is here, newest first — the home page ticker only shows the most recent few.</p>'),
  },
  downloads: {
    title: bi('ডাউনলোড', 'Downloads'),
    body: bi('<p>ট্রাস্টের সব প্রকাশিত নথি (অডিট রিপোর্ট, ট্রাস্ট দলিল, সার্টিফিকেট) এক জায়গায়।</p>',
             '<p>Every document the trust has published (audit reports, the trust deed, certificates) in one place.</p>'),
  },
  notfound: {
    title: bi('পাতাটি পাওয়া যায়নি', 'Page not found'),
    body: bi('<p>এই লিংকটি হয়তো ভুল, অথবা পাতাটি সরিয়ে ফেলা হয়েছে। নিচে থেকে হোমে ফিরে যান।</p>',
             '<p>This link may be wrong, or the page has been removed. Go back home below.</p>'),
  },
};
