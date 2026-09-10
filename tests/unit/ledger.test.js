import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barWidths, donutArcs, parsePurposes } from '../../js/ledger.js';

test('barWidths scales to the largest row', () =>
  assert.deepEqual(barWidths([{ amount: 50 }, { amount: 100 }, { amount: 0 }]), [50, 100, 0]));
test('barWidths of empty/zero rows is all zeros', () => { assert.deepEqual(barWidths([]), []); assert.deepEqual(barWidths([{ amount: 0 }]), [0]); });
test('donutArcs: slices sum to the circumference and offsets accumulate', () => {
  const a = donutArcs([{ amount: 1 }, { amount: 3 }], 400);
  assert.deepEqual(a, [{ dasharray: '100 400', dashoffset: '0' }, { dasharray: '300 400', dashoffset: '-100' }]);
});
test('donutArcs with no total returns []', () => assert.deepEqual(donutArcs([{ amount: 0 }], 400), []));
test('parsePurposes: one per line "bn | en | amounts"', () => {
  assert.deepEqual(parsePurposes('প্রতিমা | Idol | 501,1101\nভোগ|Bhog|301\n\nbad line'), [
    { title: { bn: 'প্রতিমা', en: 'Idol' }, amounts: [501, 1101] },
    { title: { bn: 'ভোগ', en: 'Bhog' }, amounts: [301] },
    { title: { bn: 'bad line', en: '' }, amounts: [] },
  ]);
  assert.deepEqual(parsePurposes(''), []); assert.deepEqual(parsePurposes(null), []);
});
