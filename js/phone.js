import { digits } from './ui.js';

// Normalises a raw phone input into E.164 — shared by js/pages/members.js (the member's own
// sign-in form) and admin/js/sections/members.js (the admin's member-record form), so both sides
// of "which numbers are members" agree on the same rule. Strips everything but digits, then:
//   - exactly 10 digits -> assumed a bare Indian mobile number, +91-prefixed
//   - 11-14 digits -> already has a country code, '+'-prefixed as-is
//   - anything else, OR a result starting with '0' -> invalid, returns null
// The leading-zero check matters most for the 11-14-digit branch: an 11-digit number typed with
// a leading trunk-prefix zero (e.g. '09800000000', a domestic dialing habit) must be rejected,
// not silently turned into the nonsensical '+09800000000'. A 10-digit number could never start
// with '0' anyway (Indian mobile numbers start 6-9), but the check is written to cover both
// branches uniformly rather than carve out a special case.
export function normalizePhone(input) {
  const d = digits(input);
  if (d.startsWith('0')) return null;
  if (d.length === 10) return `+91${d}`;
  if (d.length >= 11 && d.length <= 14) return `+${d}`;
  return null;
}
