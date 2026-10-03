import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../js/running.js', import.meta.url), 'utf8'), context);
const parse = context.parseRunDuration;

test('time notation uses seconds rather than a decimal fraction of a minute', () => {
  assert.equal(parse('45.20'), 45 + 20 / 60);
  assert.equal(parse('45:20'), parse('45.20'));
  assert.equal(parse('45'), 45);
  assert.equal(parse('45.00'), 45);
  assert.equal(parse('0.01'), 1 / 60);
  assert.equal(parse('120.59'), 120 + 59 / 60);
  assert.equal(parse('45.20') / 5, 9 + 4 / 60);
});

test('rejects malformed times, invalid seconds, zero and out-of-range values', () => {
  for (const value of ['', '0', '0.00', '-45.20', '45.60', '45.99', '45.2',
    '45.200', 'abc', '45..20', 'Infinity', '1000000', '1e2']) {
    assert.equal(parse(value), null, value);
  }
});
