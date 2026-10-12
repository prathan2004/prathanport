import './styles.css';
import {createIcons, icons} from 'lucide';
import {loadData,saveData,id,validateStudents} from './services/data.js';
import {readRows,exportRows} from './services/import.js';
import {generateSheets,download} from './pdf/generate.js';
import {CHOICES} from './pdf/template.js';

let data;
try {data=loadData();} catch(e) {document.body.textContent=`${e.message} กรุณากู้คืนข้อมูลจากสำรองก่อนใช้งาน`;throw e;}
let view='home', selected=null, pending=null;
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
const button=(label,action,ico='plus',extra='')=>`<button type="button" data-action="${action}" ${extra}>${icon(ico)}${label}</button>`;
const field=(label,name,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${attrs} required></label>`;
const select=(label,name,options,value)=>`<label>${label}<select name="${name}" required>${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const courseOptions=()=>data.courses.map(c=>[c.id,`${c.code} · ${c.name} · ${c.class_id}`]);
function commit(next) {saveData(next);data=next;}
function toast(message) {const box=document.querySelector('#notice');box.textContent=message;box.hidden=false;}
function render() {
  const tabs=[['home','หน้าหลัก','layout-dashboard'],['exams','ชุดข้อสอบ','files'],['students','นักเรียน','users'],['courses','รายวิชา','book-open'],['settings','ตั้งค่า','settings']];
  app.innerHTML=`<aside><div class="brand">${icon('scan-line')}<div>Smart Exam<span>Checker</span></div></div><nav>${tabs.map(([v,t,i])=>`<button data-view="${v}" class="${view===v?'active':''}">${icon(i)}<span>${t}</span></button>`).join('')}</nav><div class="local"><span class="dot"></span>โหมด Local</div></aside><main><header><div><p class="eyebrow">พื้นที่ทำงานของครู</p><h1>${tabs.find(t=>t[0]===view)?.[1]??'เฉลยและกระดาษคำตอบ'}</h1></div><span class="badge">ข้อมูลในอุปกรณ์นี้</span></header><div id="notice" role="status" hidden></div><section id="content">${content()}</section><footer>Smart Exam Checker · Phase 1–2</footer></main><dialog id="modal"></dialog>`;
  createIcons({icons});
}
function content() {
  if(view==='home') return `<div class="stats">${[['รายวิชา',data.courses.length,'book-open'],['ชุดข้อสอบ',data.exams.length,'files'],['นักเรียน',data.students.length,'users'],['กระดาษที่สร้าง',data.sheets.length,'file-check']].map(([t,n,i])=>`<article>${icon(i)}<span>${t}</span><strong>${n}</strong></article>`).join('')}</div><div class="section-head"><h2>ชุดข้อสอบล่าสุด</h2>${button('สร้างชุดข้อสอบ','new-exam')}</div>${examList()}<div class="workflow"><h2>กระดาษคำตอบพร้อมพิมพ์</h2><p>ทั่วไป · รายบุคคล · A4 · 5 ตัวเลือก</p>${button('จัดการนักเรียน','go-students','users')}${button('จัดการรายวิชา','go-courses','book-open')}</div>`;
  if(view==='courses') return `<div class="section-head"><h2>รายวิชาและห้องเรียน</h2>${button('เพิ่มรายวิชา','new-course')}</div>${table(['รหัส','รายวิชา','ห้อง','ปี / ภาคเรียน',''],data.courses.map(c=>[esc(c.code),esc(c.name),esc(c.class_id),`${esc(c.academic_year)} / ${esc(c.term)}`,`${button('','edit-course','pencil',`data-id="${c.id}" title="แก้ไข"`)}${button('','delete-course','trash-2',`data-id="${c.id}" title="ลบ"` )}`]))}`;
  if(view==='students') return `<div class="section-head"><h2>รายชื่อนักเรียน <span class="muted">${data.students.length} คน</span></h2><div class="actions">${button('แบบฟอร์ม Excel','student-template','download')}${button('นำเข้า','import-students','upload')}${button('เพิ่มนักเรียน','new-student')}</div></div>${table(['รหัสนักเรียน','เลขที่','ชื่อ–นามสกุล','ห้อง','ปี','สถานะ',''],data.students.map(s=>[esc(s.student_id),esc(s.student_no),esc(s.full_name),esc(s.class_id),esc(s.academic_year),s.status==='active'?'กำลังศึกษา':'ไม่ใช้งาน',`${button('','edit-student','pencil',`data-id="${s.id}" title="แก้ไข"`)}${button('','delete-student','trash-2',`data-id="${s.id}" title="ลบ"`)}`]))}`;
  if(view==='exams') return `<div class="section-head"><h2>ชุดข้อสอบทั้งหมด</h2>${button('สร้างชุดข้อสอบ','new-exam')}</div>${examList()}`;
  if(view==='key') return examDetail();
  return `<h2>ข้อมูลและการเชื่อมต่อ</h2><div class="settings"><h3>สำรองข้อมูลในเครื่อง</h3><div class="actions">${button('ดาวน์โหลดสำรอง','backup','download')}${button('กู้คืนข้อมูล','restore','upload')}</div><h3>บริการที่จะเชื่อมต่อใน Phase ถัดไป</h3><p>Google Workspace · Google Sheets · Google Drive</p><p class="muted">ยังไม่ได้เชื่อมบัญชีครู การสแกน OMR และรายงานคะแนนยังไม่เปิดใช้งาน</p></div>`;
}
function table(headers,rows) {return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(t=>`<td>${t}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${icon('folder-open')}<h3>ยังไม่มีข้อมูล</h3></div>`;}
function examList() {return table(['ชุดข้อสอบ','รายวิชา / ห้อง','ข้อ','เฉลย',''],data.exams.map(e=>[`${esc(e.name)} <span class="badge">${esc(e.variant)}</span>`,`${esc(data.courses.find(c=>c.id===e.course_id)?.name)} / ${esc(e.class_id)}`,e.question_count,`<span class="badge ${e.approved?'success':''}">${e.approved?'ตรวจสอบแล้ว':'ฉบับร่าง'} · v${e.key_version}</span>`,`${button('เปิด','open-exam','arrow-right',`data-id="${e.id}"`)}${button('','edit-exam','pencil',`data-id="${e.id}" title="แก้ไขชุดข้อสอบ"`)}${button('','delete-exam','trash-2',`data-id="${e.id}" title="ลบชุดข้อสอบ"`)}`]));}
function examDetail() {
  const e=data.exams.find(e=>e.id===selected);
  if(!e) {view='exams';return content();}
  const students=data.students.filter(s=>s.class_id===e.class_id&&s.academic_year===data.courses.find(c=>c.id===e.course_id)?.academic_year&&s.status==='active');
  return `<div class="section-head"><div><h2>${esc(e.name)} · ชุด ${esc(e.variant)}</h2><p class="muted">${e.question_count} ข้อ · คะแนนเต็ม ${e.question_count*e.points} · ผ่าน ${e.pass_score} · เฉลย v${e.key_version}</p></div>${button('ย้อนกลับ','go-exams','arrow-left')}</div><div class="section-head"><h3>เฉลย</h3><div class="actions">${button('แบบฟอร์มเฉลย','key-template','download')}${button('นำเข้าเฉลย','import-key','upload')}</div></div><form id="key-form"><div class="answer-grid">${Array.from({length:e.question_count},(_,i)=>`<label class="answer"><span>${i+1}</span><select name="q${i}" aria-label="เฉลยข้อ ${i+1}" required><option value="">–</option>${CHOICES.map(c=>`<option ${e.answers[i]===c?'selected':''}>${c}</option>`).join('')}</select></label>`).join('')}</div><div class="actions"><button type="submit">${icon('save')}บันทึกเฉลย</button>${button('ตรวจสอบก่อนใช้งาน','review-key','check-check')}</div></form><div class="pdf-section"><h3>สร้างกระดาษคำตอบ</h3><p class="muted">รหัส ${e.id_digits} หลัก · เลขที่ ${e.no_digits} หลัก · นักเรียน ${students.length} คน</p><div class="actions">${button('PDF ทั่วไป','pdf-generic','file-down',e.approved?'':'disabled')}${button('PDF รวมรายบุคคล','pdf-all','files',e.approved&&students.length?'':'disabled')}</div><label class="individual">นักเรียน<select id="pdf-student"><option value="">เลือกนักเรียน</option>${students.map(s=>`<option value="${s.id}">${esc(s.student_no)} · ${esc(s.full_name)} (${esc(s.student_id)})</option>`).join('')}</select></label>${button('PDF รายคน','pdf-one','file-down',e.approved&&students.length?'':'disabled')}</div>`;
}
function modal(html) {const d=document.querySelector('#modal');d.innerHTML=html;d.showModal();createIcons({icons});}
function formModal(title,kind,body,itemId='') {modal(`<form id="entity-form" data-kind="${kind}" data-id="${itemId}"><div class="section-head"><h2>${title}</h2>${button('','close','x','title="ปิด"')}</div><div class="form-grid">${body}</div><p id="form-error" role="alert"></p><div class="actions"><button type="submit">${icon('save')}บันทึก</button>${button('ยกเลิก','close','x')}</div></form>`);}
function editCourse(itemId) {const c=data.courses.find(c=>c.id===itemId)??{};formModal('รายวิชาและห้องเรียน','course',field('ชื่อรายวิชา','name',c.name)+field('รหัสวิชา','code',c.code)+field('ห้องเรียน','class_id',c.class_id)+field('ปีการศึกษา','academic_year',c.academic_year??2569,'number','min="2000" max="3000"')+select('ภาคเรียน','term',[[1,'1'],[2,'2']],c.term),itemId);}
function editStudent(itemId) {const s=data.students.find(s=>s.id===itemId)??{};formModal('ข้อมูลนักเรียน','student',field('รหัสนักเรียน','student_id',s.student_id,'text','inputmode="numeric" pattern="[0-9]{1,13}"')+field('เลขที่','student_no',s.student_no,'text','inputmode="numeric" pattern="[0-9]{1,3}"')+field('ชื่อ–นามสกุล','full_name',s.full_name)+field('ห้องเรียน','class_id',s.class_id)+field('ปีการศึกษา','academic_year',s.academic_year??2569,'number','min="2000" max="3000"')+select('สถานะ','status',[['active','กำลังศึกษา'],['inactive','ไม่ใช้งาน']],s.status),itemId);}
function editExam(itemId) {if(!data.courses.length) {view='courses';render();toast('เพิ่มรายวิชาก่อนสร้างชุดข้อสอบ');return;}const e=data.exams.find(e=>e.id===itemId)??{};formModal('ชุดข้อสอบ','exam',field('ชื่อชุดข้อสอบ','name',e.name)+select('รายวิชา / ห้อง','course_id',courseOptions(),e.course_id)+select('ชุด','variant',['A','B','C','D'].map(v=>[v,v]),e.variant)+field('จำนวนข้อ','question_count',e.question_count??20,'number','min="1" max="200"')+field('คะแนนต่อข้อ','points',e.points??1,'number','min="0.01" step="0.01"')+field('คะแนนผ่าน','pass_score',e.pass_score??10,'number','min="0" step="0.01"')+select('จำนวนหลักรหัสนักเรียน','id_digits',[6,8,10,13].map(v=>[v,`${v} หลัก`]),e.id_digits??8)+select('จำนวนหลักเลขที่','no_digits',[[2,'2 หลัก'],[3,'3 หลัก']],e.no_digits??2),itemId);}
async function filePicker(accept,callback) {const input=document.createElement('input');input.type='file';input.accept=accept;input.onchange=()=>run(()=>callback(input.files[0]));input.click();}
async function run(fn) {try {await fn();} catch(e) {toast(e.message||'เกิดข้อผิดพลาด');}}
app.addEventListener('click',event=> {const b=event.target.closest('button');if(!b)return; if(b.dataset.view){view=b.dataset.view;render();return;}if(b.dataset.action)run(()=>action(b.dataset.action,b.dataset.id));});
async function action(a,itemId) {
  if(a==='close'){document.querySelector('#modal').close();return;}
  if(a.startsWith('go-')){view=a.slice(3);render();return;}
  if(a==='new-course'||a==='edit-course')return editCourse(itemId);
  if(a==='new-student'||a==='edit-student')return editStudent(itemId);
  if(a==='new-exam'||a==='edit-exam')return editExam(itemId);
  if(a==='open-exam'){selected=itemId;view='key';render();return;}
  if(a.startsWith('delete-')) {
    const kind=a.slice(7),key={course:'courses',student:'students',exam:'exams'}[kind];
    if(kind==='course'&&data.exams.some(e=>e.course_id===itemId))throw new Error('รายวิชานี้มีข้อสอบ กรุณาลบข้อสอบก่อน');
    modal(`<h2>ยืนยันการลบ</h2><p>รายการนี้จะถูกลบจากข้อมูลในเครื่อง</p>${button('ลบรายการ','confirm-delete','trash-2',`data-id="${key}:${itemId}"`)}${button('ยกเลิก','close','x')}`);return;
  }
  if(a==='confirm-delete'){const [key,recordId]=itemId.split(':');commit({...data,[key]:data[key].filter(x=>x.id!==recordId)});render();return;}
  if(a==='student-template'){exportRows([{student_id:'00123456',student_no:'1',full_name:'ตัวอย่าง นักเรียน',class_id:'ม.1/1',academic_year:'2569',status:'active'}],'students-template.xlsx');return;}
  if(a==='import-students')return filePicker('.xlsx,.xls,.csv',async file=> {
    const parsed=validateStudents(await readRows(file),data.students);pending=parsed.students;
    modal(`<h2>ตรวจสอบการนำเข้า</h2><p>${parsed.students.length} รายการ</p>${parsed.errors.length?`<div class="errors">${parsed.errors.map(e=>`<p>${esc(e)}</p>`).join('')}</div>`:table(['รหัส','ชื่อ','ห้อง'],parsed.students.map(s=>[esc(s.student_id),esc(s.full_name),esc(s.class_id)]))}<div class="actions">${button('ยืนยันนำเข้า','confirm-import','check',parsed.errors.length?'disabled':'')}${button('ยกเลิก','close','x')}</div>`);
  });
  if(a==='confirm-import'){const checked=validateStudents(pending,data.students);if(checked.errors.length)throw new Error(checked.errors.join('\n'));commit({...data,students:[...data.students,...checked.students.map(s=>({...s,id:id(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()}))]});pending=null;render();toast('นำเข้าเรียบร้อย');return;}
  if(a==='backup'){download(JSON.stringify({version:1,data},null,2),'exam-backup.json','application/json');return;}
  if(a==='restore')return filePicker('.json',async file=>{const backup=JSON.parse(await file.text());if(backup.version!==1||!['courses','students','exams','sheets'].every(k=>Array.isArray(backup.data?.[k])))throw new Error('ไฟล์สำรองไม่ถูกต้อง');const errors=validateStudents(backup.data.students).errors;if(backup.data.students.length&&errors.length)throw new Error(errors.join('\n'));if(backup.data.exams.some(e=>!Number.isInteger(e.question_count)||e.question_count<1||e.question_count>200||!Array.isArray(e.answers)||e.answers.length!==e.question_count||e.answers.some(v=>v!==''&&!CHOICES.includes(v))||!backup.data.courses.some(c=>c.id===e.course_id)))throw new Error('ข้อมูลข้อสอบในไฟล์สำรองไม่ถูกต้อง');pending=backup.data;modal(`<h2>กู้คืนข้อมูล</h2><p>แทนที่ข้อมูลปัจจุบันด้วย ${pending.exams.length} ข้อสอบ และ ${pending.students.length} นักเรียน</p>${button('ยืนยันกู้คืน','confirm-restore','check')}${button('ยกเลิก','close','x')}`);});
  if(a==='confirm-restore'){commit(pending);pending=null;render();return;}
  const e=data.exams.find(e=>e.id===selected);
  if(a==='key-template'){exportRows(Array.from({length:e.question_count},(_,i)=>({question:i+1,answer:e.answers[i]||''})),'answer-key.xlsx');return;}
  if(a==='import-key')return filePicker('.xlsx,.xls,.csv',async file=>{
    const rows=await readRows(file),answers=Array(e.question_count).fill(''),seen=new Set();
    for(const row of rows){const n=Number(row.question),answer=String(row.answer).trim();if(!Number.isInteger(n)||n<1||n>e.question_count||seen.has(n)||!CHOICES.includes(answer))throw new Error('เฉลยต้องมี question ไม่ซ้ำ และ answer เป็น ก ข ค ง จ');seen.add(n);answers[n-1]=answer;}
    if(seen.size!==e.question_count)throw new Error('จำนวนเฉลยไม่ครบ');storeKey(e,answers);render();toast('นำเข้าเฉลยแล้ว กรุณาตรวจสอบก่อนใช้งาน');
  });
  if(a==='review-key'){
    const current=[...document.querySelectorAll('#key-form select')].map(s=>s.value);
    if(current.some((v,i)=>v!==e.answers[i]))throw new Error('กรุณาบันทึกเฉลยที่แก้ไขก่อน');
    if(e.answers.some(v=>!CHOICES.includes(v)))throw new Error('กรอกและบันทึกเฉลยให้ครบทุกข้อ');
    modal(`<h2>ตรวจสอบเฉลย · v${e.key_version}</h2><p>คะแนนเต็ม ${e.question_count*e.points} · ผ่าน ${e.pass_score}</p><div class="review-grid">${e.answers.map((v,i)=>`<span>${i+1}. <b>${v}</b></span>`).join('')}</div><div class="actions">${button('ยืนยันเปิดใช้งาน','approve-key','check-check')}${button('กลับไปแก้ไข','close','pencil')}</div>`);return;
  }
  if(a==='approve-key'){commit({...data,exams:data.exams.map(x=>x.id===e.id?{...x,approved:true,updated_at:new Date().toISOString()}:x)});render();return;}
  if(a.startsWith('pdf-')){
    if(!e.approved)throw new Error('กรุณาตรวจสอบเฉลยก่อนสร้าง PDF');
    const course=data.courses.find(c=>c.id===e.course_id);
    let students=data.students.filter(s=>s.class_id===e.class_id&&s.academic_year===course.academic_year&&s.status==='active');
    if(a==='pdf-one'){const studentId=document.querySelector('#pdf-student').value;students=students.filter(s=>s.id===studentId);if(!students.length)throw new Error('เลือกนักเรียนก่อน');}
    document.querySelectorAll('[data-action^="pdf-"]').forEach(b=>b.disabled=true);
    try {toast('กำลังสร้าง PDF…');const result=await generateSheets(e,course,students,a!=='pdf-generic',(n,total)=>toast(`กำลังสร้าง PDF ${n}/${total}`));commit({...data,sheets:[...data.sheets,...result.records]});download(result.bytes,`answer-sheet-${e.variant}-${a.slice(4)}.pdf`);render();toast('ดาวน์โหลด PDF แล้ว');}finally{if(view==='key')document.querySelectorAll('[data-action^="pdf-"]').forEach(b=>b.disabled=false);}
  }
}
function storeKey(e,answers) {if(answers.every((v,i)=>v===e.answers[i]))return;const history=[...(e.key_history??[]),{version:e.key_version,answers:e.answers,updated_at:e.updated_at}];commit({...data,exams:data.exams.map(x=>x.id===e.id?{...x,answers,key_version:x.key_version+1,key_history:history,approved:false,updated_at:new Date().toISOString()}:x)});}
app.addEventListener('submit',event=>{event.preventDefault();const form=event.target;run(()=>{
  if(form.id==='key-form'){const e=data.exams.find(e=>e.id===selected);storeKey(e,Array.from({length:e.question_count},(_,i)=>form.elements[`q${i}`].value));render();toast('บันทึกเฉลยแล้ว');return;}
  if(form.id!=='entity-form')return;
  try {
    const values=Object.fromEntries(new FormData(form));Object.keys(values).forEach(k=>values[k]=values[k].trim());
    if(Object.values(values).some(v=>!v))throw new Error('กรอกข้อมูลให้ครบ');
    const kind=form.dataset.kind,key={course:'courses',student:'students',exam:'exams'}[kind],itemId=form.dataset.id;
    let record={...values,id:itemId||id(),updated_at:new Date().toISOString()};
    const old=data[key].find(x=>x.id===itemId);record.created_at=old?.created_at??record.updated_at;
    if(kind==='student'){const check=validateStudents([values],data.students.filter(s=>s.id!==itemId));if(check.errors.length)throw new Error(check.errors.join('\n'));}
    if(kind==='course'){
      if(data.courses.some(c=>c.id!==itemId&&c.code===values.code&&c.class_id===values.class_id&&c.academic_year===values.academic_year&&c.term===values.term))throw new Error('รายวิชานี้มีอยู่แล้ว');
      if(old&&data.exams.some(e=>e.course_id===old.id)&&(old.class_id!==values.class_id||old.academic_year!==values.academic_year))throw new Error('ห้องหรือปีการศึกษามีข้อสอบอ้างอิงอยู่ กรุณาสร้างรายวิชาใหม่');
    }
    if(kind==='exam'){
      for(const k of ['question_count','points','pass_score','id_digits','no_digits'])record[k]=Number(record[k]);
      if(!Number.isInteger(record.question_count)||record.question_count<1||record.question_count>200||record.points<=0||record.pass_score<0||record.pass_score>record.question_count*record.points)throw new Error('จำนวนข้อหรือคะแนนไม่ถูกต้อง');
      record.class_id=data.courses.find(c=>c.id===record.course_id).class_id;
      record.answers=Array.from({length:record.question_count},(_,i)=>old?.answers[i]??'');
      const changed=old&&['question_count','points','pass_score','course_id','variant','id_digits','no_digits'].some(k=>old[k]!==record[k]);
      record.key_version=old?(old.key_version+(changed?1:0)):1;record.approved=old?.approved&&!changed||false;
      record.key_history=old?.key_history??[];
      if(changed)record.key_history=[...record.key_history,{version:old.key_version,answers:old.answers,updated_at:old.updated_at}];
    }
    commit({...data,[key]:old?data[key].map(x=>x.id===itemId?record:x):[...data[key],record]});render();toast('บันทึกเรียบร้อย');
  }catch(e){form.querySelector('#form-error').textContent=e.message;}
});});
render();
