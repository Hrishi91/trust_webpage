import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, countdown, fmtDate, bnDigits } from '../../js/ui.js';

test('escapeHtml escapes the five', () =>
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'));
test('escapeHtml tolerates null', () => assert.equal(escapeHtml(null), ''));
test('countdown 2 days 3 hours ahead', () => {
  const r = countdown('2026-09-20T06:00:00+05:30', new Date('2026-09-18T03:00:00+05:30'));
  assert.deepEqual(r, { days: 2, hours: 3, minutes: 0, past: false });
});
test('countdown past date', () => {
  const r = countdown('2026-09-01T00:00:00+05:30', new Date('2026-09-02T00:00:00+05:30'));
  assert.equal(r.past, true); assert.equal(r.days, 0);
});
test('countdown invalid date', () => assert.equal(countdown('nope').past, true));
test('fmtDate bn uses Bengali digits and month', () => assert.equal(fmtDate('2026-09-20', 'bn'), "২০ সেপ্টেম্বর ২০২৬"));
test('fmtDate en', () => assert.equal(fmtDate('2026-09-20', 'en'), '20 September 2026'));
test('fmtDate garbage', () => assert.equal(fmtDate('x', 'en'), ''));
test('bnDigits maps 0-9 to U+09E6..U+09EF', () => assert.equal(bnDigits('0123456789'), "০১২৩৪৫৬৭৮৯"));
