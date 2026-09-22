import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveDocumentRecord } from '../js/document-store.js';

function fakeDb(rejectLayout) {
  const writes = [];
  const db = { from(table) {
    assert.equal(table, 'documents');
    return {
      insert(values) { writes.push(values); return query(values); },
      update(values) { writes.push(values); return query(values); },
    };
  } };
  function query(values) {
    return {
      eq() { return this; },
      select() { return this; },
      async single() {
        return rejectLayout(values)
          ? { data: null, error: { code: '42703', message: 'missing layout column' } }
          : { data: { id: 'document-1' }, error: null };
      },
    };
  }
  return { db, writes };
}

const layout = { width: 40, align: 'right', gap: 14, x: 4, y: -2 };
const core = { subject: 'ทดสอบ', content: '<p>เนื้อหา</p>' };

test('saves all signature settings when schema is current', async () => {
  const { db, writes } = fakeDb(() => false);
  const result = await saveDocumentRecord(db, { id: null, core, layout, supportsLayoutColumns: true, supportsImageColumns: true });
  assert.equal(result.id, 'document-1');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].signature_image_x_mm, 4);
  assert.equal(writes[0].signature_width_mm, 40);
});

test('retries draft save without missing columns', async () => {
  const { db, writes } = fakeDb(values => 'signature_image_x_mm' in values);
  const result = await saveDocumentRecord(db, { id: 'document-1', core, layout, supportsLayoutColumns: true, supportsImageColumns: true });
  assert.equal(result.id, 'document-1');
  assert.equal(result.supportsImageColumns, false);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], core);
});

test('saves core fields directly when layout columns are absent', async () => {
  const { db, writes } = fakeDb(() => false);
  const result = await saveDocumentRecord(db, { id: null, core, layout, supportsLayoutColumns: false, supportsImageColumns: false });
  assert.equal(result.id, 'document-1');
  assert.deepEqual(writes, [core]);
});
