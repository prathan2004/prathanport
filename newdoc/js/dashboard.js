import { db } from './supabase.js';
import { shell, escapeHtml, formatDate, toast } from './ui.js';
const user = await shell('ภาพรวม', 'dashboard');
if (user) {
  try {
    const { data, error } = await db.from('documents').select('id,document_number,subject,status,created_at').order('created_at',{ascending:false});
    if (error) throw error;
    const docs = data || [];
    document.querySelector('#page-content').innerHTML = `<div class="stats"><div><small>เอกสารทั้งหมด</small><strong>${docs.length}</strong></div><div><small>ฉบับร่าง</small><strong>${docs.filter(x=>x.status==='draft').length}</strong></div><div><small>สร้าง PDF แล้ว</small><strong>${docs.filter(x=>x.status==='completed').length}</strong></div></div><div class="section-head"><h2>เอกสารล่าสุด</h2><a class="primary" href="create-document.html">+ สร้างบันทึกข้อความ</a></div><div class="table-wrap"><table><thead><tr><th>เลขที่</th><th>เรื่อง</th><th>สถานะ</th><th>สร้างเมื่อ</th></tr></thead><tbody>${docs.slice(0,8).map(x=>`<tr><td>${escapeHtml(x.document_number||'—')}</td><td><a href="create-document.html?id=${encodeURIComponent(x.id)}">${escapeHtml(x.subject||'ยังไม่ระบุเรื่อง')}</a></td><td><span class="status ${x.status}">${x.status==='completed'?'สร้าง PDF แล้ว':'ฉบับร่าง'}</span></td><td>${formatDate(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">ยังไม่มีเอกสาร</td></tr>'}</tbody></table></div>`;
  } catch (error) { toast(error.message,true); }
}
