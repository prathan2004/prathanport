import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTemplate,PAGE} from '../src/pdf/template.js';
import {validateStudents} from '../src/services/data.js';
for(const count of [1,20,30,50,60,80,100,101,200])for(const digits of [6,8,10,13])for(const no of [2,3])test(`A4 ${count} questions, ${digits}/${no} digits`,()=>{
  const t=createTemplate(count,digits,no);assert.equal(t.pages.length,Math.ceil(count/100));
  assert.deepEqual(t.pages.flatMap(p=>p.questions.map(q=>q.number)),Array.from({length:count},(_,i)=>i+1));
  for(const p of t.pages){assert.equal(p.marks.length,4);assert.equal(p.studentId.length,digits);assert.equal(p.studentNo.length,no);
    const seen=new Set();for(const q of p.questions){assert.equal(q.bubbles.length,5);for(const b of q.bubbles){assert.ok(b.x-b.radius>30&&b.x+b.radius<PAGE.width-30);assert.ok(b.y-b.radius>80&&b.y+b.radius<410);const key=`${b.x}:${b.y}`;assert.ok(!seen.has(key));seen.add(key);}}
    for(const column of [...p.studentId,...p.studentNo]){assert.deepEqual(column.bubbles.map(b=>b.digit),[0,1,2,3,4,5,6,7,8,9]);assert.ok(column.bubbles.every(b=>b.y>510&&b.y<660));}
  }
});
test('invalid templates rejected',()=>{for(const n of [0,201,1.5])assert.throws(()=>createTemplate(n));assert.throws(()=>createTemplate(20,7));});
test('student leading zeros and duplicates',()=>{const row={student_id:'001234',student_no:'01',full_name:'นักเรียน',class_id:'ม.1/1',academic_year:'2569'};assert.equal(validateStudents([row]).students[0].student_id,'001234');assert.equal(validateStudents([row]).errors.length,0);assert.ok(validateStudents([row,row]).errors.length);assert.ok(validateStudents([{...row,student_id:'bad'}]).errors.length);});
