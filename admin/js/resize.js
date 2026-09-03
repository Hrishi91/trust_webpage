// Pure geometry: no DOM, no Firebase. Safe under node --test.
export function fitDims(w, h, max = 1600) {
  const longest = Math.max(w, h);
  if (longest <= max) return { w, h };
  const k = max / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}
