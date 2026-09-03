import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitDims } from '../../admin/js/resize.js';
test('landscape scales longer side', () => assert.deepEqual(fitDims(4000, 3000, 1600), { w: 1600, h: 1200 }));
test('portrait scales height', () => assert.deepEqual(fitDims(3000, 4000, 1600), { w: 1200, h: 1600 }));
test('never upscales', () => assert.deepEqual(fitDims(800, 600, 1600), { w: 800, h: 600 }));
test('integer output', () => assert.deepEqual(fitDims(1001, 333, 500), { w: 500, h: 166 }));
test('default max 1600', () => assert.deepEqual(fitDims(3200, 3200), { w: 1600, h: 1600 }));
