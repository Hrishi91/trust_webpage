import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHome } from '../../js/pages/home-data.js';

const ok = value => () => Promise.resolve(value);
const fail = err => () => Promise.reject(err);

test('loadHome: all six loaders resolving returns their values verbatim', async () => {
  const got = await loadHome({
    listPublished: coll => Promise.resolve(coll === 'events' ? ['e1'] : ['a1']),
    listCommittee: ok(['p1']),
    listTransparencyYears: ok(['y1']),
    listCulture: ok(['c1']),
  });
  assert.deepEqual(got, { events: ['e1'], albums: ['a1'], history: ['a1'], people: ['p1'], years: ['y1'], cultureRows: ['c1'] });
});

test('loadHome: a rejecting listCulture is swallowed to an empty array, other collections unaffected', async () => {
  const got = await loadHome({
    listPublished: coll => Promise.resolve(coll === 'events' ? ['e1'] : ['a1']),
    listCommittee: ok(['p1']),
    listTransparencyYears: ok(['y1']),
    listCulture: fail(new Error('index building')),
  });
  assert.deepEqual(got.cultureRows, []);
  assert.deepEqual(got.events, ['e1']);
  assert.deepEqual(got.people, ['p1']);
});

test('loadHome: a rejecting listPublished(\'albums\')/listPublished(\'history\') falls back to [] independently', async () => {
  const got = await loadHome({
    listPublished: coll => (coll === 'events' ? Promise.resolve(['e1']) : coll === 'albums' ? Promise.reject(new Error('boom')) : Promise.resolve(['h1'])),
    listCommittee: ok(['p1']),
    listTransparencyYears: ok(['y1']),
    listCulture: ok(['c1']),
  });
  assert.deepEqual(got.albums, []);
  assert.deepEqual(got.history, ['h1']);
});

test('loadHome: a rejecting listPublished(\'events\') propagates (load-bearing)', async () => {
  await assert.rejects(() => loadHome({
    listPublished: coll => (coll === 'events' ? Promise.reject(new Error('no events')) : Promise.resolve([])),
    listCommittee: ok([]),
    listTransparencyYears: ok([]),
    listCulture: ok([]),
  }), /no events/);
});

test('loadHome: every non-events loader rejecting at once still resolves with all fallbacks', async () => {
  const got = await loadHome({
    listPublished: coll => (coll === 'events' ? Promise.resolve(['e1']) : Promise.reject(new Error('x'))),
    listCommittee: fail(new Error('x')),
    listTransparencyYears: fail(new Error('x')),
    listCulture: fail(new Error('x')),
  });
  assert.deepEqual(got, { events: ['e1'], albums: [], history: [], people: [], years: [], cultureRows: [] });
});
