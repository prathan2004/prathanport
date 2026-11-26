import { endpoint, response, sessionCookie } from './lib/security.js';

export default endpoint('POST', () => response({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', true) } }));
