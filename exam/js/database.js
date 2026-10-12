import {validateExam} from './exam.js';
import {grade} from './grading.js';
import {DEFAULT_OMR,validateOMR} from './config.js';
export const emptyState=()=>({exams:[],students:[],results:[],settings:{...DEFAULT_OMR}});
let db;
export function openDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('smart-exam-checker-static',1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('state');request.result.createObjectStore('images');};
    request.onsuccess=()=>{db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>reject(new Error('เปิด IndexedDB ไม่สำเร็จ กรุณาอนุญาตพื้นที่จัดเก็บเว็บไซต์'));
    request.onblocked=()=>reject(new Error('ปิดแท็บอื่นของเว็บก่อนเปิดข้อมูลใหม่'));
  });
}
export async function readState() {
  if(!db)await openDatabase();
  const state=await request('state','readonly',store=>store.get('main'));
  return state?validateState(state):emptyState();
}
function request(storeName,mode,operation) {
  return new Promise((resolve,reject)=>{const transaction=db.transaction(storeName,mode);let result;const r=operation(transaction.objectStore(storeName));r.onsuccess=()=>result=r.result;transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(new Error('บันทึกข้อมูลไม่สำเร็จ พื้นที่อาจเต็ม'));transaction.onabort=()=>reject(new Error('การบันทึกถูกยกเลิก'));});
}
export const writeState=state=>request('state','readwrite',s=>s.put(state,'main'));
export const getImage=id=>request('images','readonly',s=>s.get(id));
export function saveResultState(state,resultId,image) {
  return new Promise((resolve,reject)=>{const tx=db.transaction(['state','images'],'readwrite');tx.objectStore('state').put(state,'main');if(image)tx.objectStore('images').put(image,resultId);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('บันทึกภาพและคะแนนไม่สำเร็จ'));tx.onabort=()=>reject(new Error('บันทึกไม่สำเร็จ พื้นที่อาจเต็ม'));});
}
export function replaceDatabase(state,images=[]) {
  return new Promise((resolve,reject)=>{const tx=db.transaction(['state','images'],'readwrite');tx.objectStore('state').put(state,'main');const store=tx.objectStore('images');store.clear();for(const [id,image] of images)store.put(image,id);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('กู้คืนข้อมูลไม่สำเร็จ'));});
}
export function removeResultState(state,resultId) {
  return new Promise((resolve,reject)=>{const tx=db.transaction(['state','images'],'readwrite');tx.objectStore('state').put(state,'main');tx.objectStore('images').delete(resultId);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('ลบผลตรวจไม่สำเร็จ'));});
}
export function validateStudent(student,students=[],except='') {
  if(!student||typeof student.id!=='string'||typeof student.studentId!=='string'||!student.studentId.trim()||student.studentId.length>30||!student.name?.trim()||student.name.length>120||!student.classroom?.trim()||student.classroom.length>60||!/^\d{1,3}$/.test(String(student.number)))throw new Error('ข้อมูลนักเรียนไม่ครบหรือไม่ถูกต้อง');
  if(students.some(s=>s.id!==except&&s.studentId===student.studentId))throw new Error('รหัสนักเรียนนี้มีอยู่แล้ว');
  return student;
}
export function validateState(state) {
  if(!state||!['exams','students','results'].every(k=>Array.isArray(state[k])))throw new Error('รูปแบบข้อมูลสำรองไม่ถูกต้อง');
  for(const key of ['exams','students','results']){const ids=new Set();for(const row of state[key]){if(!row||typeof row.id!=='string'||ids.has(row.id))throw new Error('พบ ID ซ้ำหรือไม่ถูกต้อง');ids.add(row.id);}}
  state.exams.forEach(validateExam);
  state.students.forEach(s=>validateStudent(s,state.students,s.id));
  const submissions=new Set();
  for(const result of state.results){
    if(!state.exams.some(e=>e.id===result.examId)||!state.students.some(s=>s.id===result.studentId)||!Array.isArray(result.key)||!Number.isInteger(result.keyVersion)||!Number.isFinite(result.points)||result.points<=0)throw new Error('ผลตรวจอ้างอิงข้อสอบหรือนักเรียนไม่ถูกต้อง');
    const identity=`${result.examId}:${result.studentId}`;
    if(submissions.has(identity))throw new Error('พบผลซ้ำของนักเรียนในชุดข้อสอบเดียวกัน');
    submissions.add(identity);
    if(![4,5].includes(result.choiceCount)||result.answers.some(a=>a.status==='single'&&!'ABCDE'.slice(0,result.choiceCount).includes(a.answer)))throw new Error('ตัวเลือกในผลตรวจไม่ถูกต้อง');
    const totals=grade(result.answers,result.key,result.points);
    if(totals.uncertain)throw new Error('ผลที่ยืนยันแล้วยังมีคำตอบไม่แน่ใจ');
    result.totals=totals;
  }
  state.settings=validateOMR(state.settings??DEFAULT_OMR);
  return state;
}
