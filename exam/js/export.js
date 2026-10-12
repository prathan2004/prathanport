import {loadScript,download} from './utils.js';
export function reportRows(results,exams,students) {
  return results.map(r=>{const e=exams.find(x=>x.id===r.examId),s=students.find(x=>x.id===r.studentId);return {'รหัสนักเรียน':s?.studentId??r.studentSnapshot?.studentId,'ชื่อ–นามสกุล':s?.name??r.studentSnapshot?.name,'ห้อง':s?.classroom??'','เลขที่':s?.number??'','วิชา':e?.subject??'','ชุดข้อสอบ':e?.code??'','เวอร์ชันเฉลย':r.keyVersion,'คะแนน':r.totals.score,'เต็ม':r.totals.max,'ร้อยละ':Number(r.totals.percent.toFixed(2)),'ถูก':r.totals.correct,'ผิด':r.totals.wrong,'ไม่ตอบ':r.totals.blank,'ฝนซ้ำ':r.totals.multiple,'เวลา':r.updatedAt};});
}
export async function exportReport(type,rows,results){
  if(type==='json'){download(JSON.stringify(results,null,2),'exam-results.json');return;}
  if(type==='csv'){
    const keys=Object.keys(rows[0]??{});
    const safe=v=>{const text=String(v??'');return `"${(/^[=+@\-\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')}"`;};
    download('\uFEFF'+[keys.map(safe).join(','),...rows.map(r=>keys.map(k=>safe(r[k])).join(','))].join('\r\n'),'exam-results.csv','text/csv;charset=utf-8');return;
  }
  await loadScript('xlsx.full.min.js');
  const workbook=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(workbook,window.XLSX.utils.json_to_sheet(rows),'คะแนน');
  const details=results.flatMap(r=>r.totals.details.map(a=>({result_id:r.id,question:a.question,answer:a.answer??'',expected:a.expected,status:a.outcome,score:a.score,confidence:a.confidence,corrected:Boolean(a.corrected)})));
  window.XLSX.utils.book_append_sheet(workbook,window.XLSX.utils.json_to_sheet(details),'รายข้อ');window.XLSX.writeFile(workbook,'exam-results.xlsx');
}
