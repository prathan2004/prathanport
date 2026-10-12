import {template,sheetMetadata,PAGE} from '../js/template.js';
import {loadScript} from '../js/utils.js';
import {getCV} from '../js/image-processing.js';
export function fixtureExam(count=20,choices=5){return {id:'synthetic-exam',subject:'วิชาทดสอบ',name:'ข้อสอบสังเคราะห์',code:'TEST',count,choices,points:1,key:Array.from({length:count},(_,i)=>'ABCDE'[i%choices]),keyVersion:1,history:[]};}
export async function synthetic(exam,options={}){
  await loadScript('qrcode.js');const layout=template(exam.count,exam.choices),scale=PAGE.scale;
  const canvas=document.createElement('canvas');canvas.width=PAGE.width*scale;canvas.height=PAGE.height*scale;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='black';
  layout.marks.forEach((m,i)=>{if(options.missingMark!==i)ctx.fillRect((m.x-2)*scale,(m.y-2)*scale,4*scale,4*scale);});
  ctx.font='30px Arial';ctx.fillText('STANDARD ANSWER SHEET',108,140);ctx.font='18px Arial';ctx.fillText('Name: ____________________  ID: ____________________',108,370);
  const ground=[];
  for(const [i,q]of layout.questions.entries()){
    let selected=[exam.key[i]],status='single';
    if(options.blank===i){selected=[];status='blank';}
    if(options.multiple===i){selected=[layout.choices[0],layout.choices[1]];status='multiple';}
    if(options.faint===i)status='uncertain';
    ground.push({status,answer:status==='single'?selected[0]:null});
    ctx.fillStyle='black';ctx.font='16px Arial';ctx.fillText(String(q.number),q.x*scale,q.y*scale+5);
    for(const b of q.bubbles){ctx.strokeStyle='black';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x*scale,b.y*scale,b.r*scale,0,Math.PI*2);ctx.stroke();if(selected.includes(b.answer)){ctx.fillStyle=options.faint===i?'#aaaaaa':'#151515';ctx.beginPath();ctx.arc(b.x*scale,b.y*scale,b.r*scale*.86,0,Math.PI*2);ctx.fill();}}
  }
  if(!options.noQR){const qr=window.qrcode(0,'M');qr.addData(JSON.stringify({...sheetMetadata(exam),...(options.metadata??{})}));qr.make();const image=new Image();image.src=qr.createDataURL(6,4);await image.decode();ctx.drawImage(image,layout.qr.x*scale,layout.qr.y*scale,layout.qr.size*scale,layout.qr.size*scale);}
  if(options.shadow){const image=ctx.getImageData(0,0,canvas.width,canvas.height);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const factor=.62+.38*x/canvas.width;const i=(y*canvas.width+x)*4;for(let c=0;c<3;c++)image.data[i+c]*=factor;}ctx.putImageData(image,0,0);}
  let output=canvas;
  if(options.rotation){output=document.createElement('canvas');output.width=canvas.width+260;output.height=canvas.height+260;const c=output.getContext('2d');c.fillStyle='#dddddd';c.fillRect(0,0,output.width,output.height);c.translate(output.width/2,output.height/2);c.rotate(options.rotation*Math.PI/180);c.drawImage(canvas,-canvas.width/2,-canvas.height/2);}
  if(options.perspective){const {cv}=await getCV(),src=cv.imread(canvas),dst=new cv.Mat(),from=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,canvas.width,0,canvas.width,canvas.height,0,canvas.height]),to=cv.matFromArray(4,1,cv.CV_32FC2,[100,100,canvas.width-10,30,canvas.width+70,canvas.height+20,30,canvas.height+80]);let m;try{m=cv.getPerspectiveTransform(from,to);cv.warpPerspective(src,dst,m,new cv.Size(canvas.width+150,canvas.height+150),cv.INTER_LINEAR,cv.BORDER_CONSTANT,new cv.Scalar(220,220,220,255));output=document.createElement('canvas');cv.imshow(output,dst);}finally{m?.delete();to.delete();from.delete();dst.delete();src.delete();}}
  return {canvas:output,ground};
}
