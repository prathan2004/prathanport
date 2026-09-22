import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signatureLayout } from '../js/signature-layout.js';

test('uses existing document defaults', () => {
  assert.deepEqual(signatureLayout(), { width: 58, align: 'right', gap: 14 });
  assert.deepEqual(signatureLayout({ signature_width_mm: null, signature_align: null, signature_gap_mm: null }), { width: 58, align: 'right', gap: 14 });
});

test('accepts settings and clamps out-of-range values', () => {
  assert.deepEqual(signatureLayout({ signature_width_mm: 72, signature_align: 'center', signature_gap_mm: 9 }), { width: 72, align: 'center', gap: 9 });
  assert.deepEqual(signatureLayout({ signature_width_mm: 100, signature_align: 'invalid', signature_gap_mm: -5 }), { width: 80, align: 'right', gap: 0 });
});
