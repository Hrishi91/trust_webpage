import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../scripts/lib/args.mjs';

test('parseArgs with no flags returns all-off defaults', () => {
  assert.deepEqual(parseArgs([]), { domain: null, withTestNumber: false, removeTestNumber: false });
});
test('parseArgs reads --domain value', () => {
  assert.deepEqual(parseArgs(['--domain', 'trust.example.org']),
    { domain: 'trust.example.org', withTestNumber: false, removeTestNumber: false });
});
test('parseArgs --domain with no following value is undefined (caller validates)', () => {
  assert.equal(parseArgs(['--domain']).domain, undefined);
});
test('parseArgs sets withTestNumber', () => {
  assert.equal(parseArgs(['--with-test-number']).withTestNumber, true);
});
test('parseArgs sets removeTestNumber', () => {
  assert.equal(parseArgs(['--remove-test-number']).removeTestNumber, true);
});
test('parseArgs combines all three flags', () => {
  assert.deepEqual(
    parseArgs(['--domain', 'x.org', '--with-test-number', '--remove-test-number']),
    { domain: 'x.org', withTestNumber: true, removeTestNumber: true });
});
test('parseArgs ignores flag order', () => {
  assert.deepEqual(
    parseArgs(['--remove-test-number', '--domain', 'y.org', '--with-test-number']),
    { domain: 'y.org', withTestNumber: true, removeTestNumber: true });
});
