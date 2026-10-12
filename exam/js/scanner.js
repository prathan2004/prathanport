import {Camera} from './camera.js';
import {scanOMR} from './omr.js';
import {imageCanvas,rotateCanvas} from './image-processing.js';
import {grade} from './grading.js';
import {readyExam} from './exam.js';
import {validateStudent} from './database.js';
import {esc,btn,icons,toast,uid,now,format} from './utils.js';
export class Scanner {
  constructor(root,getState,saveResult,confirm){this.root=root;this.getState=getState;this.saveResult=saveResult;this.confirm=confirm;this.raw=null;this.review=null;this.camera=null;this.closed=false;this.busy=false;this.count=0;this.abort=new AbortController();}
  mount(){
    const state=this.getState();
    const available=state.exams.filter(e=>e.key.every(Boolean));
    this.root.innerHTML=`<div class="section-head"><h2>ตรวจกระดาษคำตอบ</h2><span class="badge" id="scan-count">บันทึกแล้ว ${this.count} แผ่น</span></div><label class="exam-select">ชุดข้อสอบ<select id="scan-exam"><option value="">เลือกชุดข้อสอบ</option>${available.map(e=>`<option value="${esc(e.id)}">${esc(e.subject)} · ${esc(e.name)} (${esc(e.code)})</option>`).join('')}</select></label><div class="scan-grid"><div><div class="camera-stage" id="camera-stage"><video id="camera-video" playsinline muted autoplay></video><div class="camera-guide" aria-hidden="true"></div><div class="camera-empty" id="camera-empty">${btn('เปิดกล้องหลัง','camera-start','camera')}</div></div><div class="actions scan-actions">${btn('ถ่ายภาพ','capture','camera','disabled')}${btn('เลือกรูปภาพ','upload-image','image-plus')}${btn('หยุดกล้อง','camera-stop','video-off')}</div><input id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden><div id="image-preview" hidden><div class="section-head"><h3>ภาพก่อนตรวจ</h3>${btn('','rotate-image','rotate-cw','title="หมุนภาพ 90 องศา"')}</div><div id="raw-image"></div><div class="actions">${btn('ตรวจภาพนี้','process-image','scan-line')}${btn('ถ่ายใหม่','reset-scan','refresh-cw')}</div></div></div><div id="scan-progress" role="status" hidden></div></div><div id="review-root"></div>`;
    this.camera=new Camera(this.root.querySelector('video'));
    this.root.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action)this.run(()=>this.action(action));},{signal:this.abort.signal});
    this.root.querySelector('#image-input').addEventListener('change',event=>{const file=event.target.files[0];if(file)this.run(async()=>this.preview(await imageCanvas(file)));},{signal:this.abort.signal});
    this.root.addEventListener('change',event=>{if(event.target.dataset.question!==undefined)this.correct(Number(event.target.dataset.question),event.target.value);},{signal:this.abort.signal});
    icons();
  }
  async run(fn){if(this.busy)return;try{await fn();}catch(e){toast(e.message,true);const p=this.root.querySelector('#scan-progress');if(p){p.hidden=false;p.textContent=e.message;p.classList.add('error');}}}
  preview(canvas){if(this.closed)return;this.camera.stop();this.root.querySelector('#camera-stage').hidden=true;this.root.querySelector('#image-preview').hidden=false;this.raw=canvas;this.review=null;this.root.querySelector('#review-root').innerHTML='';this.root.querySelector('#raw-image').replaceChildren(canvas);canvas.setAttribute('aria-label','ภาพกระดาษก่อนตรวจ');}
  async action(action){
    if(action==='camera-start'){this.root.querySelector('#camera-stage').hidden=false;await this.camera.start();if(!this.closed){this.root.querySelector('#camera-empty').hidden=true;this.root.querySelector('[data-action="capture"]').disabled=false;}return;}
    if(action==='camera-stop'){this.camera.stop();this.root.querySelector('#camera-empty').hidden=false;this.root.querySelector('[data-action="capture"]').disabled=true;return;}
    if(action==='capture'){this.preview(this.camera.capture());return;}
    if(action==='upload-image'){this.root.querySelector('#image-input').value='';this.root.querySelector('#image-input').click();return;}
    if(action==='rotate-image'){if(this.raw)this.preview(rotateCanvas(this.raw));return;}
    if(action==='reset-scan'){this.review=null;this.raw=null;this.root.querySelector('#review-root').innerHTML='';this.root.querySelector('#image-preview').hidden=true;this.root.querySelector('#camera-stage').hidden=false;this.root.querySelector('#camera-empty').hidden=false;this.root.querySelector('[data-action="capture"]').disabled=true;this.root.querySelector('#scan-progress').hidden=true;return;}
    if(action==='process-image'){
      const exam=this.getState().exams.find(e=>e.id===this.root.querySelector('#scan-exam').value);if(!exam)throw new Error('เลือกชุดข้อสอบก่อน');readyExam(exam);if(!this.raw)throw new Error('เลือกหรือถ่ายภาพก่อน');
      this.busy=true;this.root.querySelectorAll('button').forEach(b=>b.disabled=true);const progress=this.root.querySelector('#scan-progress');progress.hidden=false;progress.classList.remove('error');
      try{
        // Yield first so the loading state paints before CPU-heavy OpenCV work.
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const result=await scanOMR(this.raw,exam,this.getState().settings,message=>progress.textContent=message);
        if(this.closed)return;
        this.review={...result,examId:exam.id,key:result.version.key,points:result.version.points,keyVersion:result.version.version,originalAnswers:structuredClone(result.answers)};
        progress.textContent=result.warnings.join(' · ')||'อ่านภาพแล้ว กรุณาตรวจทานก่อนบันทึก';
        this.renderReview();
      }finally{this.busy=false;if(!this.closed)this.root.querySelectorAll('button').forEach(b=>b.disabled=false);}
      return;
    }
    if(action==='save-scan')return this.save();
    if(action==='show-overlay'){this.review.overlay=!this.review.overlay;this.drawOverlay();return;}
  }
  async editResult(result,image){
    this.root.querySelector('#scan-exam').value=result.examId;
    if(!image)throw new Error('ไม่พบภาพผลตรวจในอุปกรณ์นี้');
    const canvas=await imageCanvas(await(await fetch(image)).blob());
    const {template}=await import('./template.js');
    this.review={canvas,layout:template(result.answers.length,result.choiceCount),answers:structuredClone(result.answers),originalAnswers:result.originalAnswers??structuredClone(result.answers),examId:result.examId,key:result.key,points:result.points,keyVersion:result.keyVersion,quality:result.quality??{},warnings:[],editing:result};
    this.root.querySelector('#camera-stage').hidden=true;this.renderReview();
  }
  renderReview(){
    const r=this.review,state=this.getState(),totals=grade(r.answers,r.key,r.points);
    this.root.querySelector('#review-root').innerHTML=`<div class="section-head review-heading"><h2>ตรวจทานผล</h2>${btn('ตำแหน่งคำตอบ','show-overlay','layers')}</div><div class="score-strip" id="score-strip"></div><div class="review-layout"><div class="aligned-wrap" id="aligned-wrap"></div><div><div class="section-head"><h3>คำตอบรายข้อ</h3><span class="badge warning" id="uncertain-count">ต้องตรวจ ${totals.uncertain} ข้อ</span></div><div class="review-table"><table><thead><tr><th>ข้อ</th><th>เฉลย</th><th>อ่านได้ / แก้ไข</th><th>ผล</th></tr></thead><tbody>${r.answers.map((a,i)=>`<tr data-row="${i}"><td>${i+1}</td><td>${esc(r.key[i])}</td><td><select data-question="${i}" aria-label="คำตอบข้อ ${i+1}"><option value="?" ${a.status==='uncertain'?'selected':''}>ไม่แน่ใจ</option><option value="blank" ${a.status==='blank'?'selected':''}>ไม่ตอบ</option><option value="multiple" ${a.status==='multiple'?'selected':''}>ฝนซ้ำ</option>${r.layout.choices.map(c=>`<option value="${c}" ${a.status==='single'&&a.answer===c?'selected':''}>${c}</option>`).join('')}</select></td><td data-outcome="${i}"></td></tr>`).join('')}</tbody></table></div></div></div><form id="scan-student-form"><h3>ผู้เข้าสอบ</h3><label>นักเรียน<select name="student"><option value="">เพิ่มนักเรียนใหม่</option>${state.students.map(s=>`<option value="${esc(s.id)}" ${r.editing?.studentId===s.id?'selected':''}>${esc(s.studentId)} · ${esc(s.name)} · ${esc(s.classroom)}</option>`).join('')}</select></label><details ${!state.students.length?'open':''}><summary>ข้อมูลนักเรียนใหม่</summary><div class="form-grid"><label>รหัสนักเรียน<input name="studentId" autocomplete="off" maxlength="30"></label><label>ชื่อ–นามสกุล<input name="name" maxlength="120"></label><label>ห้องเรียน<input name="classroom" maxlength="60"></label><label>เลขที่<input name="number" inputmode="numeric" pattern="[0-9]{1,3}"></label></div></details><label class="check-label"><input type="checkbox" id="review-confirm">ตรวจทานภาพและคำตอบครบแล้ว</label>${btn(r.editing?'บันทึกการแก้ไข':'ยืนยันและบันทึกคะแนน','save-scan','save','class="primary"')}</form>`;
    this.updateTotals();this.drawOverlay();icons();
  }
  correct(index,value){
    const a=this.review.answers[index];a.status=['blank','multiple'].includes(value)?value:value==='?'?'uncertain':'single';a.answer=a.status==='single'?value:null;a.selected=a.status==='single'?[value]:[];a.corrected=true;
    this.root.querySelector('#review-confirm').checked=false;this.updateTotals();this.drawOverlay();
  }
  updateTotals(){const totals=grade(this.review.answers,this.review.key,this.review.points);
    this.root.querySelector('#score-strip').innerHTML=`<strong>${format(totals.score)} <small>/ ${format(totals.max)}</small></strong><span>${format(totals.percent)}%</span><span>ถูก ${totals.correct}</span><span>ผิด ${totals.wrong}</span><span>ไม่ตอบ ${totals.blank}</span><span>ฝนซ้ำ ${totals.multiple}</span>`;
    this.root.querySelector('#uncertain-count').textContent=`ต้องตรวจ ${totals.uncertain} ข้อ`;
    const names={correct:'ถูก',wrong:'ผิด',blank:'ไม่ตอบ',multiple:'ฝนซ้ำ',uncertain:'ไม่แน่ใจ'};
    totals.details.forEach((a,i)=>{const el=this.root.querySelector(`[data-outcome="${i}"]`);el.textContent=names[a.outcome];el.className=`outcome ${a.outcome}`;});
  }
  drawOverlay(){
    const r=this.review,canvas=document.createElement('canvas');canvas.width=r.canvas.width;canvas.height=r.canvas.height;const ctx=canvas.getContext('2d');ctx.drawImage(r.canvas,0,0);
    if(r.overlay!==false){const totals=grade(r.answers,r.key,r.points),scale=canvas.width/210;
      r.layout.questions.forEach((q,i)=>{const a=totals.details[i],color=a.outcome==='correct'?'#198754':a.outcome==='wrong'?'#dc3545':'#e5a024';ctx.strokeStyle=color;ctx.lineWidth=2.5;
        q.bubbles.forEach(b=>{if(a.answer===b.answer||a.selected?.includes(b.answer)||a.status==='uncertain'){ctx.beginPath();ctx.arc(b.x*scale,b.y*scale,b.r*scale*1.2,0,Math.PI*2);ctx.stroke();}});
        if(['blank','multiple','uncertain'].includes(a.status)){ctx.strokeRect((q.x-1)*scale,(q.y-3)*scale,42*scale,6*scale);}
      });
    }
    canvas.setAttribute('aria-label','กระดาษที่ปรับมุมแล้วพร้อมตำแหน่งคำตอบ');this.root.querySelector('#aligned-wrap').replaceChildren(canvas);
  }
  async save(){
    const r=this.review;if(!r)throw new Error('ยังไม่มีภาพที่ตรวจแล้ว');
    const totals=grade(r.answers,r.key,r.points);if(totals.uncertain)throw new Error(`ยังมี ${totals.uncertain} ข้อที่ไม่แน่ใจ กรุณาแก้ไขก่อนบันทึก`);
    if(!this.root.querySelector('#review-confirm').checked)throw new Error('ยืนยันว่าตรวจทานครบก่อนบันทึก');
    const values=Object.fromEntries(new FormData(this.root.querySelector('#scan-student-form'))),state=this.getState();
    let student=state.students.find(s=>s.id===values.student),newStudent=null;
    if(!student){student={id:uid(),studentId:values.studentId.trim(),name:values.name.trim(),classroom:values.classroom.trim(),number:values.number.trim(),createdAt:now(),updatedAt:now()};validateStudent(student,state.students);newStudent=student;}
    const duplicate=state.results.find(x=>x.examId===r.examId&&x.studentId===student.id&&x.id!==r.editing?.id);
    if(duplicate&&r.editing)throw new Error('ไม่สามารถเปลี่ยนผลตรวจไปเป็นนักเรียนที่มีผลในชุดนี้อยู่แล้ว');
    if(duplicate&&!(await this.confirm('นักเรียนคนนี้มีผลตรวจแล้ว','แทนที่ผลเดิมและเก็บประวัติการแก้ไขหรือไม่?')))return;
    const previous=r.editing??duplicate;
    const result={id:previous?.id??uid(),examId:r.examId,studentId:student.id,studentSnapshot:structuredClone(student),choiceCount:r.layout.choices.length,keyVersion:r.keyVersion,key:structuredClone(r.key),points:r.points,answers:structuredClone(r.answers),originalAnswers:r.originalAnswers,totals,quality:r.quality,createdAt:previous?.createdAt??now(),updatedAt:now(),history:previous?[...(previous.history??[]),{answers:previous.answers,key:previous.key,points:previous.points,keyVersion:previous.keyVersion,totals:previous.totals,updatedAt:previous.updatedAt}]:[]};
    this.busy=true;const save=this.root.querySelector('[data-action="save-scan"]');save.disabled=true;
    try{await this.saveResult(result,r.canvas.toDataURL('image/jpeg',.86),newStudent);if(this.closed)return;this.count++;await this.action('reset-scan');this.root.querySelector('#scan-count').textContent=`บันทึกแล้ว ${this.count} แผ่น`;toast('บันทึกคะแนนแล้ว พร้อมตรวจแผ่นต่อไป');}finally{this.busy=false;if(save.isConnected)save.disabled=false;}
  }
  destroy(){this.closed=true;this.camera?.stop();this.abort.abort();}
}
