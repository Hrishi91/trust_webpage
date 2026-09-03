import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHostname } from '../../scripts/lib/hostname.mjs';

test('isHostname accepts plain domains', () => {
  assert.equal(isHostname('example.org'), true);
  assert.equal(isHostname('sub.example.co.in'), true);
});
test('isHostname rejects a URL with a scheme', () => assert.equal(isHostname('http://x'), false));
test('isHostname rejects underscores', () => assert.equal(isHostname('x_y.com'), false));
test('isHostname rejects a label starting with a hyphen', () => assert.equal(isHostname('-a.com'), false));
test('isHostname rejects empty string', () => assert.equal(isHostname(''), false));
test('isHostname rejects non-string input', () => assert.equal(isHostname(null), false));
