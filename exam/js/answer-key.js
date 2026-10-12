import {loadScript,download} from './utils.js';
import {template,sheetMetadata,TEMPLATE_ID} from './template.js';
import {readyExam} from './exam.js';
let fontBase64;
async function thaiFont(){
  if(!fontBase64){const response=await fetch(new URL('../assets/fonts/Sarabun-Regular.ttf',import.meta.url));if(!response.ok)throw new Error('โหลดฟอนต์ไทยไม่สำเร็จ');const bytes=new Uint8Array(await response.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));fontBase64=btoa(text);}
  return fontBase64;
}
export async function answerSheetPDF(exam){
  readyExam(exam);await Promise.all([loadScript('jspdf.umd.min.js'),loadScript('qrcode.js')]);
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.addFileToVFS('Sarabun-Regular.ttf',await thaiFont());pdf.addFont('Sarabun-Regular.ttf','Sarabun','normal');pdf.setFont('Sarabun');
  const layout=template(exam.count,exam.choices);
  const text=(value,x,y,size=14,maxWidth=145)=>{pdf.setFontSize(size);const actual=Math.min(size,size*maxWidth/Math.max(pdf.getTextWidth(String(value)),1));if(actual<8)throw new Error('ชื่อข้อสอบยาวเกินพื้นที่ PDF');pdf.setFontSize(actual);pdf.text(String(value),x,y);};
  pdf.setFillColor(0);layout.marks.forEach(m=>pdf.rect(m.x-2,m.y-2,4,4,'F'));
  text('กระดาษคำตอบ',18,23,24);text(exam.subject,18,34,18);text(`${exam.name} · ชุด ${exam.code}`,18,44,16);
  text(`ชื่อ–นามสกุล ........................................................................ ห้อง .................. เลขที่ ............`,18,62,14,176);
  text('รหัสนักเรียน ...................................................................................................................',18,73,14,176);
  pdf.setFont('helvetica');
  for(let col=0;col<4;col++){pdf.setFontSize(8);pdf.text('No.',19+col*47,85);layout.choices.forEach((c,i)=>pdf.text(c,29+col*47+i*6,85,{align:'center'}));}
  pdf.setLineWidth(.25);
  layout.questions.forEach(q=>{pdf.setFontSize(8);pdf.text(String(q.number),q.x,q.y+1);q.bubbles.forEach(b=>pdf.circle(b.x,b.y,b.r,'S'));});
  const qr=window.qrcode(0,'M');qr.addData(JSON.stringify(sheetMetadata(exam)));qr.make();
  pdf.addImage(qr.createDataURL(6,4),'PNG',layout.qr.x,layout.qr.y,layout.qr.size,layout.qr.size);
  pdf.setFont('Sarabun');text('ฝนให้เต็มวงกลมเพียงคำตอบเดียว ใช้ดินสอ 2B หรือปากกาดำ ลบคำตอบเดิมให้สะอาด',18,273,12,176);
  text('พิมพ์ A4 ขนาดจริง 100% ห้ามปรับพอดีหน้า เก็บจุดอ้างอิงทั้ง 4 มุมและ QR ให้ครบ',18,279,12,176);
  pdf.setFont('helvetica');pdf.setFontSize(7);pdf.text(`${TEMPLATE_ID} | ${exam.count} questions | key v${exam.keyVersion}`,18,285);
  download(pdf.output('arraybuffer'),`answer-sheet-${exam.code.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`,'application/pdf');
  return pdf;
}
