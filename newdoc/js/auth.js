import { db, configured, currentUser } from './supabase.js';
const errorEl = document.querySelector('#login-error');
if (!configured) errorEl.textContent = 'ยังไม่ได้ตั้งค่า Supabase URL และ publishable key ใน js/config.js';
else currentUser().then(user => { if (user) location.replace('dashboard.html'); }).catch(() => {});
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!configured) return;
  const button = event.target.querySelector('button'); button.disabled = true; errorEl.textContent = '';
  try {
    const form = new FormData(event.target);
    const { error } = await db.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
    if (error) throw error;
    location.replace('dashboard.html');
  } catch (error) { errorEl.textContent = error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message; button.disabled = false; }
});
