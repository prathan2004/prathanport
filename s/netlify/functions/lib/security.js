import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const lifetime = 8 * 60 * 60;
export const cookieName = 'shortlink_session';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function siteOrigin() {
  const configured = process.env.SITE_URL || '';
  const url = URL.parse(configured);
  if (!url || url.origin !== configured.replace(/\/$/, '') ||
      (url.protocol !== 'https:' && !isLocal(url))) {
    throw new AppError(503, 'ตั้งค่า SITE_URL เป็น origin ของเว็บไซต์');
  }
  return url.origin;
}

function isLocal(url) {
  return url.protocol === 'http:' && process.env.NETLIFY_DEV === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export function same(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await derive(password, salt, 64);
  return salt + ':' + key.toString('hex');
}

export async function checkCredentials(username, password) {
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (!process.env.ADMIN_USERNAME || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) {
    throw new AppError(503, 'ยังไม่ได้ตั้งค่าบัญชีผู้ดูแล');
  }
  const valid = same(await hashPassword(password, hash.split(':')[0]), hash);
  return same(username, process.env.ADMIN_USERNAME) && valid;
}

function sign(value) {
  const secret = process.env.SESSION_SECRET || '';
  if (Buffer.byteLength(secret) < 32) throw new AppError(503, 'ยังไม่ได้ตั้งค่า Session Secret');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSession(username) {
  const session = { username, expires: Math.floor(Date.now() / 1000) + lifetime,
    csrf: randomBytes(32).toString('base64url') };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return { session, value: payload + '.' + sign(payload) };
}

function requireSession(request) {
  const cookie = (request.headers.get('cookie') || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(cookieName + '='));
  const parts = cookie?.slice(cookieName.length + 1).split('.') || [];
  if (parts.length === 2 && same(parts[1], sign(parts[0]))) {
    const session = JSON.parse(Buffer.from(parts[0], 'base64url'));
    if (session.expires > Date.now() / 1000 && session.username === process.env.ADMIN_USERNAME) return session;
  }
  throw new AppError(401, 'กรุณาเข้าสู่ระบบอีกครั้ง');
}

export function sessionCookie(value, clear = false) {
  const secure = isLocal(new URL(siteOrigin())) ? '' : '; Secure';
  return cookieName + '=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' +
    (clear ? 0 : lifetime) + secure;
}

export function response(data, options = {}) {
  return Response.json(data, { ...options, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...options.headers
  } });
}

export function endpoint(method, handler, { publicAccess = false } = {}) {
  return async (request, context) => {
    try {
      if (request.method !== method) return response({ error: 'HTTP method ไม่ถูกต้อง' },
        { status: 405, headers: { Allow: method } });
      const session = publicAccess ? null : requireSession(request);
      let body;
      if (method !== 'GET') {
        if (request.headers.get('origin') !== siteOrigin() ||
            (session && !same(request.headers.get('x-csrf-token') || '', session.csrf))) {
          throw new AppError(403, 'ไม่สามารถยืนยันคำขอได้');
        }
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
          throw new AppError(415, 'กรุณาส่งข้อมูลเป็น JSON');
        }
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength > 8192) throw new AppError(413, 'ข้อมูลมีขนาดใหญ่เกินไป');
        try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
        catch { throw new AppError(400, 'ข้อมูล JSON ไม่ถูกต้อง'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'ข้อมูลไม่ถูกต้อง');
      }
      return await handler({ request, context, session, body });
    } catch (error) {
      if (!(error instanceof AppError)) console.error('ShortLink function error', error.name);
      return response({ error: error instanceof AppError ? error.message : 'ระบบไม่สามารถประมวลผลคำขอได้' },
        { status: error instanceof AppError ? error.status : 500 });
    }
  };
}
