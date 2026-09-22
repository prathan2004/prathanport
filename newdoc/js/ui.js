import { db, requireUser } from './supabase.js';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function toast(message, bad = false) {
  let el = document.querySelector('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role','status'); document.body.append(el); }
  el.textContent = message;
  el.className = bad ? 'toast bad show' : 'toast show';
  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove('show'), 4000);
}
export function busy(button, value) { if (button) { button.disabled = value; button.classList.toggle('busy',value); } }
export async function shell(title, active) {
  const user = await requireUser();
  if (!user) return null;
  const items = [['dashboard.html','ภาพรวม','dashboard'],['create-document.html','สร้างบันทึกข้อความ','document'],['documents.html','เอกสารของฉัน','documents'],['pdf-workflow.html','เซ็นและเกษียณ PDF','pdf-workflow'],['signature.html','ลายเซ็นของฉัน','signature'],['profile.html','ข้อมูลส่วนตัว','profile']];
  document.querySelector('#app').innerHTML = `<div class="layout"><aside class="sidebar"><a class="identity" href="dashboard.html"><span class="brand-mark">บค</span><strong>ระบบบันทึกข้อความ</strong></a><nav>${items.map(([href,label,key])=>`<a href="${href}" class="${active===key?'active':''}">${label}</a>`).join('')}</nav><button id="logout" class="logout">ออกจากระบบ</button></aside><div class="main"><header class="topbar"><button id="menu" aria-label="เปิดเมนู" class="icon mobile-only">☰</button><span>ระบบจัดทำบันทึกข้อความอิเล็กทรอนิกส์</span><span class="user-email">${escapeHtml(user.email)}</span></header><main class="content"><div class="page-head"><h1>${title}</h1></div><div id="page-content"></div></main></div></div>`;
  document.querySelector('#menu').onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('#logout').onclick = async () => { await db.auth.signOut(); location.replace('login.html'); };
  return user;
}
export function formatDate(value) { return value ? new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)) : '—'; }
