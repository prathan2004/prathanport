import {loadScript} from './utils.js';
let loading;
export async function getCV() {
  if(!loading)loading=(async()=>{
    await loadScript('opencv.js');
    if(window.cv?.Mat)return {cv:window.cv};
    if(window.cv?.then)return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('OpenCV เปิดไม่สำเร็จ กรุณารีเฟรช')),45000);
      window.cv.then(value=>{clearTimeout(timer);resolve({cv:value});});
    });
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('OpenCV เปิดไม่สำเร็จ กรุณารีเฟรชหรือเปลี่ยน browser')),45000);window.cv.onRuntimeInitialized=()=>{clearTimeout(timeout);resolve();};});
    return {cv:window.cv};
  })().catch(e=>{loading=null;throw e;});
  return loading;
}
export async function imageCanvas(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('รองรับภาพ JPG, PNG และ WebP เท่านั้น');
  if(file.size>25*1024*1024)throw new Error('ไฟล์ภาพต้องไม่เกิน 25 MB');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,2000/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
  }catch{throw new Error('เปิดภาพไม่ได้ กรุณาเลือก JPG หรือ PNG ใหม่');}finally{URL.revokeObjectURL(url);}
}
export function rotateCanvas(source) {const canvas=document.createElement('canvas');canvas.width=source.height;canvas.height=source.width;const ctx=canvas.getContext('2d');ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(source,0,0);return canvas;}
export function detectMarks(cv,binary) {
  const contours=new cv.MatVector(),hierarchy=new cv.Mat();
  const candidates=[];
  try{
    cv.findContours(binary,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
    const short=Math.min(binary.cols,binary.rows);
    for(let i=0;i<contours.size();i++){
      const contour=contours.get(i),polygon=new cv.Mat();
      try{
        const rect=cv.boundingRect(contour),area=cv.contourArea(contour);
        if(rect.width<short*0.012||rect.height<short*0.012||rect.width>short*0.045||rect.height>short*0.045||rect.width/rect.height<0.65||rect.width/rect.height>1.5||area/(rect.width*rect.height)<0.60)continue;
        cv.approxPolyDP(contour,polygon,cv.arcLength(contour,true)*0.035,true);
        if(polygon.rows!==4||!cv.isContourConvex(polygon))continue;
        const points=Array.from({length:4},(_,j)=>({x:polygon.data32S[j*2],y:polygon.data32S[j*2+1]}));
        const sides=points.map((p,j)=>Math.hypot(p.x-points[(j+1)%4].x,p.y-points[(j+1)%4].y));
        if(Math.max(...sides)/Math.min(...sides)>1.7)continue;
        const region=binary.roi(rect);
        let solid;
        try{solid=cv.countNonZero(region)/(rect.width*rect.height);}finally{region.delete();}
        if(solid<0.65)continue;
        candidates.push({x:rect.x+rect.width/2,y:rect.y+rect.height/2,area});
      }finally{polygon.delete();contour.delete();}
    }
  }finally{hierarchy.delete();contours.delete();}
  const w=binary.cols,h=binary.rows;
  const regions=[p=>p.x<w*.32&&p.y<h*.25,p=>p.x>w*.68&&p.y<h*.25,p=>p.x>w*.68&&p.y>h*.75,p=>p.x<w*.32&&p.y>h*.75];
  const targets=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  const marks=regions.map((test,i)=>candidates.filter(test).sort((a,b)=>Math.hypot(a.x-targets[i].x,a.y-targets[i].y)-Math.hypot(b.x-targets[i].x,b.y-targets[i].y))[0]);
  if(marks.some(p=>!p))throw new Error('ไม่พบจุดอ้างอิงครบ 4 มุม กรุณาถ่ายใหม่ให้เห็นสี่มุมและเว้นขอบรอบกระดาษ');
  if(Math.max(...marks.map(p=>p.area))/Math.min(...marks.map(p=>p.area))>4)throw new Error('จุดอ้างอิงมีขนาดไม่สอดคล้องกัน กรุณาถ่ายใหม่');
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  if(marks.some((p,i)=>cross(p,marks[(i+1)%4],marks[(i+2)%4])<=0))throw new Error('ตำแหน่งกระดาษไม่ถูกต้อง');
  return marks;
}
export function bubbleFill(gray,bubble,scale,config) {
  const cx=bubble.x*scale,cy=bubble.y*scale,r=bubble.r*scale;
  const sample=r*config.sampleRadius,ringMin=r*1.55,ringMax=r*2.05;
  const ring=[],inside=[];
  for(let y=Math.floor(cy-ringMax);y<=Math.ceil(cy+ringMax);y++)for(let x=Math.floor(cx-ringMax);x<=Math.ceil(cx+ringMax);x++){
    if(x<0||y<0||x>=gray.cols||y>=gray.rows)throw new Error('ช่องคำตอบอยู่นอกภาพ กรุณาถ่ายใหม่');
    const d=Math.hypot(x-cx,y-cy),v=gray.data[y*gray.cols+x];
    if(d<=sample)inside.push(v);else if(d>=ringMin&&d<=ringMax)ring.push(v);
  }
  ring.sort((a,b)=>a-b);const background=ring[Math.floor(ring.length*.7)];
  const cutoff=background-config.darkDelta;
  const fraction=inside.filter(v=>v<cutoff).length/inside.length;
  const darkness=inside.reduce((sum,v)=>sum+Math.max(0,(background-v)/Math.max(background,1)),0)/inside.length;
  // Local contrast prevents a page shadow from counting as a pencil mark.
  return Math.min(fraction,darkness);
}
