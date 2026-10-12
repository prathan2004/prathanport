export function report(results,examId='') {
  const rows=results.filter(r=>!examId||r.examId===examId);
  const scores=rows.map(r=>r.totals.score),percents=rows.map(r=>r.totals.percent),n=rows.length;
  const mean=n?scores.reduce((a,b)=>a+b,0)/n:0;
  const sd=n?Math.sqrt(scores.reduce((sum,s)=>sum+(s-mean)**2,0)/n):0;
  const perQuestion=[];
  const versions=new Set(rows.map(r=>r.keyVersion));
  if(examId&&versions.size<=1&&n){for(let i=0;i<rows[0].answers.length;i++){const correct=rows.filter(r=>r.totals.details[i]?.outcome==='correct').length;perQuestion.push({question:i+1,correct,wrong:rows.filter(r=>r.totals.details[i]?.outcome==='wrong').length,blank:rows.filter(r=>r.totals.details[i]?.outcome==='blank').length,multiple:rows.filter(r=>r.totals.details[i]?.outcome==='multiple').length,percent:correct/n*100});}}
  const distribution=Array.from({length:5},(_,i)=>({label:i===4?'80–100%':`${i*20}–${i*20+19}%`,count:percents.filter(p=>Math.min(4,Math.floor(p/20))===i).length}));
  return {rows,n,mean,sd,max:n?Math.max(...scores):0,min:n?Math.min(...scores):0,perQuestion,distribution,mixedVersions:versions.size>1};
}
