const DEFAULT_URL = 'https://rzqbioivhrfruceyauau.supabase.co';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer \S+$/i.test(authorization)) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
  const key = process.env.MH_SUPABASE_SECRET_KEY;
  if (!key) return json({ error: 'ผู้ดูแลต้องตั้งค่าบริการเปลี่ยนรหัสผ่านบนเซิร์ฟเวอร์ก่อน' }, 503);
  const base = process.env.MH_SUPABASE_URL || DEFAULT_URL;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: key, Authorization: authorization }, signal: AbortSignal.timeout(10000)
    });
    if (!userResponse.ok) return json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 401);
    const user = await userResponse.json();
    if (!user.id) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
    const profileResponse = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,status`, {
      headers, signal: AbortSignal.timeout(10000)
    });
    if (!profileResponse.ok) return json({ error: 'ตรวจสอบสิทธิ์ไม่สำเร็จ' }, 502);
    const profiles = await profileResponse.json();
    if (profiles[0]?.role !== 'admin' || profiles[0]?.status !== 'active') {
      return json({ error: 'เฉพาะ Admin ที่เปิดใช้งานเท่านั้น' }, 403);
    }
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'ข้อมูลคำขอใหญ่เกินไป' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
    if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId || '')
      || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
      return json({ error: 'ข้อมูลสมาชิกไม่ถูกต้อง หรือรหัสผ่านต้องยาว 8–128 ตัวอักษร' }, 400);
    }
    const result = await fetch(`${base}/auth/v1/admin/users/${body.userId}`, {
      method: 'PUT', headers, body: JSON.stringify({ password: body.password }),
      signal: AbortSignal.timeout(10000)
    });
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      if (result.status === 404) return json({ error: 'ไม่พบบัญชีสมาชิก' }, 404);
      if (error.code === 'weak_password' || error.code === 'same_password') {
        return json({ error: 'กรุณาใช้รหัสผ่านใหม่ที่แข็งแรงและต่างจากรหัสเดิม' }, 400);
      }
      return json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์' }, 502);
    }
    return json({ success: true });
  } catch {
    return json({ error: 'เชื่อมต่อบริการไม่สำเร็จ กรุณาลองใหม่' }, 502);
  }
}
