import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import { THEMES, THEME_META, resolveTheme } from '../../../js/theme.js';
import { logAudit } from '../audit.js';

// `def` is named (not passed inline to registerSection) so the apply-click handler below can
// re-invoke `def.render(box, ctx)` after a successful write, instead of relying on `this` —
// admin.js calls sections as `def.render(box, ctx)` so `this` would in fact resolve correctly,
// but the click handler is an arrow function nested inside render() and re-invoking through the
// captured `def` reference is simpler to reason about than tracking `this` through that closure.
const def = {
  title: { bn: 'ডিজাইন', en: 'Design' }, icon: '🎨',
  async render(box, ctx) {
    const ref = doc(ctx.db, 'settings', 'site');
    const cur = (await getDoc(ref)).data() ?? {};
    const current = resolveTheme(cur.design);
    const grid = el('div', { class: 'theme-grid' }, ...THEMES.map(name => {
      const meta = THEME_META[name];
      const applyBtn = el('button', { class: 'btn apply', type: 'button', text: name === current ? t('admin.designCurrent') : t('admin.designApply'), disabled: name === current });
      applyBtn.onclick = async () => {
        if (!(await ctx.reauth())) return;
        try {
          const next = { design: name, updatedAt: serverTimestamp() };
          await setDoc(ref, next, { merge: true });
          await logAudit(ctx, 'update', 'settings/site', { design: cur.design ?? null }, { design: name });
          toast(t('admin.saved'));
          box.replaceChildren();
          await def.render(box, ctx);
        } catch (err) {
          console.error(err);
          toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
        }
      };
      return el('div', { class: `card theme-tile${name === current ? ' current' : ''}`, 'data-theme-name': name },
        el('div', { class: 'swatch', 'data-theme': name }, el('i', { class: 's1' }), el('i', { class: 's2' }), el('i', { class: 's3' }), el('i', { class: 's4' })),
        el('h3', { text: pick(meta.name) }), el('p', { class: 'muted', text: pick(meta.desc) }),
        el('div', { class: 'row' }, el('a', { class: 'btn secondary', href: `../index.html?theme=${name}`, target: '_blank', rel: 'noopener', text: t('admin.designPreview') }), applyBtn));
    }));
    box.append(el('p', { class: 'muted', text: t('admin.designHint') }), grid);
  },
};
registerSection('design', def);
