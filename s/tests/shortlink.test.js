import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import login, { config } from '../netlify/functions/login.js';
import logout from '../netlify/functions/logout.js';
import session from '../netlify/functions/session.js';
import getLinks from '../netlify/functions/get-links.js';
import create from '../netlify/functions/create-link.js';
import update from '../netlify/functions/update-link.js';
import remove from '../netlify/functions/delete-link.js';
import status, { deployStatus } from '../netlify/functions/deploy-status.js';
import { hashPassword } from '../netlify/functions/lib/security.js';

const origin = 'https://short.example.test';
const initial = '\uFEFF# keep these rules\r\n/static /static.html 200\r\n' +
  '/legacy https://legacy.example/ 301\r\n/doc   https://old.example/   302  \r\n/fallback/* /404.html 404';
let text = initial;
let published = initial;
let revision = 1;
let conflict = false;
let cookie;
let csrf;
let publishedPrefix = '';
const fetchOriginal = globalThis.fetch;
const envOriginal = { ...process.env };

function call(handler, { method = 'GET', data, authenticated = true, includeCsrf = true,
  suffix = '', referer = origin, sessionCookie = cookie } = {}) {
  const headers = { Origin: referer };
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && sessionCookie) headers.Cookie = sessionCookie;
  if (authenticated && includeCsrf && csrf) headers['X-CSRF-Token'] = csrf;
  return handler(new Request(origin + '/fn' + suffix, { method, headers,
    body: data === undefined ? undefined : JSON.stringify(data) }));
}

before(async () => {
  Object.assign(process.env, {
    ADMIN_USERNAME: 'test-admin', ADMIN_PASSWORD_HASH: await hashPassword('test-password-123'),
    SESSION_SECRET: 'secret-used-for-tests-only-32-bytes-minimum', SITE_URL: origin,
    GITHUB_OWNER: 'owner', GITHUB_REPO: 'repo', GITHUB_TOKEN: 'test-token',
    GITHUB_FILE_PATH: 's/public/_redirects', GITHUB_BRANCH: 'main',
    NETLIFY_SITE_ID: 'test-site', NETLIFY_API_TOKEN: 'test-netlify-token'
  });
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.origin === 'https://api.github.com') {
      assert.equal(url.pathname, '/repos/owner/repo/contents/s/public/_redirects');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      if (options.method !== 'PUT') {
        assert.equal(url.searchParams.get('ref'), 'main');
        return Response.json({ type: 'file', encoding: 'base64', sha: String(revision),
          content: Buffer.from(text).toString('base64') });
      }
      const payload = JSON.parse(options.body);
      if (conflict) {
        conflict = false;
        text += '\r\n# another writer';
        revision++;
      }
      if (payload.sha !== String(revision)) return Response.json({}, { status: 409 });
      assert.match(payload.message, /^(Add|Update|Delete) short link: /);
      text = Buffer.from(payload.content, 'base64').toString();
      return Response.json({ commit: { sha: 'commit-' + ++revision } });
    }
    if (url.origin === 'https://api.netlify.com') {
      assert.equal(options.headers.Authorization, 'Bearer test-netlify-token');
      return Response.json([{ state: 'ready', commit_ref: 'published' }]);
    }
    assert.equal(url.origin, origin);
    assert.equal(options.method, 'HEAD');
    assert.equal(options.redirect, 'manual');
    const rule = published.split(/\r?\n/).map(line => line.trim().split(/\s+/))
      .find(([path, , code]) => publishedPrefix + path === url.pathname && code === '302');
    return rule ? new Response(null, { status: 302, headers: { Location: rule[1] } }) :
      new Response(null, { status: 404 });
  };
});

after(() => {
  globalThis.fetch = fetchOriginal;
  for (const key of Object.keys(process.env)) if (!(key in envOriginal)) delete process.env[key];
  Object.assign(process.env, envOriginal);
});

test('login, secure cookie, permissions, CSRF, logout', async () => {
  const data = { username: 'test-admin', password: 'test-password-123' };
  assert.equal(config.rateLimit.aggregateBy, 'ip');
  assert.equal((await call(login, { method: 'POST', data: { ...data, password: 'wrong' } })).status, 401);
  assert.equal((await call(login, { method: 'POST', data, referer: 'https://other.test' })).status, 403);
  const result = await call(login, { method: 'POST', data });
  assert.equal(result.status, 200);
  const setCookie = result.headers.get('set-cookie');
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=28800']) {
    assert.ok(setCookie.includes(attribute));
  }
  cookie = setCookie.split(';')[0];
  csrf = (await result.json()).csrf;
  assert.equal((await (await call(session)).json()).csrf, csrf);
  assert.equal((await call(session, { sessionCookie: cookie + 'x' })).status, 401);
  for (const [handler, method] of [[getLinks, 'GET'], [status, 'GET'], [create, 'POST'],
    [update, 'PATCH'], [remove, 'DELETE'], [logout, 'POST']]) {
    assert.equal((await call(handler, { method, authenticated: false })).status, 401);
  }
  assert.equal((await call(create, { method: 'POST', data: {}, includeCsrf: false })).status, 403);
  assert.match((await call(logout, { method: 'POST', data: {} })).headers.get('set-cookie'), /Max-Age=0/);
});

test('create, duplicate and reserved aliases, conflicts, update, delete and backup', async () => {
  const createLink = (alias, url = 'https://destination.example/path?q=1') =>
    call(create, { method: 'POST', data: { alias, url } });
  assert.equal((await createLink('DOC')).status, 409);
  assert.equal((await createLink('legacy')).status, 409);
  assert.equal((await createLink('LOGIN')).status, 400);
  assert.equal((await createLink('line\nbreak')).status, 400);
  assert.equal((await createLink('invalid', 'javascript:alert(1)')).status, 400);
  assert.equal((await createLink('spaces', 'https://target.example/\n/foo')).status, 400);
  assert.equal((await createLink('loop', origin + '/doc')).status, 400);
  conflict = true;
  const created = await createLink('sample');
  assert.equal(created.status, 201);
  assert.ok(text.startsWith(initial + '\r\n# another writer\r\n'));
  assert.match((await (await createLink('')).json()).alias, /^[a-zA-Z0-9]{6}$/);
  const data = { alias: 'doc', expectedUrl: 'https://old.example/', url: 'https://new.example/page' };
  assert.equal((await call(update, { method: 'PATCH', data })).status, 200);
  assert.ok(text.includes('/doc   https://new.example/page   302  \r\n'));
  assert.equal((await call(update, { method: 'PATCH', data })).status, 409);
  assert.equal((await call(remove, { method: 'DELETE', data: { alias: 'doc', expectedUrl: data.url } })).status, 200);
  assert.equal((await call(remove, { method: 'DELETE', data: { alias: 'doc', expectedUrl: data.url } })).status, 404);
  assert.ok(text.startsWith(initial.replace('/doc   https://old.example/   302  \r\n', '')));
  const backup = await call(getLinks, { suffix: '?download=1' });
  assert.equal(backup.headers.get('content-disposition'), 'attachment; filename="_redirects"');
  assert.deepEqual(Buffer.from(await backup.arrayBuffer()), Buffer.from(text));
  const links = await (await call(getLinks)).json();
  assert.equal(links.links.length, 2);
  assert.match(links.history, /\/commits\/main\/s\/public\/_redirects$/);
});

test('deployment checks distinguish unpublished rules from matching HTTP 302 without following Location', async () => {
  const pending = await (await call(status)).json();
  assert.equal(pending.deploy.state, 'ready');
  assert.ok(pending.checks.every(check => check.ready === false));
  published = text;
  const ready = await (await call(status)).json();
  assert.ok(ready.checks.every(check => check.ready === true));
  publishedPrefix = '/s';
  const readyUnderS = await (await call(deployStatus('/s'))).json();
  assert.ok(readyUnderS.checks.every(check => check.ready === true));
});
