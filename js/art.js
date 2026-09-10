// js/art.js — hand-drawn art, coloured from the live CSS tokens so it follows the theme.
// Ported from docs/design/concept/full-site-concept.html: the Ganesh SVG (lines 338-379),
// one diya SVG (line 380), and the canvas painters `setup`/`rng`/`css`/`heroBg`/`garland`
// (lines 672-722) and `phBg` (lines 756-758). `scene()` (723-755) is not ported — production
// uses real photos there (Task 6+).
// The SVG literals below are CONSTANT strings authored in that concept file; they contain
// no user data. DOMParser (not innerHTML) is used so the "no innerHTML outside rich.js"
// rule keeps its one-file meaning.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const theme = () => document.documentElement.dataset.theme || 'siddhi';
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
function setup(c) {
  const r = c.getBoundingClientRect(), d = dpr();
  c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  return [g, r.width, r.height];
}
const svgFrom = str => new DOMParser().parseFromString(str, 'image/svg+xml').documentElement;

const GANESH = `<svg xmlns="http://www.w3.org/2000/svg" class="ganesh" viewBox="0 0 420 500" fill="none" stroke="var(--gold)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-label="সিদ্ধিদাতা গণেশ">
        <circle cx="210" cy="230" r="196" stroke="var(--gold)" stroke-opacity=".28" stroke-width="1.2"/>
        <circle cx="210" cy="230" r="170" stroke="var(--gold)" stroke-opacity=".18" stroke-width="1" stroke-dasharray="3 7"/>
        <!-- crown -->
        <path d="M150 120 L160 78 L182 104 L210 60 L238 104 L260 78 L270 120"/>
        <path d="M148 128 Q210 108 272 128"/>
        <circle cx="210" cy="74" r="5" fill="var(--pitambar)" stroke="none"/>
        <!-- head -->
        <path d="M146 150 C146 108 274 108 274 150 C280 200 262 228 210 236 C158 228 140 200 146 150 Z"/>
        <!-- ears -->
        <path d="M148 158 C100 120 60 172 84 214 C100 244 138 244 152 214"/>
        <path d="M272 158 C320 120 360 172 336 214 C320 244 282 244 268 214"/>
        <path d="M112 176 C96 190 100 214 118 220" stroke-opacity=".6" stroke-width="2"/>
        <path d="M308 176 C324 190 320 214 302 220" stroke-opacity=".6" stroke-width="2"/>
        <!-- tilak -->
        <path d="M210 128 v22"/><circle cx="210" cy="124" r="3.5" fill="var(--sindoor)" stroke="none"/>
        <!-- eyes -->
        <path d="M176 176 q12 -10 24 0"/><path d="M220 176 q12 -10 24 0"/>
        <!-- trunk: curves left, ends in a curl (vamamukhi) -->
        <path d="M210 236 C214 270 200 292 178 306 C150 324 138 356 158 378 C172 394 196 386 196 368 C196 356 184 352 178 360"/>
        <!-- tusk -->
        <path d="M238 240 C252 250 258 266 250 282"/>
        <path d="M188 244 C182 250 180 258 184 262" stroke-opacity=".6"/>
        <!-- body -->
        <path d="M136 300 C96 330 92 396 118 432 C150 474 270 474 302 432 C328 396 324 330 284 300"/>
        <path d="M150 348 C170 336 250 336 270 348" stroke-opacity=".5" stroke-width="2"/>
        <!-- right hand: abhaya (raised palm) -->
        <path d="M300 300 C332 292 352 262 344 236 M344 236 v-22 M334 232 v-22 M354 234 v-22 M324 240 v-18"/>
        <!-- left hand with modak -->
        <path d="M122 300 C96 296 78 318 92 340"/>
        <path d="M84 344 l16 -22 l16 22 z" fill="var(--pitambar)" fill-opacity=".9" stroke="var(--gold)" stroke-width="2"/>
        <!-- lotus base -->
        <path d="M120 446 C150 428 170 456 210 440 C250 456 270 428 300 446"/>
        <path d="M104 462 C150 440 180 470 210 452 C240 470 270 440 316 462"/>
        <!-- mouse (mushak) -->
        <path d="M318 470 c-12 -16 -34 -12 -36 6 c-1 12 12 16 22 12 M280 486 c-8 8 -16 4 -20 -6" stroke-width="2.4"/>
        <circle cx="300" cy="462" r="4" fill="none" stroke-width="2"/><circle cx="311" cy="474" r="1.6" fill="var(--gold)" stroke="none"/>
      </svg>`;
const DIYA = `<svg xmlns="http://www.w3.org/2000/svg" class="diya" viewBox="0 0 34 40"><path class="fl" d="M17 4 C22 12 24 16 20 22 C18 25 16 25 14 22 C10 16 12 12 17 4 Z" fill="var(--pitambar)"/><path d="M6 28 h22 c0 6 -5 9 -11 9 s-11 -3 -11 -9 z" fill="var(--sindoor)"/><path d="M4 27 h26" stroke="var(--gold)" stroke-width="1.5"/></svg>`;

export function ganeshSvg() { return svgFrom(GANESH); }
export function diyaSvg() { return svgFrom(DIYA); }

/** Hero background: theme-specific mandala/mask/river/frieze art behind the Ganesh art. */
export function paintHero(c) {
  const [g, W, H] = setup(c); const t = theme();
  const bg = css('--bg'), bg2 = css('--bg2'), gold = css('--gold'), glow = css('--glow'), sind = css('--sindoor'), pit = css('--pitambar'), durva = css('--durva');
  const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, bg2); lg.addColorStop(1, bg); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  const cx = W * (W > 900 ? 0.74 : 0.5), cy = H * (W > 900 ? 0.5 : 0.3);
  if (t === 'siddhi' || t === 'dhokra') {
    // mandala rings + glow + bokeh
    g.save(); g.translate(cx, cy); g.strokeStyle = t === 'dhokra' ? 'rgba(201,150,43,.22)' : 'rgba(190,160,255,.16)'; g.lineWidth = 1;
    for (let ring = 0; ring < 6; ring++) { const R = 120 + ring * 58, n = 16 + ring * 6; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.save(); g.rotate(a); g.beginPath(); g.moveTo(R - 26, 0); g.quadraticCurveTo(R - 8, -13, R + 10, 0); g.quadraticCurveTo(R - 8, 13, R - 26, 0); g.stroke(); g.restore(); }
      g.beginPath(); g.arc(0, 0, R + 12, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.42); rg.addColorStop(0, glow); rg.addColorStop(.4, glow.replace(/[\d.]+\)$/, '0.14)')); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const r = rng(3); for (let i = 0; i < 40; i++) { const x = r() * W, y = H * 0.45 + r() * H * 0.55, rad = 4 + r() * 18; const d = g.createRadialGradient(x, y, 0, x, y, rad); d.addColorStop(0, gold); d.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .12 + r() * .22; g.fillStyle = d; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); } g.globalAlpha = 1;
  } else if (t === 'mukha') {
    // carved geometric mask tessellation
    g.strokeStyle = 'rgba(22,19,17,.16)'; g.lineWidth = 2; const s = 64;
    for (let y = -s; y < H + s; y += s * 1.5) { for (let x = -s; x < W + s; x += s * 1.75) { const ox = ((y / (s * 1.5)) % 2) ? s * 0.875 : 0; const X = x + ox; g.beginPath(); g.moveTo(X, y - s * .5); g.lineTo(X + s * .86, y); g.lineTo(X + s * .86, y + s); g.lineTo(X, y + s * 1.5); g.lineTo(X - s * .86, y + s); g.lineTo(X - s * .86, y); g.closePath(); g.stroke(); } }
    const r = rng(5); for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H; g.fillStyle = i % 3 ? sind : durva; g.globalAlpha = .16; g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 14, y); g.lineTo(x, y + 16); g.lineTo(x - 14, y); g.closePath(); g.fill(); } g.globalAlpha = 1;
  } else if (t === 'atreyee') {
    // river lines + paddy
    g.lineWidth = 1.6; for (let i = 0; i < 9; i++) { const y = H * 0.25 + i * H * 0.08; g.strokeStyle = i % 2 ? 'rgba(28,110,122,.28)' : 'rgba(123,162,63,.28)'; g.beginPath(); for (let x = 0; x <= W; x += 20) { g.lineTo(x, y + Math.sin((x + i * 70) / 110) * 14 + Math.sin(x / 37) * 4); } g.stroke(); }
    const r = rng(8); g.strokeStyle = 'rgba(123,162,63,.45)'; g.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = r() * W, y = H * 0.75 + r() * H * 0.25, h = 10 + r() * 22; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - h * .6, x + 2, y - h); g.stroke(); }
  } else if (t === 'bangarh') {
    // terracotta frieze rows
    g.strokeStyle = 'rgba(239,228,206,.22)'; g.lineWidth = 1.5; const s = 48;
    for (let y = s; y < H; y += s * 2) { for (let x = 0; x < W; x += s) { g.beginPath(); g.arc(x + s / 2, y, s * .32, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(x + s * .2, y + s * .9); g.quadraticCurveTo(x + s / 2, y + s * .35, x + s * .8, y + s * .9); g.stroke(); }
      g.beginPath(); g.moveTo(0, y + s * 1.05); g.lineTo(W, y + s * 1.05); g.stroke(); }
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4); rg.addColorStop(0, 'rgba(214,169,59,.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  // grain
  const r2 = rng(9); g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < W * H / 900; i++) { g.fillRect(r2() * W, r2() * H, 1, 1); }
}

/** Marigold garland strip (theme-tinted). */
export function paintGarland(c) {
  const [g, W, H] = setup(c); g.clearRect(0, 0, W, H);
  const t = theme(); g.fillStyle = css('--ivory'); g.fillRect(0, 0, W, H);
  const r = rng(2); const step = 18; for (let x = -6; x < W + 6; x += step) { const y = 13 + Math.sin(x / 60) * 3; const col = (Math.floor(x / step) % 3 === 0) ? css('--sindoor') : (Math.floor(x / step) % 3 === 1 ? css('--pitambar') : '#f79a2a');
    if (t === 'atreyee') { g.fillStyle = css('--durva'); g.beginPath(); g.ellipse(x, y, 5, 2.5, 0, 0, 7); g.fill(); continue; }
    if (t === 'dhokra') { g.strokeStyle = css('--gold'); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke(); continue; }
    for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2; g.fillStyle = col; g.globalAlpha = .9; g.beginPath(); g.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.2, 2, a, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = css('--pitambar'); g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
}

/** Header/page-band background: small mandala glow, used behind inner-page headers. */
export function paintHeader(c) {
  const [g, W, H] = setup(c); const t = theme(); const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, css('--bg2')); lg.addColorStop(1, css('--bg')); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W * 0.86, H * 0.5); g.strokeStyle = t === 'mukha' || t === 'atreyee' ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.14)'; g.lineWidth = 1; for (let ring = 0; ring < 4; ring++) { const R = 40 + ring * 34, n = 12 + ring * 6; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.save(); g.rotate(a); g.beginPath(); g.moveTo(R - 16, 0); g.quadraticCurveTo(R - 5, -8, R + 6, 0); g.quadraticCurveTo(R - 5, 8, R - 16, 0); g.stroke(); g.restore(); } } g.restore();
  const rg = g.createRadialGradient(W * 0.86, H * 0.5, 0, W * 0.86, H * 0.5, W * 0.3); rg.addColorStop(0, css('--glow')); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
}

/** Re-run fn on resize (debounced) and whenever the theme is swapped (document 'themechange'). */
export function onResize(fn) {
  let t; const h = () => { clearTimeout(t); t = setTimeout(fn, 120); };
  window.addEventListener('resize', h); document.addEventListener('themechange', fn);
  return () => { window.removeEventListener('resize', h); document.removeEventListener('themechange', fn); };
}
