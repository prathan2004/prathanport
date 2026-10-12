export const TEMPLATE_ID='sec-static-a4-v1';
export const PAGE={width:210,height:297,scale:6};
export const COUNTS=[10,20,30,40,50,100];
export function template(count,choiceCount=5) {
  if(!COUNTS.includes(count)||![4,5].includes(choiceCount))throw new Error('จำนวนข้อหรือตัวเลือกไม่ตรงกับแม่แบบ');
  const choices='ABCDE'.slice(0,choiceCount).split('');
  const marks=[{x:10,y:10},{x:200,y:10},{x:200,y:287},{x:10,y:287}];
  const questions=Array.from({length:count},(_,i)=>{
    const col=Math.floor(i/25),row=i%25;
    return {number:i+1,x:19+col*47,y:93+row*7,bubbles:choices.map((answer,j)=>({answer,x:29+col*47+j*6,y:93+row*7,r:1.7}))};
  });
  return {...PAGE,id:TEMPLATE_ID,marks,choices,questions,qr:{x:167,y:18,size:28}};
}
export const pixels = mm => mm*PAGE.scale;
export function sheetMetadata(exam) {return {t:TEMPLATE_ID,e:exam.id,v:exam.keyVersion,n:exam.count,c:exam.choices};}
