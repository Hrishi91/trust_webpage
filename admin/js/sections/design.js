import { registerSection } from '../admin.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../../../js/firebase.js';
import { t, pick } from '../../../js/i18n.js';
import { el, toast } from '../../../js/ui.js';
import {
  THEMES, THEME_META, resolveTheme, applyTheme, applyOverrides, clearOverrides, OVERRIDE_KEYS, FONTS,
} from '../../../js/theme.js';
import { orderSections } from '../../../js/sections.js';
import { contrast } from '../../../js/contrast.js';
import { logAudit } from '../audit.js';

const HEX = /^#[0-9a-fA-F]{6}$/;
// camelCase -> kebab-case, matching js/theme.js's private KEBAB map exactly (ctaInk -> cta-ink,
// heroAccent -> hero-accent, tickerInk -> ticker-ink; every other OVERRIDE_KEYS entry is already
// lowercase and passes through unchanged) — kept local since theme.js does not export that map.
const kebab = key => key.replace(/([A-Z])/g, '-$1').toLowerCase();
// Live contrast badge pairs (spec: "a contrast badge computed live ... against its ground pair").
// [ground key, WCAG minimum] — 4.5 for normal text, 3.0 for large/bold text (cta-ink, durva).
const GROUND = {
  ink: ['ivory', 4.5], muted: ['ivory', 4.5], ctaInk: ['cta', 3.0],
  heroAccent: ['bg', 4.5], tickerInk: ['sindoor', 4.5], sindoor: ['ivory', 4.5], durva: ['card', 3.0],
};

// `def` is named (not passed inline to registerSection) so the apply-click handler below can
// re-invoke `def.render(box, ctx)` after a successful write, instead of relying on `this` —
// admin.js calls sections as `def.render(box, ctx)` so `this` would in fact resolve correctly,
// but the click handler is an arrow function nested inside render() and re-invoking through the
// captured `def` reference is simpler to reason about than tracking `this` through that closure.
const def = {
  title: 'admin.design', titleKey: 'admin.design', icon: '🎨',
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
          applyTheme(name);
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

    // --- colour/font/home-section overrides (Phase 6 Task 6) ---
    // The "theme's own value" shown as each row's placeholder/starting swatch must be the token
    // CSS actually resolves to with NO override applied — clearOverrides() strips the inline
    // custom properties admin.js's startup already stamped on <html>, getComputedStyle() then
    // reads the plain per-theme CSS, and applyOverrides() below restores exactly what was live a
    // moment ago so the rest of the admin UI (and this render) is not visibly affected.
    clearOverrides();
    const rootStyle = getComputedStyle(document.documentElement);
    const defaults = {};
    for (const key of OVERRIDE_KEYS) defaults[key] = (rootStyle.getPropertyValue(`--${kebab(key)}`) || '#000000').trim();
    applyOverrides(cur.designOverrides, cur.fonts);

    const badgeEls = {};
    function effective(key) {
      const v = colourState[key]?.text.value.trim();
      return v && HEX.test(v) ? v : defaults[key];
    }
    function updateBadges() {
      for (const [key, [ground, min]] of Object.entries(GROUND)) {
        const ratio = contrast(effective(key), effective(ground));
        const b = badgeEls[key];
        b.textContent = `${ratio >= min ? '✓' : '⚠'} ${ratio.toFixed(1)}`;
        b.className = `badge ${ratio >= min ? 'ok' : 'warn'}`;
      }
    }
    const colourState = {};
    const colourRows = OVERRIDE_KEYS.map(key => {
      const stored = cur.designOverrides?.[key] ?? '';
      const text = el('input', { type: 'text', maxlength: 7, pattern: '#[0-9a-fA-F]{6}', placeholder: defaults[key], value: stored });
      const color = el('input', { type: 'color', value: HEX.test(stored) ? stored : defaults[key] });
      colourState[key] = { text, color };
      color.oninput = () => { text.value = color.value; updateBadges(); };
      text.oninput = () => { const v = text.value.trim(); if (HEX.test(v)) color.value = v; updateBadges(); };
      const hasGround = Object.prototype.hasOwnProperty.call(GROUND, key);
      const badge = el('span', { class: 'badge', text: '—' });
      if (hasGround) badgeEls[key] = badge;
      const reset = el('button', { class: 'btn-sm secondary', type: 'button', text: t('admin.design.resetColour') });
      reset.onclick = () => { text.value = ''; color.value = defaults[key]; updateBadges(); };
      return el('div', { class: 'colour-row', 'data-key': key },
        el('span', { text: t(`admin.design.colour.${key}`) }),
        el('div', { class: 'row' }, color, text),
        badge, reset);
    });
    updateBadges();

    const fontSelects = {};
    const fontsBlock = ['display', 'body'].map(slot => {
      const select = el('select', { name: `fonts.${slot}` });
      select.append(el('option', { value: '', text: t('admin.design.fontsTheme') }), ...FONTS.map(f => el('option', { value: f, text: f })));
      select.value = FONTS.includes(cur.fonts?.[slot]) ? cur.fonts[slot] : '';
      fontSelects[slot] = select;
      return el('label', {}, el('span', { text: t(`admin.design.fonts.${slot}`) }), select);
    });

    // ↑/↓ move the row's DOM node between its siblings; save reads the final DOM order directly
    // (js/sections.js's own on-disk shape is {key, on}, so no separate index bookkeeping is needed).
    const list = el('div', { class: 'rows-list' });
    for (const { key, on } of orderSections(cur.homeSections)) {
      const cb = el('input', { type: 'checkbox', name: `sec.${key}` }); cb.checked = on;
      const up = el('button', { class: 'btn-sm', type: 'button', text: t('admin.up') });
      const down = el('button', { class: 'btn-sm', type: 'button', text: t('admin.down') });
      const row = el('div', { class: 'sec-row', 'data-key': key }, cb, el('span', { text: t(`admin.design.section.${key}`) }), up, down);
      up.onclick = () => { const prev = row.previousElementSibling; if (prev) list.insertBefore(row, prev); };
      down.onclick = () => { const next = row.nextElementSibling; if (next) list.insertBefore(next, row); };
      list.append(row);
    }

    const saveBtn = el('button', { class: 'btn', type: 'button', text: t('admin.design.saveOverrides') });
    saveBtn.onclick = async () => {
      // A non-empty colour text input that isn't a valid #rrggbb is a typo, not "use the theme" —
      // silently dropping it (the old behaviour) let an admin believe a colour was saved when it
      // never reached designOverrides at all. Caught before reauth so a bad hex code never costs a
      // password re-entry for a write that was never going to include it anyway.
      for (const key of OVERRIDE_KEYS) {
        const v = colourState[key].text.value.trim();
        if (v && !HEX.test(v)) { toast(`${t('admin.design.invalidHex')} ${t(`admin.design.colour.${key}`)}`, 'err'); return; }
      }
      if (!(await ctx.reauth())) return;
      try {
        const designOverrides = {};
        for (const key of OVERRIDE_KEYS) {
          const v = colourState[key].text.value.trim();
          if (HEX.test(v)) designOverrides[key] = v;
        }
        const fonts = { display: fontSelects.display.value, body: fontSelects.body.value };
        const homeSections = [...list.children].map(row => ({ key: row.dataset.key, on: row.querySelector('input[type=checkbox]').checked }));
        const before = { designOverrides: cur.designOverrides ?? {}, fonts: cur.fonts ?? { display: '', body: '' }, homeSections: cur.homeSections ?? [] };
        const after = { designOverrides, fonts, homeSections };
        // updateDoc (not setDoc merge:true) — a merged write only merges MAP FIELDS by key, so a
        // colour row cleared back to "use theme" would never actually leave designOverrides;
        // updateDoc replaces designOverrides/fonts/homeSections wholesale, which is what "the row
        // left empty is omitted" requires. updateDoc() also requires the target document to already
        // exist (unlike setDoc's create-or-merge) — settings/site is seeded on production and by
        // tests/seed/seed.js before any admin ever reaches this card, so that precondition always
        // holds in practice; it is not re-created here.
        await updateDoc(ref, { designOverrides, fonts, homeSections, updatedAt: serverTimestamp() });
        await logAudit(ctx, 'update', 'settings/site', before, after);
        applyOverrides(designOverrides, fonts);
        toast(t('admin.saved'));
        box.replaceChildren();
        await def.render(box, ctx);
      } catch (err) {
        console.error(err);
        toast(err && err.code === 'permission-denied' && !ctx.user.emailVerified ? t('admin.emailUnverified') : t('common.error'), 'err');
      }
    };

    const overridesCard = el('div', { class: 'card' },
      el('h3', { text: t('admin.design.colours') }),
      el('p', { class: 'muted', text: t('admin.design.colourHint') }),
      ...colourRows,
      el('h3', { text: t('admin.design.fonts') }),
      ...fontsBlock,
      el('h3', { text: t('admin.design.homeSections') }),
      el('p', { class: 'muted', text: t('admin.design.homeSectionsHint') }),
      list,
      el('div', { class: 'savebar' }, saveBtn));

    box.append(el('p', { class: 'muted', text: t('admin.designHint') }), grid, overridesCard);
  },
};
registerSection('design', def);
