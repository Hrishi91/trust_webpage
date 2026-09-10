// js/ledger-view.js — transparency chart views for the home page.
import { el } from './ui.js';
import { pick } from './i18n.js';
import { inr } from './money.js';
import { barWidths, donutArcs } from './ledger.js';
const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs) => { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const PALETTE = ['var(--sindoor)', 'var(--pitambar)', 'var(--durva)', 'var(--gold)', 'var(--bg2)'];

export function barsView(rows, lang, { kind = 'income' } = {}) {
  const w = barWidths(rows);
  return el('div', { class: 'bars' }, ...rows.map((r, i) => el('div', { class: 'bar' },
    el('span', { text: pick(r.category, lang) }), el('i', { class: kind === 'expense' ? 'g' : '', style: `width:${w[i]}%` }), el('em', { text: inr(r.amount, lang) }))));
}
export function donutView(rows, lang, centre) {
  const svg = sv('svg', { viewBox: '0 0 200 200', role: 'img' });
  svg.append(sv('circle', { cx: 100, cy: 100, r: 70, fill: 'none', stroke: 'var(--line)', 'stroke-width': 22 }));
  donutArcs(rows).forEach((a, i) => svg.append(sv('circle', { cx: 100, cy: 100, r: 70, fill: 'none', stroke: PALETTE[i % PALETTE.length], 'stroke-width': 22,
    'stroke-dasharray': a.dasharray, 'stroke-dashoffset': a.dashoffset, transform: 'rotate(-90 100 100)' })));
  const big = sv('text', { x: 100, y: 96, 'text-anchor': 'middle', 'font-family': 'Baloo Da 2,Hind Siliguri', 'font-weight': 800, 'font-size': 26, fill: 'var(--ink)' }); big.textContent = centre.big;
  const small = sv('text', { x: 100, y: 118, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }); small.textContent = centre.small;
  svg.append(big, small);
  return el('div', { class: 'donut' }, svg);
}
