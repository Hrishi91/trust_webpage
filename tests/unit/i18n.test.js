import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  pick, t, getLang, setLang, LANGS, onLangChange, setOverrides, getOverrides, STRINGS, STRING_GROUPS, defaultString,
} from '../../js/i18n.js';

beforeEach(() => setLang('bn'));

test('LANGS is bn then en', () => assert.deepEqual(LANGS, ['bn', 'en']));
test('default lang is bn when no storage', () => assert.equal(getLang(), 'bn'));
test('setLang switches the current language', () => { setLang('en'); assert.equal(getLang(), 'en'); });
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
test('onLangChange fires with the new lang and unsubscribe stops it', () => {
  const seen = [];
  const off = onLangChange(l => seen.push(l));
  setLang('en'); assert.deepEqual(seen, ['en']);
  off(); setLang('bn'); assert.deepEqual(seen, ['en']);
});
test('onLangChange does not fire for no-op or unknown lang', () => {
  const seen = [];
  const off = onLangChange(l => seen.push(l));
  setLang('bn'); setLang('fr'); assert.deepEqual(seen, []);
  off();
});

test('override wins over default; empty/missing override falls back', () => {
  setOverrides({ 'nav.home': { bn: 'শুরু', en: '' } });
  assert.equal(t('nav.home', 'bn'), 'শুরু'); assert.equal(t('nav.home', 'en'), 'Home');
  setOverrides(null); assert.equal(t('nav.home', 'bn'), 'হোম');
});
test('setOverrides ignores non-object and non-string values', () => {
  setOverrides({ 'nav.home': 'x', 'nav.about': { bn: 7 } }); assert.deepEqual(getOverrides(), {}); setOverrides(null);
});
test('every STRINGS key is in exactly one group', () => {
  const all = Object.values(STRING_GROUPS).flat();
  assert.deepEqual([...all].sort(), Object.keys(STRINGS).sort());
  assert.equal(new Set(all).size, all.length);
});
test('defaultString returns the untouched default even when overridden', () => {
  setOverrides({ 'nav.home': { bn: 'x' } }); assert.equal(defaultString('nav.home', 'bn'), 'হোম'); setOverrides(null);
});
