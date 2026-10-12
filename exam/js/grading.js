export function grade(answers,key,points) {
  if(!Array.isArray(answers)||!Array.isArray(key)||answers.length!==key.length||key.some(a=>typeof a!=='string'||a.length!==1||!'ABCDE'.includes(a))||!Number.isFinite(points)||points<=0)throw new Error('จำนวนคำตอบหรือเฉลยไม่ครบ');
  const totals={correct:0,wrong:0,blank:0,multiple:0,uncertain:0};
  const details=answers.map((a,i)=>{
    if(!a||a.status==='single'&&(typeof a.answer!=='string'||a.answer.length!==1||!'ABCDE'.includes(a.answer)))throw new Error('คำตอบไม่ถูกต้อง');
    let status=a.status;
    if(status==='single')status=a.answer===key[i]?'correct':'wrong';
    if(!Object.hasOwn(totals,status))throw new Error('สถานะคำตอบไม่ถูกต้อง');
    totals[status]++;
    return {...a,question:i+1,expected:key[i],outcome:status,score:status==='correct'?points:0};
  });
  const score=Number((totals.correct*points).toFixed(4)),max=Number((key.length*points).toFixed(4));
  return {...totals,score,max,percent:max?score/max*100:0,details};
}
export function classify(fills,choices,config) {
  const selected=fills.map((v,i)=>v>=config.fillThreshold?i:-1).filter(i=>i>=0);
  const uncertain=fills.some(v=>v>=config.uncertainThreshold&&v<config.fillThreshold);
  const peak=Math.max(...fills);
  if(selected.length>1)return {status:'multiple',answer:null,selected:selected.map(i=>choices[i]),confidence:Math.min(...selected.map(i=>fills[i])),fills};
  if(uncertain)return {status:'uncertain',answer:null,selected:selected.map(i=>choices[i]),confidence:peak,fills};
  if(selected.length===1)return {status:'single',answer:choices[selected[0]],selected:[choices[selected[0]]],confidence:peak,fills};
  return {status:'blank',answer:null,selected:[],confidence:1-peak,fills};
}
