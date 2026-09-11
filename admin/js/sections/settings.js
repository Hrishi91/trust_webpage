import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, STRINGS } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, boolField, toLocalInput } from '../forms.js';
import { logAudit } from '../audit.js';

const SECTIONS = ['about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members', 'culture'];
// settings.social — must match validSocial()'s whitelist in firestore.rules exactly.
const SOCIAL_KEYS = ['facebook', 'youtube', 'instagram', 'whatsappGroup'];

registerSection('settings', {
  title: STRINGS['admin.settings'], icon: '⚙️',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const vis = cur.sectionVisibility ?? {};
    const social = cur.social ?? {};
    const f = {
      name: biField(STRINGS['admin.settings.name'], 'name', cur.name),
      tagline: biField(STRINGS['admin.settings.tagline'], 'tagline', cur.tagline),
      address: biField(STRINGS['admin.settings.address'], 'address', cur.address, { multiline: true }),
      logoUrl: textField(STRINGS['admin.settings.logoUrl'], 'logoUrl', cur.logoUrl),
      mapUrl: textField(STRINGS['admin.settings.mapUrl'], 'mapUrl', cur.mapUrl),
      phone: textField(STRINGS['admin.settings.phone'], 'phone', cur.contacts?.phone),
      whatsapp: textField(STRINGS['admin.settings.whatsapp'], 'whatsapp', cur.contacts?.whatsapp),
      email: textField(STRINGS['admin.settings.email'], 'email', cur.contacts?.email, { type: 'email' }),
      regNo: textField(STRINGS['admin.settings.regNo'], 'regNo', cur.regNo),
      has80G: boolField(STRINGS['admin.settings.has80G'], 'has80G', cur.has80G),
      upiId: textField(STRINGS['admin.settings.upiId'], 'upiId', cur.upiId),
      upiQrUrl: textField(STRINGS['admin.settings.upiQrUrl'], 'upiQrUrl', cur.upiQrUrl),
      pujaDate: textField(STRINGS['admin.settings.pujaDate'], 'pujaDate', toLocalInput(cur.pujaDate), { type: 'datetime-local' }),
      theme: biField(STRINGS['home.thisTheme'], 'theme', cur.theme),
      maintenance: boolField(STRINGS['admin.settings.maintenance'], 'maintenance', cur.maintenance),
      donatePurposes: textField(STRINGS['admin.settings.donatePurposes'], 'donatePurposes', cur.donatePurposes ?? '', { multiline: true }),
      // Phase 6 Task 6: social links (validated https-or-empty client-side below and again in
      // firestore.rules' validSocial()), established year, custom credibility items, meta description.
      facebook: textField(STRINGS['admin.settings.facebook'], 'social.facebook', social.facebook, { type: 'url' }),
      youtube: textField(STRINGS['admin.settings.youtube'], 'social.youtube', social.youtube, { type: 'url' }),
      instagram: textField(STRINGS['admin.settings.instagram'], 'social.instagram', social.instagram, { type: 'url' }),
      whatsappGroup: textField(STRINGS['admin.settings.whatsappGroup'], 'social.whatsappGroup', social.whatsappGroup, { type: 'url' }),
      estYear: textField(STRINGS['admin.settings.estYear'], 'estYear', cur.estYear ?? '', { type: 'number' }),
      credItems: textField(STRINGS['admin.settings.credItems'], 'credItems', cur.credItems ?? '', { multiline: true }),
      metaDescription: biField(STRINGS['admin.settings.metaDescription'], 'metaDescription', cur.metaDescription, { multiline: true }),
    };
    const showPrefix = STRINGS['admin.settings.showPrefix'];
    const visFields = SECTIONS.map(s => boolField({ bn: `${showPrefix.bn} ${s}`, en: `${showPrefix.en} ${s}` }, `vis.${s}`, vis[s] !== false));
    const form = el('form', { class: 'card' },
      f.name.node, f.tagline.node, f.address.node, f.logoUrl.node, f.mapUrl.node,
      f.phone.node, f.whatsapp.node, f.email.node, f.regNo.node, f.has80G.node,
      f.upiId.node, f.upiQrUrl.node, f.pujaDate.node, f.theme.node, f.maintenance.node,
      f.donatePurposes.node,
      el('h3', { text: t('admin.settings.socialHeading') }),
      f.facebook.node, f.youtube.node, f.instagram.node, f.whatsappGroup.node,
      f.estYear.node, f.credItems.node, f.metaDescription.node,
      el('h3', { text: t('admin.settings.visibleSections') }),
      ...visFields.map(x => x.node),
      el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }));
    form.onsubmit = async e => {
      e.preventDefault();
      // Client-side gate on top of firestore.rules' validSocial(): each social URL is either
      // empty or https:// — validated before the reauth prompt so a bad URL never costs the
      // admin a password re-entry for a write that is going to fail anyway.
      const socialValues = { facebook: f.facebook.read(), youtube: f.youtube.read(), instagram: f.instagram.read(), whatsappGroup: f.whatsappGroup.read() };
      for (const key of SOCIAL_KEYS) {
        const v = socialValues[key];
        if (v && !v.startsWith('https://')) {
          toast(`${t(`admin.settings.${key}`)}: ${t('admin.settings.socialInvalid')}`, 'err');
          return;
        }
      }
      if (!(await ctx.reauth())) return;
      try {
        const next = {
          name: f.name.read(), tagline: f.tagline.read(), address: f.address.read(), theme: f.theme.read(),
          logoUrl: f.logoUrl.read(), mapUrl: f.mapUrl.read(),
          contacts: { phone: f.phone.read(), whatsapp: f.whatsapp.read(), email: f.email.read() },
          regNo: f.regNo.read(), has80G: f.has80G.read(), upiId: f.upiId.read(), upiQrUrl: f.upiQrUrl.read(),
          pujaDate: f.pujaDate.read() ? new Date(f.pujaDate.read()).toISOString() : '',
          maintenance: f.maintenance.read(), defaultLang: 'bn',
          donatePurposes: f.donatePurposes.read(),
          social: socialValues,
          estYear: f.estYear.read() ? Number(f.estYear.read()) : '',
          credItems: f.credItems.read(),
          metaDescription: f.metaDescription.read(),
          sectionVisibility: Object.fromEntries(SECTIONS.map((s, i) => [s, visFields[i].read()])),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, next, { merge: true });
        await logAudit(ctx, 'update', 'settings/site', cur, next);
        toast(t('admin.saved'));
      } catch (err) {
        console.error(err);
        toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
      }
    };
    box.append(form);
  },
});
