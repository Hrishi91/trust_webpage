// js/ics.js — pure (no DOM, no Firebase). Builds a minimal RFC 5545 VCALENDAR for one event, for
// the "ক্যালেন্ডারে যোগ" link on events.html (Phase 7 Task 2, item 16). All times are UTC
// (`Z`-suffixed DTSTART/DTEND) so the resulting file is unambiguous regardless of the reading
// calendar app's own timezone setting.
function pad2(n) { return String(n).padStart(2, '0'); }

// JS Date -> "YYYYMMDDTHHMMSSZ" (UTC), the ICS DATE-TIME form used by DTSTART/DTEND/DTSTAMP.
function stampUTC(d) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

// RFC 5545 §3.3.11 TEXT escaping: backslash first (so it doesn't double-escape the characters it
// introduces below), then semicolon/comma/newline.
function escapeText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * {id,title,start,end,venue,desc} (start/end ISO strings, venue/desc/title plain already-picked
 * strings — callers pass pick(e.title)/pick(e.venue) etc, this function does no i18n) ->
 * a CRLF-terminated VCALENDAR string. `end` defaults to `start` + 2 hours when absent (same
 * "no end = 2h" convention as js/ui.js's isLiveEvent). `id` seeds the UID; when absent a random
 * one is used so two calls never collide within the same process.
 */
export function icsFor({ id, title, start, end, venue, desc } = {}, { lang = 'bn', host = 'hrishi91.github.io' } = {}) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 2 * 3600000);
  const uid = `${id || Math.random().toString(36).slice(2)}@${host}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Ganesh Puja Trust//trust_webpage//${lang === 'en' ? 'EN' : 'BN'}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stampUTC(new Date())}`,
    `DTSTART:${stampUTC(startDate)}`,
    `DTEND:${stampUTC(endDate)}`,
    `SUMMARY:${escapeText(title)}`,
  ];
  if (venue) lines.push(`LOCATION:${escapeText(venue)}`);
  if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(l => l + '\r\n').join('');
}
