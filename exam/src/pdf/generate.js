import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { createTemplate } from './template.js';
import { id } from '../services/data.js';
export async function generateSheets(exam, course, students, personalized, onProgress = () => {}) {
  const template = createTemplate(exam.question_count, exam.id_digits, exam.no_digits);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/Sarabun-Regular.ttf`);
  if (!response.ok) throw new Error('โหลดฟอนต์ PDF ไม่สำเร็จ');
  const font = await pdf.embedFont(await response.arrayBuffer(), {subset: true});
  const records = [];
  const targets = personalized ? students : [null];
  if (!targets.length) throw new Error('ไม่มีนักเรียนในห้องที่เลือก');
  for (const [index, student] of targets.entries()) {
    if (student && (!/^\d+$/.test(student.student_id) || student.student_id.length > exam.id_digits || student.student_no.length > exam.no_digits)) throw new Error(`รหัสหรือเลขที่ ${student.full_name} ยาวเกินแม่แบบ`);
    const sheetId = id();
    for (const layout of template.pages) {
      const page = pdf.addPage([template.width, template.height]);
      const text = (value,x,y,size=10) => {
        const content = String(value);
        const maxWidth = x === 40 ? (y >= 689 ? 400 : 515) : 100;
        const width = font.widthOfTextAtSize(content, size);
        const fitted = width > maxWidth ? size * maxWidth / width : size;
        if (fitted < 6) throw new Error('ข้อความยาวเกินพื้นที่กระดาษ กรุณาย่อชื่อรายวิชาหรือชุดข้อสอบ');
        page.drawText(content, {x,y,size:fitted,font,color:rgb(0,0,0)});
      };
      const circle = b => page.drawCircle({x:b.x,y:b.y,size:b.radius,borderWidth:0.65,borderColor:rgb(0,0,0)});
      layout.marks.forEach(m => page.drawRectangle({x:m.x-5,y:m.y-5,width:10,height:10,color:rgb(0,0,0)}));
      text('กระดาษคำตอบ',40,785,20);
      text(`${course.name} (${course.code})`,40,760,12);
      text(`${exam.name} · ชุด ${exam.variant} · ห้อง ${exam.class_id}`,40,739,11);
      text(`ปีการศึกษา ${course.academic_year} · ภาคเรียน ${course.term}`,40,720);
      text(student ? `ชื่อ ${student.full_name}` : 'ชื่อ–นามสกุล ........................................................................',40,699,11);
      text('รหัสนักเรียน',40,677); text('เลขที่',379,677);
      for (const [grid, value] of [[layout.studentId,student?.student_id.padStart(exam.id_digits,'0')],[layout.studentNo,student?.student_no.padStart(exam.no_digits,'0')]]) {
        for (const column of grid) {
          text(value?.[column.column] ?? '___',column.bubbles[0].x-3,664,8);
          column.bubbles.forEach(b => {circle(b); text(b.digit,b.x-2.2,b.y-2.5,6);});
        }
      }
      text('ฝนวงกลมให้เต็มด้วยดินสอ 2B เลือกเพียงคำตอบเดียวต่อข้อ',40,486,11);
      text('หากแก้ไข ให้ลบรอยเดิมให้สะอาด พิมพ์ขนาดจริง 100% ห้ามปรับพอดีหน้า',40,467,9);
      for(let c=0;c<4;c++) {
        text('ข้อ',40+c*132,418,9);
        ['ก','ข','ค','ง','จ'].forEach((v,j)=>text(v,64+c*132+j*17,418,9));
      }
      layout.questions.forEach(q => {text(q.number,q.labelX,q.y-3,9);q.bubbles.forEach(circle);});
      const payload = {v:template.version,e:exam.id,s:sheetId,p:layout.page,k:exam.key_version};
      const png = await pdf.embedPng(await QRCode.toDataURL(JSON.stringify(payload), {errorCorrectionLevel:'M',margin:4,width:256}));
      page.drawImage(png,{x:450,y:689,width:110,height:110});
      text(`แม่แบบ ${template.version} · หน้า ${layout.page}/${template.pages.length} · เฉลย v${exam.key_version}`,40,61,8);
      text(`Sheet: ${sheetId}`,40,46,7);
    }
    records.push({id:sheetId,exam_id:exam.id,student_id:student?.id ?? null,template_version:template.version,key_version:exam.key_version,pages:template.pages.length,created_at:new Date().toISOString()});
    onProgress(index+1,targets.length);
  }
  return {bytes:await pdf.save(),records};
}
export function download(bytes, name, type='application/pdf') {
  const url = URL.createObjectURL(new Blob([bytes],{type}));
  const a = document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
