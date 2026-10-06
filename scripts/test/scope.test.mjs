import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, canChangeC } from '../scope.mjs';

test('src/content/pages/entry.yml は区分 C', () => {
  assert.equal(classify('src/content/pages/entry.yml'), 'C');
});

test('src/content/pages/home.yml は区分 A', () => {
  assert.equal(classify('src/content/pages/home.yml'), 'A');
});

test('canChangeC: kotaokubo は role によらず true', () => {
  assert.equal(canChangeC('kotaokubo', undefined), true);
  assert.equal(canChangeC('kotaokubo', 'read'), true);
});

test('canChangeC: admin は true', () => {
  assert.equal(canChangeC('designer', 'admin'), true);
});

test('canChangeC: maintain は true', () => {
  assert.equal(canChangeC('designer', 'maintain'), true);
});

test('canChangeC: write は true', () => {
  assert.equal(canChangeC('someone', 'write'), true);
});

test('canChangeC: triage は false', () => {
  assert.equal(canChangeC('someone', 'triage'), false);
});

test('canChangeC: read は false', () => {
  assert.equal(canChangeC('someone', 'read'), false);
});

test('canChangeC: undefined / null / 空文字は false', () => {
  assert.equal(canChangeC('someone', undefined), false);
  assert.equal(canChangeC('someone', null), false);
  assert.equal(canChangeC('someone', ''), false);
});
