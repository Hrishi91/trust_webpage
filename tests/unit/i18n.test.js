import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pick, t, getLang, setLang, LANGS } from '../../js/i18n.js';

test('LANGS is bn then en', () => assert.deepEqual(LANGS, ['bn', 'en']));
test('default lang is bn when no storage', () => assert.equal(getLang(), 'bn'));
test('setLang switches and persists in memory', () => { setLang('en'); assert.equal(getLang(), 'en'); setLang('bn'); });
test('setLang ignores unknown', () => { setLang('fr'); assert.equal(getLang(), 'bn'); });
test('pick returns requested lang', () => assert.equal(pick({ bn: 'নাম', en: 'Name' }, 'en'), 'Name'));
test('pick falls back to other lang', () => assert.equal(pick({ bn: '', en: 'Name' }, 'bn'), 'Name'));
test('pick handles plain string', () => assert.equal(pick('plain', 'bn'), 'plain'));
test('pick handles null', () => assert.equal(pick(null, 'bn'), ''));
test('t returns dictionary string with fallback to en', () => {
  assert.equal(t('nav.home', 'bn'), 'হোম');
  assert.equal(t('nav.home', 'en'), 'Home');
  assert.equal(t('missing.key', 'bn'), 'missing.key');
});
