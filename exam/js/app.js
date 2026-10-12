import {readState,writeState,validateState,validateStudent,saveResultState,getImage,removeResultState,replaceDatabase} from './database.js';
import {validateExam,readyExam} from './exam.js';
import {COUNTS} from './template.js';
import {DEFAULT_OMR,validateOMR} from './config.js';
import {answerSheetPDF} from './answer-key.js';
import {Scanner} from './scanner.js';
import {report} from './reports.js';
import {reportRows,exportReport} from './export.js';
import {esc,uid,now,btn,icon,icons,toast,field,select,table,format,pickFile,download} from './utils.js';
const app=document.querySelector('#app');
let state,view='home',selected=null,scanner=null,reportExam='',reportVersion='',busy=false,confirmResolve=null;
const nav=[['home','หน้าหลัก','layout-dashboard'],['exams','ข้อสอบ','files'],['scan','ตรวจข้อสอบ','scan-line'],['results','ผลคะแนน','chart-no-axes-combined'],['students','นักเรียน','users'],['settings','ตั้งค่า','settings']];
const names=Object.fromEntries(nav.map(([id,name])=>[id,name]));
const byExam=id=>state.exams.find(e=>e.id===id);
const byStudent=id=>state.students.find(s=>s.id===id);
async function commit(next){await writeState(next);state=next;}
function closeModal(){document.querySelector('#modal')?.close();if(confirmResolve){confirmResolve(false);confirmResolve=null;}}
function modal(html){closeModal();const el=document.querySelector('#modal');el.innerHTML=html;el.showModal();icons();}
function confirm(title,description){return new Promise(resolve=>{modal(`<h2>${esc(title)}</h2><p>${esc(description)}</p><div class="actions">${btn('ยืนยัน','confirm-yes','check','class="primary"')}${btn('ยกเลิก','close-modal','x')}</div>`);confirmResolve=resolve;});}
function render(){
  scanner?.destroy();scanner=null;
  app.innerHTML=`<aside><a class="brand" href="./" aria-label="Smart Exam Checker"><img src="./assets/icon.svg" alt="" width="36" height="36"><div>Smart Exam<span>Checker</span></div></a><nav aria-label="เมนูหลัก">${nav.map(([id,name,i])=>`<button type="button" data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(i)}<span>${name}</span></button>`).join('')}</nav><div class="device-label">${icon('hard-drive')}ข้อมูลในอุปกรณ์นี้</div></aside><main><header><div><p class="eyebrow">ระบบตรวจข้อสอบอัจฉริยะ</p><h1>${view==='key'?'เฉลยและกระดาษคำตอบ':names[view]}</h1></div><span class="badge">ไม่ต้องเข้าสู่ระบบ</span></header><section id="content">${content()}</section><p class="storage-note">${icon('database')}ข้อมูลเก็บใน browser ของอุปกรณ์นี้ การล้างข้อมูลเว็บไซต์อาจทำให้ข้อมูลสูญหาย กรุณาสำรองข้อมูล</p></main><dialog id="modal"></dialog>`;
  const dialog=document.querySelector('#modal');dialog.addEventListener('cancel',()=>{if(confirmResolve){confirmResolve(false);confirmResolve=null;}});
  icons();
  if(view==='scan'){scanner=new Scanner(document.querySelector('#content'),()=>state,async(result,image,student)=>{
    const next={...state,students:student?[...state.students,student]:state.students,results:[...state.results.filter(r=>r.id!==result.id),result]};await saveResultState(next,result.id,image);state=next;
  },confirm);scanner.mount();}
}
function stats(items){return `<div class="stats">${items.map(([label,value,i])=>`<article><div>${icon(i)}<span>${label}</span></div><strong>${value}</strong></article>`).join('')}</div>`;}
function content(){
  if(view==='scan')return '';
  if(view==='home'){
    const r=report(state.results);
    return `${stats([['ชุดข้อสอบ',state.exams.length,'files'],['ตรวจแล้ว',r.n,'file-check'],['คะแนนเฉลี่ย',r.n?format(r.mean):'–','chart-no-axes-combined'],['สูงสุด / ต่ำสุด',r.n?`${format(r.max)} / ${format(r.min)}`:'–','arrow-up-down']])}<div class="section-head"><h2>ชุดข้อสอบ</h2><div class="actions">${btn('สร้างชุดข้อสอบ','new-exam')}${btn('เริ่มตรวจ','go-scan','scan-line','class="primary"')}</div></div>${examsTable()}<div class="section-head recent"><h2>ผลตรวจล่าสุด</h2>${btn('ผลทั้งหมด','go-results','arrow-right')}</div>${resultsTable(state.results.slice(-5).reverse())}`;
  }
  if(view==='exams')return `<div class="section-head"><h2>ชุดข้อสอบทั้งหมด</h2>${btn('สร้างชุดข้อสอบ','new-exam')}</div>${examsTable()}`;
  if(view==='key')return keyPage();
  if(view==='students')return `<div class="section-head"><h2>รายชื่อนักเรียน <span class="muted">${state.students.length} คน</span></h2>${btn('เพิ่มนักเรียน','new-student')}</div>${table(['รหัส','ชื่อ–นามสกุล','ห้อง','เลขที่',''],state.students.map(s=>[esc(s.studentId),esc(s.name),esc(s.classroom),esc(s.number),`<div class="actions">${btn('','edit-student','pencil',`data-id="${esc(s.id)}" title="แก้ไขนักเรียน"`)}${btn('','delete-student','trash-2',`data-id="${esc(s.id)}" title="ลบนักเรียน"`)}</div>`]))}`;
  if(view==='results')return reportsPage();
  return `<div class="settings-section"><h2>สำรองข้อมูล</h2><div class="actions">${btn('สำรอง JSON พร้อมภาพ','backup','download')}${btn('กู้คืน JSON','restore','upload')}</div></div><form id="settings-form" class="settings-section"><h2>เกณฑ์อ่านรอยฝน</h2><div class="form-grid">${field('เกณฑ์ถือว่าฝนเต็ม (0.35–0.90)','fillThreshold',state.settings.fillThreshold,'number','min="0.35" max="0.9" step="0.01"')}${field('เกณฑ์เริ่มไม่แน่ใจ (0.05 ขึ้นไป)','uncertainThreshold',state.settings.uncertainThreshold,'number','min="0.05" max="0.89" step="0.01"')}</div><div class="actions"><button type="submit" class="primary">${icon('save')}บันทึกเกณฑ์</button>${btn('คืนค่าเริ่มต้น','reset-settings','rotate-ccw')}</div></form>`;
}
function examsTable(){return table(['ชื่อชุดข้อสอบ','วิชา / รหัส','จำนวนข้อ','คะแนนเต็ม','เฉลย',''],state.exams.map(e=>[esc(e.name),`${esc(e.subject)} / ${esc(e.code)}`,`${e.count} · ${e.choices} ตัวเลือก`,format(e.count*e.points),`<span class="badge ${e.key.every(Boolean)?'success':''}">${e.key.filter(Boolean).length}/${e.count} · v${e.keyVersion}</span>`,`<div class="actions">${btn('เปิด','open-exam','arrow-right',`data-id="${esc(e.id)}"`)}${btn('','edit-exam','pencil',`data-id="${esc(e.id)}" title="แก้ไขชุดข้อสอบ"`)}${btn('','delete-exam','trash-2',`data-id="${esc(e.id)}" title="ลบชุดข้อสอบ"`)}</div>`]));}
function resultsTable(results){return table(['นักเรียน','ห้อง','ชุดข้อสอบ','คะแนน','ร้อยละ','เวลา',''],results.map(r=>{const s=byStudent(r.studentId)??r.studentSnapshot,e=byExam(r.examId);return [`${esc(s?.studentId)} · ${esc(s?.name)}`,esc(s?.classroom),`${esc(e?.code)} · v${r.keyVersion}`,`${format(r.totals.score)} / ${format(r.totals.max)}`,`${format(r.totals.percent)}%`,esc(new Date(r.updatedAt).toLocaleString('th-TH')),`<div class="actions">${btn('ตรวจทาน','edit-result','pencil',`data-id="${esc(r.id)}"`)}${btn('','history-result','history',`data-id="${esc(r.id)}" title="ประวัติการแก้ไข"`)}${btn('','delete-result','trash-2',`data-id="${esc(r.id)}" title="ลบผลตรวจ"`)}</div>`];}));}
function keyPage(){
  const e=byExam(selected);if(!e){view='exams';return content();}
  return `<div class="section-head"><div><h2>${esc(e.name)}</h2><p class="muted">${esc(e.subject)} · รหัส ${esc(e.code)} · เฉลย v${e.keyVersion} · คะแนนเต็ม ${format(e.count*e.points)}</p></div>${btn('กลับ','go-exams','arrow-left')}</div><div class="section-head"><h3>เฉลย ${e.count} ข้อ</h3><div class="actions">${btn('นำเข้า JSON','import-key','upload')}${btn('ส่งออก JSON','export-key','download')}</div></div><form id="key-form"><div class="answer-grid">${e.key.map((a,i)=>`<label class="answer-cell"><span>${i+1}</span><select name="q${i}" aria-label="เฉลยข้อ ${i+1}"><option value="">–</option>${'ABCDE'.slice(0,e.choices).split('').map(c=>`<option value="${c}" ${a===c?'selected':''}>${c}</option>`).join('')}</select></label>`).join('')}</div><div class="actions"><button type="submit" class="primary">${icon('save')}บันทึกเฉลย</button>${btn('ดาวน์โหลดกระดาษคำตอบ PDF','pdf','file-down')}</div></form>`;
}
function filteredReport(){return report(state.results.filter(r=>(!reportExam||r.examId===reportExam)&&(!reportVersion||String(r.keyVersion)===reportVersion)),reportExam);}
function reportsPage(){
  const r=filteredReport(),versions=[...new Set(state.results.filter(x=>x.examId===reportExam).map(x=>x.keyVersion))].sort((a,b)=>a-b);
  return `<div class="section-head"><div class="report-filters"><label>ชุดข้อสอบ<select id="report-exam"><option value="">ทั้งหมด</option>${state.exams.map(e=>`<option value="${esc(e.id)}" ${reportExam===e.id?'selected':''}>${esc(e.name)} (${esc(e.code)})</option>`).join('')}</select></label><label>เฉลย<select id="report-version"><option value="">ทุกเวอร์ชัน</option>${versions.map(v=>`<option value="${v}" ${reportVersion===String(v)?'selected':''}>v${v}</option>`).join('')}</select></label></div><div class="actions">${btn('Excel','export-xlsx','file-spreadsheet',r.n?'':'disabled')}${btn('CSV','export-csv','download',r.n?'':'disabled')}${btn('JSON','export-json','braces',r.n?'':'disabled')}</div></div>${stats([['ผลตรวจ',r.n,'file-check'],['เฉลี่ย',r.n?format(r.mean):'–','chart-no-axes-combined'],['สูงสุด / ต่ำสุด',r.n?`${format(r.max)} / ${format(r.min)}`:'–','arrow-up-down'],['ส่วนเบี่ยงเบนมาตรฐาน',r.n?format(r.sd):'–','chart-no-axes-combined']])}${resultsTable(r.rows.slice().reverse())}<div class="report-analysis"><div><h2>การกระจายคะแนน</h2><div class="distribution">${r.distribution.map(d=>`<div><span>${d.label}</span><div class="bar-track"><div class="bar" style="width:${r.n?d.count/r.n*100:0}%"></div></div><b>${d.count}</b></div>`).join('')}</div></div><div><h2>ผลรายข้อ</h2>${r.mixedVersions?'<p class="muted">เลือกเฉลยเวอร์ชันเดียวเพื่อดูผลรายข้อ</p>':!reportExam?'<p class="muted">เลือกชุดข้อสอบเพื่อดูผลรายข้อ</p>':table(['ข้อ','ถูก','ผิด','ไม่ตอบ','ฝนซ้ำ','ตอบถูก %'],r.perQuestion.map(q=>[q.question,q.correct,q.wrong,q.blank,q.multiple,format(q.percent)]))}</div></div>`;
}
function editExam(id){
  const e=byExam(id)??{};
  modal(`<form id="exam-form" data-id="${esc(id??'')}"><div class="section-head"><h2>${id?'แก้ไข':'สร้าง'}ชุดข้อสอบ</h2>${btn('','close-modal','x','title="ปิด"')}</div><div class="form-grid">${field('ชื่อวิชา','subject',e.subject,'text','maxlength="120"')}${field('ชื่อชุดข้อสอบ','name',e.name,'text','maxlength="120"')}${field('รหัสชุดข้อสอบ','code',e.code,'text','maxlength="120"')}${select('จำนวนข้อ','count',COUNTS.map(n=>[n,`${n} ข้อ`]),e.count??20)}${select('จำนวนตัวเลือก','choices',[[4,'4 ตัวเลือก A–D'],[5,'5 ตัวเลือก A–E']],e.choices??5)}${field('คะแนนต่อข้อ','points',e.points??1,'number','min="0.01" max="1000" step="0.01"')}</div><p class="form-error" role="alert"></p><div class="actions"><button type="submit" class="primary">${icon('save')}บันทึก</button>${btn('ยกเลิก','close-modal','x')}</div></form>`);
}
function editStudent(id){const s=byStudent(id)??{};modal(`<form id="student-form" data-id="${esc(id??'')}"><div class="section-head"><h2>ข้อมูลนักเรียน</h2>${btn('','close-modal','x','title="ปิด"')}</div><div class="form-grid">${field('รหัสนักเรียน','studentId',s.studentId,'text','maxlength="30" autocomplete="off"')}${field('ชื่อ–นามสกุล','name',s.name,'text','maxlength="120"')}${field('ห้องเรียน','classroom',s.classroom,'text','maxlength="60"')}${field('เลขที่','number',s.number,'text','inputmode="numeric" pattern="[0-9]{1,3}"')}</div><p class="form-error" role="alert"></p><div class="actions"><button type="submit" class="primary">${icon('save')}บันทึก</button>${btn('ยกเลิก','close-modal','x')}</div></form>`);}
async function saveKey(exam,key){
  if(key.every((v,i)=>v===exam.key[i]))return;
  const history=[...(exam.history??[]),{version:exam.keyVersion,key:exam.key,points:exam.points,count:exam.count,choices:exam.choices,updatedAt:exam.updatedAt}];
  const updated={...exam,key,keyVersion:exam.keyVersion+1,history,updatedAt:now()};validateExam(updated);await commit({...state,exams:state.exams.map(e=>e.id===exam.id?updated:e)});
}
async function action(action,id){
  if(action==='confirm-yes'){const resolve=confirmResolve;confirmResolve=null;document.querySelector('#modal').close();resolve?.(true);return;}
  if(action==='close-modal'){closeModal();return;}
  if(action.startsWith('go-')){view=action.slice(3);render();return;}
  if(action==='new-exam'||action==='edit-exam')return editExam(id);
  if(action==='new-student'||action==='edit-student')return editStudent(id);
  if(action==='open-exam'){selected=id;view='key';render();return;}
  if(action==='delete-exam'){
    if(state.results.some(r=>r.examId===id))throw new Error('ลบผลตรวจของชุดนี้ก่อนลบข้อสอบ');
    if(await confirm('ลบชุดข้อสอบ?','ข้อสอบและเฉลยจะถูกลบจากอุปกรณ์นี้')){await commit({...state,exams:state.exams.filter(e=>e.id!==id)});render();}return;
  }
  if(action==='delete-student'){
    if(state.results.some(r=>r.studentId===id))throw new Error('นักเรียนมีผลตรวจ กรุณาลบผลตรวจก่อน');
    if(await confirm('ลบนักเรียน?','ข้อมูลนักเรียนนี้จะถูกลบ')){await commit({...state,students:state.students.filter(s=>s.id!==id)});render();}return;
  }
  if(action==='pdf'){
    const exam=byExam(selected),draft=[...document.querySelectorAll('#key-form select')].map(s=>s.value);
    if(draft.some((a,i)=>a!==exam.key[i]))throw new Error('บันทึกเฉลยที่แก้ไขก่อนสร้าง PDF');
    readyExam(exam);toast('กำลังสร้างกระดาษคำตอบ…');await answerSheetPDF(exam);toast('ดาวน์โหลด PDF แล้ว พิมพ์ A4 ขนาดจริง 100%');return;
  }
  if(action==='export-key'){const e=byExam(selected);download(JSON.stringify({schemaVersion:1,examId:e.id,code:e.code,count:e.count,choices:e.choices,keyVersion:e.keyVersion,key:e.key},null,2),`answer-key-${e.code.replace(/[^\w-]/g,'_')}.json`);return;}
  if(action==='import-key')return pickFile('.json',async file=>{
    if(file.size>1024*1024)throw new Error('ไฟล์เฉลยใหญ่เกินไป');const value=JSON.parse(await file.text()),e=byExam(selected);
    if(value.schemaVersion!==1||value.count!==e.count||value.choices!==e.choices||!Array.isArray(value.key)||value.key.length!==e.count||value.key.some(a=>typeof a!=='string'||a.length!==1||!'ABCDE'.slice(0,e.choices).includes(a)))throw new Error('รูปแบบเฉลย จำนวนข้อ หรือตัวเลือกไม่ตรง');
    if(await confirm('นำเข้าเฉลย?','แทนที่เฉลยปัจจุบันและเพิ่มเวอร์ชันใหม่')){await saveKey(e,value.key);render();toast('นำเข้าเฉลยแล้ว');}
  });
  if(action==='edit-result'){
    const result=state.results.find(r=>r.id===id),image=await getImage(id);if(!image)throw new Error('ไม่พบภาพต้นฉบับของผลตรวจนี้');view='scan';render();await scanner.editResult(result,image);return;
  }
  if(action==='delete-result'){
    if(await confirm('ลบผลตรวจ?','คะแนน ภาพ และประวัติของผลตรวจนี้จะถูกลบ')){const next={...state,results:state.results.filter(r=>r.id!==id)};await removeResultState(next,id);state=next;render();}return;
  }
  if(action==='history-result'){
    const r=state.results.find(r=>r.id===id);modal(`<div class="section-head"><h2>ประวัติผลตรวจ</h2>${btn('','close-modal','x','title="ปิด"')}</div>${table(['เวลา','เฉลย','คะแนน'],[...(r.history??[]),r].map(h=>[esc(new Date(h.updatedAt).toLocaleString('th-TH')),`v${h.keyVersion}`,`${format(h.totals.score)} / ${format(h.totals.max)}`]))}`);return;
  }
  if(action.startsWith('export-')){const r=filteredReport();await exportReport(action.slice(7),reportRows(r.rows,state.exams,state.students),r.rows);return;}
  if(action==='backup'){
    toast('กำลังเตรียมข้อมูลสำรองพร้อมภาพ…');const images=[];for(const r of state.results){const image=await getImage(r.id);if(image)images.push([r.id,image]);}
    download(JSON.stringify({schemaVersion:1,exportedAt:now(),state,images}),'smart-exam-backup.json');toast('ดาวน์โหลดสำรองแล้ว');return;
  }
  if(action==='restore')return pickFile('.json',async file=>{
    if(file.size>100*1024*1024)throw new Error('ไฟล์สำรองต้องไม่เกิน 100 MB');
    const backup=JSON.parse(await file.text());if(backup.schemaVersion!==1||!Array.isArray(backup.images))throw new Error('รูปแบบสำรองไม่ถูกต้อง');
    const restored=validateState(backup.state),ids=new Set();
    for(const pair of backup.images){if(!Array.isArray(pair)||pair.length!==2||!restored.results.some(r=>r.id===pair[0])||ids.has(pair[0])||typeof pair[1]!=='string'||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(pair[1])||pair[1].length>8*1024*1024)throw new Error('ภาพในข้อมูลสำรองไม่ถูกต้อง');ids.add(pair[0]);}
    if(await confirm('กู้คืนข้อมูลสำรอง?',`แทนที่ข้อมูลทั้งหมดด้วย ${restored.exams.length} ชุดข้อสอบ และ ${restored.results.length} ผลตรวจ`)){await replaceDatabase(restored,backup.images);state=restored;reportExam='';reportVersion='';view='home';render();toast('กู้คืนข้อมูลแล้ว');}
  });
  if(action==='reset-settings'){await commit({...state,settings:{...DEFAULT_OMR}});render();toast('คืนค่าเริ่มต้นแล้ว');}
}
app.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.view){if(busy)return;view=target.dataset.view;render();return;}
  const name=target.dataset.action;if(!name)return;
  if(name==='confirm-yes'||name==='close-modal'){action(name,target.dataset.id);return;}
  const handled=['camera-start','camera-stop','capture','upload-image','rotate-image','reset-scan','process-image','save-scan','show-overlay'];if(handled.includes(name))return;
  if(busy)return;busy=true;target.disabled=true;
  Promise.resolve(action(name,target.dataset.id)).catch(e=>toast(e.message,true)).finally(()=>{busy=false;if(target.isConnected)target.disabled=false;});
});
app.addEventListener('change',event=>{if(event.target.id==='report-exam'){reportExam=event.target.value;reportVersion='';render();}if(event.target.id==='report-version'){reportVersion=event.target.value;render();}});
app.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target;if(busy)return;busy=true;
  const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  (async()=>{
    const values=Object.fromEntries(new FormData(form));Object.keys(values).forEach(k=>values[k]=values[k].trim());
    if(form.id==='exam-form'){
      const old=byExam(form.dataset.id),count=Number(values.count),choices=Number(values.choices),points=Number(values.points);
      if(state.exams.some(e=>e.id!==old?.id&&e.code.toLowerCase()===values.code.toLowerCase()))throw new Error('รหัสชุดข้อสอบซ้ำ');
      const changed=old&&(old.count!==count||old.choices!==choices||old.points!==points);
      const key=Array.from({length:count},(_,i)=>old?.key[i]&&'ABCDE'.slice(0,choices).includes(old.key[i])?old.key[i]:'');
      const exam={...values,id:old?.id??uid(),count,choices,points,key,keyVersion:old?old.keyVersion+(changed?1:0):1,history:changed?[...(old.history??[]),{version:old.keyVersion,key:old.key,count:old.count,choices:old.choices,points:old.points,updatedAt:old.updatedAt}]:old?.history??[],createdAt:old?.createdAt??now(),updatedAt:now()};
      validateExam(exam);await commit({...state,exams:old?state.exams.map(e=>e.id===old.id?exam:e):[...state.exams,exam]});selected=exam.id;view='key';render();toast('บันทึกชุดข้อสอบแล้ว');
    }else if(form.id==='student-form'){
      const old=byStudent(form.dataset.id),student={...values,id:old?.id??uid(),createdAt:old?.createdAt??now(),updatedAt:now()};validateStudent(student,state.students,old?.id);await commit({...state,students:old?state.students.map(s=>s.id===old.id?student:s):[...state.students,student]});render();toast('บันทึกนักเรียนแล้ว');
    }else if(form.id==='key-form'){
      const exam=byExam(selected);await saveKey(exam,Array.from({length:exam.count},(_,i)=>values[`q${i}`]));render();toast('บันทึกเฉลยแล้ว');
    }else if(form.id==='settings-form'){
      const settings=validateOMR({fillThreshold:Number(values.fillThreshold),uncertainThreshold:Number(values.uncertainThreshold)});await commit({...state,settings});render();toast('บันทึกเกณฑ์แล้ว');
    }
  })().catch(e=>{const error=form.querySelector('.form-error');if(error)error.textContent=e.message;else toast(e.message,true);}).finally(()=>{busy=false;if(submit?.isConnected)submit.disabled=false;});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scanner?.camera){scanner.camera.stop();const button=document.querySelector('[data-action="capture"]');if(button)button.disabled=true;const placeholder=document.querySelector('#camera-empty');if(placeholder)placeholder.hidden=false;}});
window.addEventListener('pagehide',()=>scanner?.destroy());
try{state=await readState();render();}catch(error){app.innerHTML=`<main><h1>เปิดข้อมูลไม่ได้</h1><p>${esc(error.message)}</p><p>กรุณาตรวจการอนุญาตพื้นที่จัดเก็บเว็บไซต์ แล้วรีเฟรชหน้า</p></main>`;}
