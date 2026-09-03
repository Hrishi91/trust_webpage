import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum, inr, balance } from '../../js/money.js';

test('sum', () => assert.equal(sum([{ amount: 100 }, { amount: 250.5 }, {}]), 350.5));
test('inr en indian grouping', () => assert.equal(inr(1234567, 'en'), '₹12,34,567'));
test('inr bn digits', () => assert.equal(inr(1234567, 'bn'), '₹১২,৩৪,৫৬৭'));
test('inr rounds', () => assert.equal(inr(99.6, 'en'), '₹100'));
test('balance', () => assert.equal(balance(5000, [{ amount: 2000 }, { amount: 500 }]), 2500));
test('balance never negative display', () => assert.equal(balance(100, [{ amount: 150 }]), -50));
