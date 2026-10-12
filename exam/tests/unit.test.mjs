import {test} from 'node:test';
import assert from 'node:assert/strict';
import {template,COUNTS,TEMPLATE_ID} from '../js/template.js';
import {classify,grade} from '../js/grading.js';
import {DEFAULT_OMR} from '../js/config.js';
import {validateExam,keyVersion} from '../js/exam.js';
import {validateStudent,validateState,emptyState} from '../js/database.js';
import {report} from '../js/reports.js';
for(const count of COUNTS)for(const choices of [4,5])test(`A4 grid ${count}/${choices}`,()=>{
  const t=template(count,choices),seen=new Set();assert.equal(t.id,TEMPLATE_ID);assert.equal(t.questions.length,count);assert.equal(t.marks.length,4);
  for(const [i,q]of t.questions.entries()){assert.equal(q.number,i+1);assert.equal(q.bubbles.length,choices);for(const b of q.bubbles){assert.ok(b.x-b.r>10&&b.x+b.r<200);assert.ok(b.y-b.r>85&&b.y+b.r<270);const p=`${b.x}/${b.y}`;assert.ok(!seen.has(p));seen.add(p);}}
});
test('classification never chooses strongest uncertain mark',()=>{
  assert.equal(classify([.1,.05,0,0],['A','B','C','D'],DEFAULT_OMR).status,'blank');
  assert.equal(classify([.9,.05,0,0],['A','B','C','D'],DEFAULT_OMR).answer,'A');
  assert.equal(classify([.9,.9,0,0],['A','B','C','D'],DEFAULT_OMR).status,'multiple');
  assert.equal(classify([.4,.1,0,0],['A','B','C','D'],DEFAULT_OMR).answer,null);
  assert.equal(classify([.9,.3,0,0],['A','B','C','D'],DEFAULT_OMR).status,'uncertain');
});
test('grading counts all states and fractional points',()=>{const r=grade([{status:'single',answer:'A'},{status:'single',answer:'B'},{status:'blank'},{status:'multiple'},{status:'uncertain'}],['A','A','A','A','A'],.5);assert.equal(r.score,.5);assert.equal(r.max,2.5);for(const k of ['correct','wrong','blank','multiple','uncertain'])assert.equal(r[k],1);});
test('student identity preserves leading zeros and duplicate guard',()=>{const s={id:'s1',studentId:'00123',name:'นักเรียน',classroom:'ม.1/1',number:'01'};assert.equal(validateStudent(s).studentId,'00123');assert.throws(()=>validateStudent({...s,id:'s2'},[s]));});
test('exam old key version snapshots',()=>{const e={id:'e',subject:'วิชา',name:'สอบ',code:'A',count:10,choices:4,points:1,key:Array(10).fill('A'),keyVersion:2,history:[{version:1,key:Array(10).fill('B'),count:10,choices:4,points:2}]};validateExam(e);assert.equal(keyVersion(e,1).points,2);assert.throws(()=>keyVersion(e,3));});
test('backup validates relations and recomputes scores',()=>{const s=emptyState();assert.deepEqual(validateState(s).results,[]);assert.throws(()=>validateState({...s,results:[{id:'r',examId:'unknown'}]}));});
test('report distribution boundary and population standard deviation',()=>{const results=[0,50,100].map((score,i)=>({examId:'e',keyVersion:1,answers:[],totals:{score,percent:score,details:[]},id:String(i)}));const r=report(results);assert.equal(r.mean,50);assert.equal(r.distribution[4].count,1);assert.ok(Math.abs(r.sd-40.824829)<.001);});
