import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, STRINGS } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { biField, textField, boolField, toLocalInput } from '../forms.js';
import { logAudit } from '../audit.js';

const SECTIONS = ['about', 'committee', 'gallery', 'events', 'donate', 'transparency', 'members', 'culture'];

registerSection('settings', {
  title: STRINGS['admin.settings'], icon: '⚙️',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const vis = cur.sectionVisibility ?? {};
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
    };
    const showPrefix = STRINGS['admin.settings.showPrefix'];
    const visFields = SECTIONS.map(s => boolField({ bn: `${showPrefix.bn} ${s}`, en: `${showPrefix.en} ${s}` }, `vis.${s}`, vis[s] !== false));
    const form = el('form', { class: 'card' },
      ...Object.values(f).map(x => x.node),
      el('h3', { text: t('admin.settings.visibleSections') }),
      ...visFields.map(x => x.node),
      el('button', { class: 'btn', type: 'submit', text: t('admin.saveDraft') }));
    form.onsubmit = async e => {
      e.preventDefault();
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
