import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../../js/phone.js';

test('normalizePhone: 10-digit bare number gets +91 prefix', () =>
  assert.equal(normalizePhone('98000 00000'), '+919800000000'));
test('normalizePhone: already-prefixed number with punctuation', () =>
  assert.equal(normalizePhone('+91 98000-00000'), '+919800000000'));
test('normalizePhone: leading zero after normalisation is rejected', () =>
  assert.equal(normalizePhone('09800000000'), null));
test('normalizePhone: too short is rejected', () =>
  assert.equal(normalizePhone('12345'), null));
test('normalizePhone: 12 digits with country code, no +', () =>
  assert.equal(normalizePhone('919800000000'), '+919800000000'));
