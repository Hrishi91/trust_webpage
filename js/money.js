// Pure money helpers: no DOM, no Firebase. Safe under node --test.
import { bnDigits } from './ui.js';

export function sum(items) {
  return items.reduce((t, it) => t + (it.amount || 0), 0);
}

const FMT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export function inr(n, lang = 'en') {
  const out = `₹${FMT.format(n)}`;
  return lang === 'bn' ? bnDigits(out) : out;
}

export function balance(pledge, payments) {
  return pledge - sum(payments);
}
