import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signatureLayout } from '../js/signature-layout.js';

test('uses existing document defaults', () => {
  assert.deepEqual(signatureLayout(), { width: 40, align: 'right', gap: 14, x: 0, y: 0 });
  assert.deepEqual(signatureLayout({ signature_width_mm: null, signature_align: null, signature_gap_mm: null }), { width: 40, align: 'right', gap: 14, x: 0, y: 0 });
});

test('accepts settings and clamps out-of-range values', () => {
  assert.deepEqual(signatureLayout({ signature_width_mm: 55, signature_align: 'center', signature_gap_mm: 9, signature_image_x_mm: -7, signature_image_y_mm: 3 }), { width: 55, align: 'center', gap: 9, x: -7, y: 3 });
  assert.deepEqual(signatureLayout({ signature_width_mm: 100, signature_align: 'invalid', signature_gap_mm: -5, signature_image_x_mm: -30, signature_image_y_mm: 40 }), { width: 70, align: 'right', gap: 0, x: -20, y: 10 });
});
