import { db } from './supabase.js';
import { shell, escapeHtml, toast, busy } from './ui.js';
const user = await shell('ข้อมูลส่วนตัว','profile');
if (user) {
  const { data, error } = await db.from('profiles').select('*').eq('user_id',user.id).maybeSingle();
  if (error) toast(error.message,true);
  document.querySelector('#page-content').innerHTML = `<form id="profile-form" class="form-grid narrow"><label>ชื่อ<input name="first_name" value="${escapeHtml(data?.first_name)}" required></label><label>นามสกุล<input name="last_name" value="${escapeHtml(data?.last_name)}" required></label><label>ตำแหน่ง<input name="position" value="${escapeHtml(data?.position)}"></label><label>หน่วยงาน<input name="department" value="${escapeHtml(data?.department)}"></label><label class="span-2">อีเมล<input value="${escapeHtml(user.email)}" disabled></label><div class="span-2"><button class="primary">บันทึกข้อมูล</button></div></form>`;
  document.querySelector('#profile-form').onsubmit = async event => {
    event.preventDefault(); const button = event.target.querySelector('button'); busy(button,true);
    try { const values = Object.fromEntries(new FormData(event.target)); const { error } = await db.from('profiles').upsert({user_id:user.id,email:user.email,...values},{onConflict:'user_id'}); if(error)throw error; toast('บันทึกข้อมูลส่วนตัวแล้ว'); }
    catch(error){toast(error.message,true)} finally{busy(button,false)}
  };
}
