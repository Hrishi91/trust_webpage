import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, boolField, toLocalInput } from '../forms.js';
import { logAudit } from '../audit.js';

const SECTIONS = ['about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members'];

registerSection('settings', {
  title: { bn: 'সেটিংস', en: 'Settings' }, icon: '⚙️',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const vis = cur.sectionVisibility ?? {};
    const f = {
      name: biField({ bn: 'ট্রাস্টের নাম', en: 'Trust name' }, 'name', cur.name),
      tagline: biField({ bn: 'ট্যাগলাইন', en: 'Tagline' }, 'tagline', cur.tagline),
      address: biField({ bn: 'ঠিকানা', en: 'Address' }, 'address', cur.address, { multiline: true }),
      logoUrl: textField({ bn: 'লোগো URL', en: 'Logo URL' }, 'logoUrl', cur.logoUrl),
      mapUrl: textField({ bn: 'Google Maps লিঙ্ক', en: 'Google Maps link' }, 'mapUrl', cur.mapUrl),
      phone: textField({ bn: 'ফোন', en: 'Phone' }, 'phone', cur.contacts?.phone),
      whatsapp: textField({ bn: 'WhatsApp নম্বর (91 সহ)', en: 'WhatsApp number (with 91)' }, 'whatsapp', cur.contacts?.whatsapp),
      email: textField({ bn: 'ইমেল', en: 'Email' }, 'email', cur.contacts?.email, { type: 'email' }),
      regNo: textField({ bn: 'রেজিস্ট্রেশন নম্বর', en: 'Registration no.' }, 'regNo', cur.regNo),
      has80G: boolField({ bn: '80G আছে', en: 'Has 80G' }, 'has80G', cur.has80G),
      upiId: textField({ bn: 'UPI ID', en: 'UPI ID' }, 'upiId', cur.upiId),
      upiQrUrl: textField({ bn: 'UPI QR ছবির URL', en: 'UPI QR image URL' }, 'upiQrUrl', cur.upiQrUrl),
      pujaDate: textField({ bn: 'পুজোর তারিখ-সময়', en: 'Puja date-time' }, 'pujaDate', toLocalInput(cur.pujaDate), { type: 'datetime-local' }),
      theme: biField({ bn: 'এই বছরের থিম', en: "This year's theme" }, 'theme', cur.theme),
      maintenance: boolField({ bn: 'Maintenance mode (সাইট বন্ধ)', en: 'Maintenance mode' }, 'maintenance', cur.maintenance),
    };
    const visFields = SECTIONS.map(s => boolField({ bn: `দেখাও: ${s}`, en: `Show: ${s}` }, `vis.${s}`, vis[s] !== false));
    const form = el('form', { class: 'card' },
      ...Object.values(f).map(x => x.node),
      el('h3', { text: pick({ bn: 'কোন সেকশন দেখা যাবে', en: 'Visible sections' }) }),
      ...visFields.map(x => x.node),
      el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }));
    form.onsubmit = async e => {
      e.preventDefault();
      if (!(await ctx.reauth())) return;
      const next = {
        name: f.name.read(), tagline: f.tagline.read(), address: f.address.read(), theme: f.theme.read(),
        logoUrl: f.logoUrl.read(), mapUrl: f.mapUrl.read(),
        contacts: { phone: f.phone.read(), whatsapp: f.whatsapp.read(), email: f.email.read() },
        regNo: f.regNo.read(), has80G: f.has80G.read(), upiId: f.upiId.read(), upiQrUrl: f.upiQrUrl.read(),
        pujaDate: f.pujaDate.read() ? new Date(f.pujaDate.read()).toISOString() : '',
        maintenance: f.maintenance.read(), defaultLang: 'bn',
        sectionVisibility: Object.fromEntries(SECTIONS.map((s, i) => [s, visFields[i].read()])),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, next, { merge: true });
      await logAudit(ctx, 'update', 'settings/site', cur, next);
      toast(t('admin.saved'));
    };
    box.append(form);
  },
});
