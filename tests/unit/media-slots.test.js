import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, mediaUrl, httpsUrl } from '../../js/media-slots.js';

test('SLOTS: 14 unique ids, each with bn+en label/where, a public/ui/ folder, and max 1600', () => {
  assert.equal(SLOTS.length, 14);
  const ids = SLOTS.map(s => s.id);
  assert.equal(new Set(ids).size, 14, 'ids must be unique');
  for (const s of SLOTS) {
    assert.ok(s.label && s.label.bn && s.label.en, `${s.id} needs bn+en label`);
    assert.ok(s.where && s.where.bn && s.where.en, `${s.id} needs bn+en where`);
    assert.ok(s.folder && s.folder.startsWith('public/ui/'), `${s.id} folder`);
    assert.equal(s.max, 1600, `${s.id} max`);
  }
});

test('mediaUrl: only a non-empty https:// string for the given id counts as set', () => {
  assert.equal(mediaUrl({ hero: 'https://example.com/x.jpg' }, 'hero'), 'https://example.com/x.jpg');
  assert.equal(mediaUrl({ hero: 'http://example.com/x.jpg' }, 'hero'), ''); // not https
  assert.equal(mediaUrl({ hero: '' }, 'hero'), '');
  assert.equal(mediaUrl({ hero: 123 }, 'hero'), '');
  assert.equal(mediaUrl({ hero: 'https://ok.example/x.jpg' }, 'garland'), ''); // wrong slot
  assert.equal(mediaUrl({}, 'hero'), '');
  assert.equal(mediaUrl(null, 'hero'), '');
  assert.equal(mediaUrl(undefined, 'hero'), '');
});

// Fix round 1, finding 4: httpsUrl() is the shared guard behind mediaUrl() and every other
// admin-supplied href/src (social links, map link, culture images in js/shell.js and
// js/pages/home.js) — a non-https scheme (javascript:, data:, plain http:) must never reach an
// href/src attribute unvalidated.
test('httpsUrl: only a non-empty https:// string passes; javascript:/data:/http:/non-string all clear', () => {
  assert.equal(httpsUrl('https://example.com/x.jpg'), 'https://example.com/x.jpg');
  assert.equal(httpsUrl('javascript:alert(1)'), '');
  assert.equal(httpsUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(httpsUrl('http://example.com'), '');
  assert.equal(httpsUrl(''), '');
  assert.equal(httpsUrl(123), '');
  assert.equal(httpsUrl(null), '');
  assert.equal(httpsUrl(undefined), '');
  assert.equal(httpsUrl({ toString: () => 'https://evil.example' }), ''); // non-string object, even if it stringifies to https
});
