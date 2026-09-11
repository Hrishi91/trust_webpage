import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, mediaUrl } from '../../js/media-slots.js';

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
