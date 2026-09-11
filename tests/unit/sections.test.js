import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_SECTIONS, orderSections, parseCredItems } from '../../js/sections.js';

test('HOME_SECTIONS: 11 keys in the default (current) render order', () => {
  assert.deepEqual(HOME_SECTIONS, [
    'hero', 'cred', 'glance', 'story', 'culture', 'gallery', 'schedule', 'ledger', 'donate', 'committee', 'members',
  ]);
});

test('orderSections: anything that is not a list falls back to the default order, all on', () => {
  for (const bad of [undefined, null, {}, 'nope', 5]) {
    assert.deepEqual(orderSections(bad), HOME_SECTIONS.map(key => ({ key, on: true })));
  }
});

test('orderSections: keeps valid keys in the given order, drops unknown/dup keys, appends missing keys as on:true', () => {
  const got = orderSections([
    { key: 'culture', on: false },
    { key: 'hero', on: true },
    { key: 'not-a-real-section', on: true },
    { key: 'hero', on: false }, // duplicate — first occurrence wins
  ]);
  assert.deepEqual(got[0], { key: 'culture', on: false });
  assert.deepEqual(got[1], { key: 'hero', on: true });
  const keys = got.map(x => x.key);
  assert.equal(keys.length, HOME_SECTIONS.length, 'every home section key present exactly once');
  assert.equal(new Set(keys).size, HOME_SECTIONS.length, 'no duplicates');
  for (const k of HOME_SECTIONS) assert.ok(keys.includes(k), `${k} missing`);
  for (const entry of got.slice(2)) assert.equal(entry.on, true, `${entry.key} appended as on`);
});

test('orderSections: on defaults to true unless explicitly false', () => {
  const got = orderSections([{ key: 'hero' }]);
  assert.equal(got.find(x => x.key === 'hero').on, true);
  const got2 = orderSections([{ key: 'hero', on: false }]);
  assert.equal(got2.find(x => x.key === 'hero').on, false);
});

test('parseCredItems: "bn | en" per line, trims, ignores blank lines, tolerates a missing "en" half', () => {
  assert.deepEqual(parseCredItems(''), []);
  assert.deepEqual(parseCredItems(null), []);
  assert.deepEqual(parseCredItems(undefined), []);
  assert.deepEqual(
    parseCredItems('২০২১ থেকে | Since 2021\n\n  ১০০+ স্বেচ্ছাসেবক | 100+ volunteers  \n'),
    [{ bn: '২০২১ থেকে', en: 'Since 2021' }, { bn: '১০০+ স্বেচ্ছাসেবক', en: '100+ volunteers' }],
  );
  assert.deepEqual(parseCredItems('শুধু বাংলা'), [{ bn: 'শুধু বাংলা', en: '' }]);
});

// Fix round 1, finding 3: the current spec stores credItems as a "bn | en" per-line string, but
// parseCredItems must also accept the array-of-{bn,en} shape (existing/hand-edited Firestore
// data, or a future admin UI that writes structured rows) without crashing on malformed entries.
test('parseCredItems: accepts an array of {bn,en} objects, trimming and dropping entries with neither side set', () => {
  assert.deepEqual(
    parseCredItems([{ bn: '২০২১ থেকে', en: 'Since 2021' }, { bn: '  ১০০+ স্বেচ্ছাসেবক  ', en: '' }]),
    [{ bn: '২০২১ থেকে', en: 'Since 2021' }, { bn: '১০০+ স্বেচ্ছাসেবক', en: '' }],
  );
  assert.deepEqual(parseCredItems([]), []);
});

test('parseCredItems: array branch tolerates mixed junk entries without crashing', () => {
  assert.deepEqual(
    parseCredItems([
      { bn: '', en: '' },           // neither side set — dropped
      null,                          // not an object — dropped
      'a plain string',              // not an object — dropped
      42,                            // not an object — dropped
      { bn: 7, en: 'valid en only' }, // non-string bn ignored, en kept
      { en: 'Only English' },        // missing bn — fine
      { bn: 'শুধু বাংলা' },           // missing en — fine
    ]),
    [{ bn: '', en: 'valid en only' }, { bn: '', en: 'Only English' }, { bn: 'শুধু বাংলা', en: '' }],
  );
});
