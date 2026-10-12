import {getCV,detectMarks,bubbleFill} from './image-processing.js';
import {DEFAULT_OMR} from './config.js';
import {template,TEMPLATE_ID,PAGE} from './template.js';
import {classify} from './grading.js';
import {keyVersion} from './exam.js';
import {loadScript} from './utils.js';
export async function scanOMR(canvas,exam,config=DEFAULT_OMR,onProgress=()=>{}) {
  if(Math.min(canvas.width,canvas.height)<config.minShortSide)throw new Error('ภาพละเอียดไม่พอ ด้านสั้นต้องอย่างน้อย 650 พิกเซล');
  onProgress('กำลังเปิด OpenCV…');
  const {cv}=await getCV();await loadScript('jsQR.js');
  const mats=[];const own=m=>{mats.push(m);return m;};
  try{
    onProgress('กำลังหาจุดอ้างอิง…');
    const src=own(cv.imread(canvas)),gray=own(new cv.Mat()),blur=own(new cv.Mat()),binary=own(new cv.Mat());
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(3,3),0,0,cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blur,binary,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,config.adaptiveBlock,config.adaptiveC);
    const marks=detectMarks(cv,binary);
    const width=PAGE.width*PAGE.scale,height=PAGE.height*PAGE.scale;
    const destination=own(cv.matFromArray(4,1,cv.CV_32FC2,[60,60,1200,60,1200,1722,60,1722]));
    const warped=own(new cv.Mat()),aligned=document.createElement('canvas');
    let metadata=null;
    onProgress('กำลังปรับมุมกระดาษและอ่าน QR…');
    for(let rotation=0;rotation<4;rotation++){
      const ordered=marks.map((_,i)=>marks[(i+rotation)%4]);
      const from=own(cv.matFromArray(4,1,cv.CV_32FC2,ordered.flatMap(p=>[p.x,p.y]))),transform=own(cv.getPerspectiveTransform(from,destination));
      cv.warpPerspective(src,warped,transform,new cv.Size(width,height),cv.INTER_LINEAR,cv.BORDER_CONSTANT,new cv.Scalar(255,255,255,255));
      cv.imshow(aligned,warped);
      const ctx=aligned.getContext('2d',{willReadFrequently:true});
      const qrImage=ctx.getImageData(158*6,10*6,45*6,44*6);
      const code=window.jsQR(qrImage.data,qrImage.width,qrImage.height,{inversionAttempts:'attemptBoth'});
      if(code){try{metadata=JSON.parse(code.data);}catch{throw new Error('QR ไม่ใช่กระดาษคำตอบของระบบนี้');}break;}
    }
    if(!metadata)throw new Error('อ่าน QR ไม่ได้ กรุณาถ่ายใหม่ให้ QR ชัด ห้ามพับหรือปิดทับ QR');
    if(metadata.t!==TEMPLATE_ID)throw new Error('แม่แบบกระดาษไม่ตรงกับระบบนี้');
    if(metadata.e!==exam.id)throw new Error('กระดาษเป็นคนละชุดข้อสอบ กรุณาเลือกชุดที่ตรงกัน');
    const version=keyVersion(exam,metadata.v);
    if(metadata.n!==version.count||metadata.c!==version.choices||version.key.some(a=>!a))throw new Error('ข้อมูล QR หรือเฉลยไม่ครบ/ไม่ตรงกัน');
    const layout=template(version.count,version.choices);
    const alignedGray=own(new cv.Mat()),laplacian=own(new cv.Mat()),mean=own(new cv.Mat()),stddev=own(new cv.Mat());
    cv.cvtColor(warped,alignedGray,cv.COLOR_RGBA2GRAY);
    const roi=own(alignedGray.roi(new cv.Rect(90,480,1080,1110)));
    const brightness=cv.mean(roi)[0];cv.Laplacian(roi,laplacian,cv.CV_64F);cv.meanStdDev(laplacian,mean,stddev);
    const sharpness=stddev.data64F[0]**2;
    const warnings=[];
    if(brightness<config.minBrightness)warnings.push('ภาพมืด กรุณาตรวจทานหรือถ่ายใหม่');
    if(brightness>config.maxBrightness)warnings.push('ภาพสว่างมาก อาจอ่านรอยฝนจางไม่ได้');
    if(sharpness<config.minSharpness)throw new Error('ภาพเบลอเกินไป กรุณาถ่ายใหม่โดยถือกล้องให้นิ่ง');
    onProgress('กำลังอ่านรอยฝน…');
    const answers=layout.questions.map(q=>classify(q.bubbles.map(b=>bubbleFill(alignedGray,b,PAGE.scale,config)),layout.choices,config));
    if(brightness<config.minBrightness)answers.forEach(a=>{if(a.status==='single'||a.status==='blank'){a.detectedStatus=a.status;a.status='uncertain';a.answer=null;}});
    return {canvas:aligned,answers,metadata,version,layout,quality:{brightness,sharpness},warnings,marks};
  }finally{for(let i=mats.length-1;i>=0;i--)mats[i].delete();}
}
