import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from '../tools/serve.mjs';
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/exam/`;
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
await mkdir('qa',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('CASE:'))console.log(m.text());});await page.goto(base);await page.getByRole('button',{name:'สร้างชุดข้อสอบ',exact:true}).waitFor();
  const testResults=await page.evaluate(async()=>{
    const {synthetic,fixtureExam}=await import('./tests/fixtures.js'),{scanOMR}=await import('./js/omr.js');
    const cases=[['straight',{}],['rotated',{rotation:8}],['perspective',{perspective:true}],['uneven-light',{shadow:true}],['blank',{blank:3}],['multiple',{multiple:4}],['faint',{faint:5}],['100-questions-4-choices',{},100,4],['missing-mark',{missingMark:0},20,5,'จุดอ้างอิง'],['unreadable-qr',{noQR:true},20,5,'QR'],['wrong-template',{metadata:{t:'other-template'}},20,5,'แม่แบบ'],['wrong-exam',{metadata:{e:'another-exam'}},20,5,'คนละชุด']];
    const results=[];
    for(const [name,options,count=20,choices=5,expectedError]of cases){const exam=fixtureExam(count,choices),fixture=await synthetic(exam,options);try{
      const result=await scanOMR(fixture.canvas,exam);let correct=0;const mismatches=[];
      result.answers.forEach((a,i)=>{const g=fixture.ground[i];if(a.status===g.status&&(a.status!=='single'||a.answer===g.answer))correct++;else mismatches.push({question:i+1,expected:g,actual:a});});
      results.push({name,questions:count,correct,errors:count-correct,accuracy:correct/count,passed:!expectedError&&correct===count,mismatches,quality:result.quality,marks:result.marks});console.log(`CASE: ${name} ${correct}/${count}`);
    }catch(e){results.push({name,expectedError:expectedError??null,error:e.message,passed:Boolean(expectedError&&e.message.includes(expectedError))});console.log(`CASE: ${name} ${e.message}`);}}
    return results;
  });
  await writeFile('qa/omr-results.json',JSON.stringify(testResults,null,2));console.log(JSON.stringify(testResults.map(({name,correct,questions,passed,error})=>({name,correct,questions,passed,error})),null,2));
  assert.ok(testResults.every(r=>r.passed),'OMR failures: see qa/omr-results.json');
  await page.getByRole('button',{name:'สร้างชุดข้อสอบ',exact:true}).click();
  await page.getByLabel('ชื่อวิชา',{exact:true}).fill('คณิตศาสตร์');await page.getByLabel('ชื่อชุดข้อสอบ',{exact:true}).fill('ทดสอบปลายภาค');await page.getByLabel('รหัสชุดข้อสอบ',{exact:true}).fill('MATH-A');await page.getByLabel('จำนวนข้อ',{exact:true}).selectOption('20');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
  const key=page.locator('#key-form select');for(let i=0;i<20;i++)await key.nth(i).selectOption('ABCDE'[i%5]);await page.getByRole('button',{name:'บันทึกเฉลย',exact:true}).click();
  const pdfWait=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลดกระดาษคำตอบ PDF',exact:true}).click();await(await pdfWait).saveAs('qa/answer-sheet.pdf');
  await page.waitForFunction(()=>!document.querySelector('[data-action="pdf"]').disabled);
  const keyWait=page.waitForEvent('download');await page.getByRole('button',{name:'ส่งออก JSON',exact:true}).click();await(await keyWait).saveAs('qa/key.json');
  const exportedKey=JSON.parse(await readFile('qa/key.json','utf8'));assert.equal(exportedKey.count,20);
  const actualPDFTest=await page.evaluate(async()=>{
    const pdfjs=await import('./node_modules/pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./node_modules/pdfjs-dist/build/pdf.worker.mjs';
    const {answerSheetPDF}=await import('./js/answer-key.js'),{readState}=await import('./js/database.js'),{template}=await import('./js/template.js'),{scanOMR}=await import('./js/omr.js');
    const exam=(await readState()).exams[0],pdf=await answerSheetPDF(exam);
    const documentPDF=await pdfjs.getDocument({data:new Uint8Array(pdf.output('arraybuffer'))}).promise,p=await documentPDF.getPage(1),viewport=p.getViewport({scale:6*25.4/72});
    const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const ctx=canvas.getContext('2d');template(exam.count,exam.choices).questions.forEach((q,i)=>{const b=q.bubbles.find(b=>b.answer===exam.key[i]);ctx.fillStyle='#151515';ctx.beginPath();ctx.arc(b.x*6,b.y*6,b.r*6*.86,0,Math.PI*2);ctx.fill();});
    const result=await scanOMR(canvas,exam);window.__fixtureData=canvas.toDataURL('image/png');window.__alignedData=result.canvas.toDataURL('image/png');
    return {correct:result.answers.filter((a,i)=>a.answer===exam.key[i]&&a.status==='single').length,text:(await p.getTextContent()).items.map(x=>x.str).join(' '),metadata:result.metadata};
  });
  assert.equal(actualPDFTest.correct,20);assert.ok(actualPDFTest.text.includes('คณิตศาสตร์'));assert.equal(actualPDFTest.metadata.e,exportedKey.examId);
  const fixtureURL=await page.evaluate(()=>window.__fixtureData);await writeFile('qa/actual-pdf-filled.png',Buffer.from(fixtureURL.split(',')[1],'base64'));const aligned=await page.evaluate(()=>window.__alignedData);await writeFile('qa/aligned.png',Buffer.from(aligned.split(',')[1],'base64'));
  await page.locator('[data-view="students"]').click();await page.getByRole('button',{name:'เพิ่มนักเรียน',exact:true}).click();await page.getByLabel('รหัสนักเรียน',{exact:true}).fill('001234');await page.getByLabel('ชื่อ–นามสกุล',{exact:true}).fill('ทดสอบ นักเรียน');await page.getByLabel('ห้องเรียน',{exact:true}).fill('ม.1/1');await page.getByLabel('เลขที่',{exact:true}).fill('01');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
  await page.locator('[data-view="scan"]').click();await page.locator('#scan-exam').selectOption(exportedKey.examId);await page.locator('#image-input').setInputFiles('qa/actual-pdf-filled.png');await page.getByRole('button',{name:'ตรวจภาพนี้',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและบันทึกคะแนน',exact:true}).waitFor();
  await page.locator('#scan-student-form [name="student"]').selectOption({index:1});await page.getByLabel('ตรวจทานภาพและคำตอบครบแล้ว').check();await page.getByRole('button',{name:'ยืนยันและบันทึกคะแนน',exact:true}).click();await page.getByText('บันทึกแล้ว 1 แผ่น',{exact:true}).waitFor();
  await page.locator('[data-view="results"]').click();assert.ok((await page.locator('tbody').innerText()).includes('20 / 20'));await page.getByRole('button',{name:'ตรวจทาน',exact:true}).click();await page.locator('[data-question="0"]').selectOption('B');await page.getByLabel('ตรวจทานภาพและคำตอบครบแล้ว').check();await page.getByRole('button',{name:'บันทึกการแก้ไข',exact:true}).click();await page.getByText('บันทึกแล้ว 1 แผ่น',{exact:true}).waitFor();
  await page.locator('[data-view="results"]').click();assert.ok((await page.locator('tbody').innerText()).includes('19 / 20'));
  for(const [name,label]of [['xlsx','Excel'],['csv','CSV'],['json','JSON']]){const wait=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();await(await wait).saveAs(`qa/results.${name}`);}
  const resultJSON=JSON.parse(await readFile('qa/results.json','utf8'));assert.equal(resultJSON.length,1);assert.equal(resultJSON[0].history.length,1);assert.equal(resultJSON[0].totals.score,19);
  await page.locator('[data-view="settings"]').click();const backupWait=page.waitForEvent('download');await page.getByRole('button',{name:'สำรอง JSON พร้อมภาพ',exact:true}).click();await(await backupWait).saveAs('qa/backup.json');const backup=JSON.parse(await readFile('qa/backup.json','utf8'));assert.equal(backup.images.length,1);assert.equal(backup.state.students[0].studentId,'001234');
  await page.reload();await page.locator('[data-view="results"]').click();assert.ok((await page.locator('tbody').innerText()).includes('19 / 20'));
  await page.locator('[data-view="scan"]').click();await page.locator('#scan-exam').selectOption(exportedKey.examId);await page.locator('#image-input').setInputFiles('qa/actual-pdf-filled.png');await page.getByRole('button',{name:'ตรวจภาพนี้',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและบันทึกคะแนน',exact:true}).waitFor();
  await page.locator('#scan-student-form [name="student"]').selectOption({index:1});await page.getByLabel('ตรวจทานภาพและคำตอบครบแล้ว').check();await page.getByRole('button',{name:'ยืนยันและบันทึกคะแนน',exact:true}).click();await page.getByRole('button',{name:'ยืนยัน',exact:true}).click();await page.getByText('บันทึกแล้ว 1 แผ่น',{exact:true}).waitFor();
  const duplicateState=await page.evaluate(async()=>{const {readState}=await import('./js/database.js');const s=await readState();return {n:s.results.length,history:s.results[0].history.length,score:s.results[0].totals.score};});assert.deepEqual(duplicateState,{n:1,history:2,score:20});
  await page.locator('[data-view="settings"]').click();const fileInput=page.waitForEvent('filechooser');await page.getByRole('button',{name:'กู้คืน JSON',exact:true}).click();await(await fileInput).setFiles('qa/backup.json');await page.getByRole('button',{name:'ยืนยัน',exact:true}).click();await page.locator('[data-view="results"]').click();assert.ok((await page.locator('tbody').innerText()).includes('19 / 20'));
  const restored=await page.evaluate(async()=>{const {readState,getImage}=await import('./js/database.js');const s=await readState();return {history:s.results[0].history.length,image:Boolean(await getImage(s.results[0].id))};});assert.deepEqual(restored,{history:1,image:true});
  await page.locator('[data-view="exams"]').click();await page.getByRole('button',{name:'เปิด',exact:true}).click();await page.locator('#key-form select').first().selectOption('B');await page.getByRole('button',{name:'บันทึกเฉลย',exact:true}).click();
  const oldVersion=await page.evaluate(async()=>{const {readState}=await import('./js/database.js'),{imageCanvas}=await import('./js/image-processing.js'),{scanOMR}=await import('./js/omr.js');const s=await readState(),file=await(await fetch('./qa/actual-pdf-filled.png')).blob();const result=await scanOMR(await imageCanvas(file),s.exams[0]);return {version:result.version.version,current:s.exams[0].keyVersion,key:result.version.key[0]};});assert.deepEqual(oldVersion,{version:2,current:3,key:'A'});
  await page.locator('[data-view="home"]').click();await page.screenshot({path:'qa/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-view="scan"]').click();await page.getByRole('button',{name:'เปิดกล้องหลัง',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').srcObject!==null);await page.evaluate(()=>window.__stream=document.querySelector('video').srcObject);await page.locator('[data-view="home"]').click();assert.ok(await page.evaluate(()=>window.__stream.getTracks().every(t=>t.readyState==='ended')));
  await page.locator('[data-view="scan"]').click();await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});await page.getByRole('button',{name:'เปิดกล้องหลัง',exact:true}).click();await page.getByText('ไม่ได้รับอนุญาตให้เปิดกล้อง กรุณาอนุญาตใน browser หรืออัปโหลดภาพ',{exact:true}).first().waitFor();
  await page.locator('[data-view="results"]').click();await page.getByRole('button',{name:'ตรวจทาน',exact:true}).click();await page.locator('[data-question="0"]').waitFor();await page.screenshot({path:'qa/review-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:320,height:740});await page.locator('[data-view="exams"]').click();await page.getByRole('button',{name:'เปิด',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:768,height:1024});await page.locator('[data-view="results"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await writeFile('tests/RESULTS.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),node:process.version,fixtures:testResults,pdfRoundTrip:{correct:actualPDFTest.correct,total:20},workflow:{passed:true,checks:['Thai PDF','CRUD','manual corrections','duplicate guard','result history','old key version','IndexedDB persistence','backup and image restore','Excel/CSV/JSON exports','desktop/mobile/tablet layout','camera teardown','permission denied']}},null,2));
  console.log('PASS: OMR fixtures, actual jsPDF sheet round-trip, Thai PDF, CRUD, grade correction/history, IndexedDB persistence, image backup, exports, responsive layout, camera teardown.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
