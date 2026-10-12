import {COUNTS} from './template.js';
export function validateExam(exam) {
  if(!exam||typeof exam.id!=='string'||!exam.subject?.trim()||!exam.name?.trim()||!exam.code?.trim()||!COUNTS.includes(exam.count)||![4,5].includes(exam.choices)||!Number.isFinite(exam.points)||exam.points<=0||exam.points>1000||!Number.isInteger(exam.keyVersion)||exam.keyVersion<1)throw new Error('ข้อมูลข้อสอบไม่ถูกต้อง');
  if(!Array.isArray(exam.key)||exam.key.length!==exam.count||exam.key.some(a=>typeof a!=='string'||(a!==''&&(a.length!==1||!'ABCDE'.slice(0,exam.choices).includes(a)))))throw new Error('รูปแบบเฉลยไม่ถูกต้อง');
  if([exam.subject,exam.name,exam.code].some(s=>s.length>120))throw new Error('ข้อความยาวเกิน 120 ตัวอักษร');
  const versions=new Set([exam.keyVersion]);
  for(const h of exam.history??[]){
    if(!Number.isInteger(h.version)||h.version<1||versions.has(h.version)||!COUNTS.includes(h.count)||![4,5].includes(h.choices)||!Number.isFinite(h.points)||h.points<=0||!Array.isArray(h.key)||h.key.length!==h.count||h.key.some(a=>typeof a!=='string'||(a!==''&&(a.length!==1||!'ABCDE'.slice(0,h.choices).includes(a)))))throw new Error('ประวัติเฉลยไม่ถูกต้อง');
    versions.add(h.version);
  }
  return exam;
}
export function readyExam(exam) {validateExam(exam);if(exam.key.some(a=>!a))throw new Error('บันทึกเฉลยให้ครบก่อนเริ่มตรวจ');return exam;}
export function keyVersion(exam,version) {
  if(version===exam.keyVersion)return {key:exam.key,points:exam.points,count:exam.count,choices:exam.choices,version};
  const old=exam.history?.find(h=>h.version===version);
  if(!old)throw new Error('ไม่พบเฉลยเวอร์ชันของกระดาษนี้');
  return old;
}
