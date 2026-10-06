import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from '../scope.mjs';

test('src/content/pages/entry.yml は区分 C', () => {
  assert.equal(classify('src/content/pages/entry.yml'), 'C');
});

test('src/content/pages/home.yml は区分 A', () => {
  assert.equal(classify('src/content/pages/home.yml'), 'A');
});
