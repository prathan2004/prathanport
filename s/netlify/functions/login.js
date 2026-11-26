import { AppError, checkCredentials, createSession, endpoint, response, sessionCookie } from './lib/security.js';

export const config = { rateLimit: { windowLimit: 8, windowSize: 60, aggregateBy: 'ip' } };

export default endpoint('POST', async ({ body }) => {
  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password ||
      username.length > 128 || Buffer.byteLength(password) > 1024) {
    throw new AppError(400, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ถูกต้อง');
  }
  if (!await checkCredentials(username, password)) throw new AppError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const { session, value } = createSession(username);
  return response({ username, csrf: session.csrf }, { headers: { 'Set-Cookie': sessionCookie(value) } });
}, { publicAccess: true });
