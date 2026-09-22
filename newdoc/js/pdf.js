import { db, signedFile } from './supabase.js';
import { toast } from './ui.js';

// html2pdf uses the same A4 preview DOM. CSS page breaks keep signatures together.
export async function generatePdf(element, documentId, userId) {
  if (!window.html2pdf) throw new Error('โหลดไลบรารี PDF ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต');
  await document.fonts.ready;
  await Promise.all([...element.querySelectorAll('img:not([hidden])')].map(image => image.decode()));
  const wrapper=document.createElement('div');wrapper.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;background:white';
  const clone=element.cloneNode(true); clone.style.boxShadow='none'; wrapper.append(clone);document.body.append(wrapper);
  const stamp=new Date().toISOString().slice(0,10).replaceAll('-','');const fileName=`memo_${stamp}_${documentId.slice(0,8)}.pdf`;
  try{
    const worker=window.html2pdf().set({margin:0,filename:fileName,image:{type:'jpeg',quality:.97},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy'],avoid:['.memo-sign','p']}}).from(clone);
    const pdf=await worker.toPdf().get('pdf');
    const count=pdf.internal.getNumberOfPages();
    if(count>1) for(let page=1;page<=count;page++){pdf.setPage(page);pdf.setFontSize(9);pdf.setTextColor(110);pdf.text(`${page} / ${count}`,185,287)}
    const blob=pdf.output('blob');
    const path=`${userId}/${documentId}/${fileName}`;
    const {error:uploadError}=await db.storage.from('documents').upload(path,blob,{contentType:'application/pdf',upsert:true});if(uploadError)throw uploadError;
    const {error:updateError}=await db.from('documents').update({status:'completed',pdf_url:path}).eq('id',documentId);if(updateError)throw updateError;
    toast('สร้าง PDF สำเร็จ');
    const url=await signedFile('documents',path);
    return {blob,url,fileName,path};
  }finally{wrapper.remove()}
}
