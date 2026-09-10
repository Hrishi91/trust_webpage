// Pure ledger helpers (no DOM). Amounts are numbers in rupees.
const amt = r => Math.max(0, Number(r?.amount) || 0);
export function barWidths(rows) {
  const max = Math.max(0, ...rows.map(amt));
  return rows.map(r => max ? Math.round((amt(r) / max) * 10000) / 100 : 0);
}
export function donutArcs(rows, circumference = 440) {
  const total = rows.reduce((a, r) => a + amt(r), 0);
  if (!total) return [];
  let acc = 0;
  return rows.map(r => { const len = Math.round((amt(r) / total) * circumference * 100) / 100; const out = { dasharray: `${len} ${circumference}`, dashoffset: String(-acc) }; acc += len; return out; });
}
/** "bn | en | 501,1101" per line → [{title:{bn,en}, amounts:number[]}] */
export function parsePurposes(text) {
  return String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [bn = '', en = '', am = ''] = l.split('|').map(x => x.trim());
    return { title: { bn, en }, amounts: am.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0) };
  });
}
