import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icsFor } from '../../js/ics.js';

test('icsFor: basic VEVENT with UTC DTSTART/DTEND, CRLF line endings', () => {
  const out = icsFor({ id: 'e1', title: 'সন্ধ্যা আরতি', start: '2026-09-20T12:30:00.000Z', end: '2026-09-20T14:00:00.000Z', venue: 'মণ্ডপ' });
  assert.match(out, /\r\n/);
  assert.ok(!/[^\r]\n/.test(out), 'every line ending must be CRLF, not bare LF');
  assert.match(out, /^BEGIN:VCALENDAR\r\n/);
  assert.match(out, /VERSION:2\.0\r\n/);
  assert.match(out, /DTSTART:20260920T123000Z\r\n/);
  assert.match(out, /DTEND:20260920T140000Z\r\n/);
  assert.match(out, /SUMMARY:সন্ধ্যা আরতি\r\n/);
  assert.match(out, /LOCATION:মণ্ডপ\r\n/);
  assert.match(out, /UID:e1@hrishi91\.github\.io\r\n/);
  assert.match(out, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
});

test('icsFor: missing end defaults to start + 2 hours', () => {
  const out = icsFor({ id: 'e2', title: 'X', start: '2026-09-20T12:00:00.000Z' });
  assert.match(out, /DTSTART:20260920T120000Z/);
  assert.match(out, /DTEND:20260920T140000Z/);
});

test('icsFor: escapes commas, semicolons, backslashes and newlines in text fields', () => {
  const out = icsFor({ id: 'e3', title: 'A, B; C\\D', start: '2026-09-20T12:00:00.000Z', desc: 'line1\nline2' });
  assert.match(out, /SUMMARY:A\\, B\\; C\\\\D\r\n/);
  assert.match(out, /DESCRIPTION:line1\\nline2\r\n/);
});

test('icsFor: no venue/desc means no LOCATION/DESCRIPTION lines', () => {
  const out = icsFor({ id: 'e4', title: 'X', start: '2026-09-20T12:00:00.000Z' });
  assert.ok(!out.includes('LOCATION:'));
  assert.ok(!out.includes('DESCRIPTION:'));
});

test('icsFor: absent id still produces a valid, non-empty UID', () => {
  const out = icsFor({ title: 'X', start: '2026-09-20T12:00:00.000Z' });
  assert.match(out, /UID:[^\s@]+@hrishi91\.github\.io\r\n/);
});

test('icsFor: two calls without id get different UIDs', () => {
  const a = icsFor({ title: 'X', start: '2026-09-20T12:00:00.000Z' });
  const b = icsFor({ title: 'X', start: '2026-09-20T12:00:00.000Z' });
  assert.notEqual(a.match(/UID:([^\r]+)/)[1], b.match(/UID:([^\r]+)/)[1]);
});

test('icsFor: PRODID reflects lang', () => {
  assert.match(icsFor({ id: 'e5', title: 'X', start: '2026-09-20T12:00:00.000Z' }, { lang: 'en' }), /PRODID:.*EN\r\n/);
  assert.match(icsFor({ id: 'e5', title: 'X', start: '2026-09-20T12:00:00.000Z' }, { lang: 'bn' }), /PRODID:.*BN\r\n/);
});
