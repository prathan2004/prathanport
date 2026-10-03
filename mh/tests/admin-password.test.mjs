import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../netlify/functions/mh-admin-password.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const request = (body = { userId: id, password: 'new-password' }, token = 'valid') => new Request('https://example.com/.netlify/functions/mh-admin-password', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body)
});

test('admin password endpoint validates identity, role, input and upstream failures', async t => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MH_SUPABASE_SECRET_KEY;
  process.env.MH_SUPABASE_SECRET_KEY = 'server-only-secret';
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MH_SUPABASE_SECRET_KEY;
    else process.env.MH_SUPABASE_SECRET_KEY = originalKey;
  });
  let calls;
  function mock(role = 'admin', status = 'active', userStatus = 200, updateStatus = 200) {
    calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/auth/v1/user')) return Response.json({ id }, { status: userStatus });
      if (url.includes('/rest/v1/profiles')) return Response.json([{ role, status }]);
      return Response.json({ user: { id } }, { status: updateStatus });
    };
  }
  await t.test('rejects absent and invalid tokens without changing any account', async () => {
    mock(); assert.equal((await handler(request(undefined, ''))).status, 401); assert.equal(calls.length, 0);
    mock('admin', 'active', 401); assert.equal((await handler(request())).status, 401); assert.equal(calls.length, 1);
  });
  await t.test('rejects members and inactive admins', async () => {
    for (const [role, status] of [['member', 'active'], ['admin', 'inactive']]) {
      mock(role, status); assert.equal((await handler(request())).status, 403); assert.equal(calls.length, 2);
    }
  });
  await t.test('rejects invalid identifiers and weak passwords', async () => {
    for (const body of [null, { userId: '../admin', password: 'new-password' }, { userId: id, password: 'short' }]) {
      mock(); assert.equal((await handler(request(body))).status, 400); assert.equal(calls.length, 2);
    }
  });
  await t.test('updates only password of requested account and does not disclose credentials', async () => {
    mock(); const response = await handler(request({ userId: id, password: 'new-password', role: 'admin', email: 'ignored' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(calls[0].options.headers.Authorization, 'Bearer valid');
    assert.ok(calls[2].url.endsWith(`/admin/users/${id}`));
    assert.deepEqual(JSON.parse(calls[2].options.body), { password: 'new-password' });
  });
  await t.test('handles missing configuration and upstream failure', async () => {
    delete process.env.MH_SUPABASE_SECRET_KEY;
    assert.equal((await handler(request())).status, 503);
    process.env.MH_SUPABASE_SECRET_KEY = 'server-only-secret';
    mock('admin', 'active', 200, 500); assert.equal((await handler(request())).status, 502);
    assert.equal((await handler(new Request('https://example.com'))).status, 405);
  });
});
