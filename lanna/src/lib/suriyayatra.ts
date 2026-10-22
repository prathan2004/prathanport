/*!
 * Suriyayatra arithmetic adapted from goichi-dev/thai-lunar (MIT).
 * Copyright (c) 2026 The Goichi Authors; portions (c) 2023 Mark Hollow.
 * Full permission notice: public/THIRD_PARTY_NOTICES.txt.
 * This is a conventional arithmetic calendar, not observed moon phases.
 */
type Kind = 'A'|'B'|'C'|'c';
export type LunarYearType = 'normal'|'extra-day'|'extra-month';
interface Year { year:number; horakhun:number; kammacapon:number; avoman:number; tithi:number; langsak:number; nyd:number; nextNyd:number; leapday:boolean; kind:Kind; offset:boolean; offsetDays:number; }
const div = (a:number,b:number)=>Math.trunc(a/b);
const yearHorakhun = (year:number)=>div(year*292207+373,800)+1;
const cache = new Map<number,Year>();
function rawYear(year:number):Year {
 const horakhun=yearHorakhun(year), kammacapon=800-(year*292207+373)%800;
 const q=div(horakhun*11+650,692), avoman=(horakhun*11+650)%692||692;
 let tithi=(q+horakhun)%30;
 if(avoman===692)tithi--;
 const nextH=yearHorakhun(year+1),nextT=(div(nextH*11+650,692)+nextH)%30;
 const langsak=Math.max(1,tithi),n=langsak<6?langsak+29:langsak;
 const nyd=(horakhun%7-n+1+35)%7,leapday=kammacapon<=207;
 let kind:Kind=tithi>24||tithi<6?'C':'A';
 if(tithi===25&&nextT===5)kind='A';
 if((leapday&&avoman<=126)||(!leapday&&avoman<=137))kind=kind==='C'?'c':'B';
 const nextNyd=(nyd+(kind==='A'?4:kind==='B'?5:6))%7;
 return {year,horakhun,kammacapon,avoman,tithi,langsak,nyd,nextNyd,leapday,kind,offset:false,offsetDays:0};
}
function yearData(year:number):Year {
 const cached=cache.get(year);if(cached)return cached;
 const years=Array.from({length:5},(_,i)=>rawYear(year+i-2));
 if(years[2].tithi===24&&years[3].tithi===6)for(const item of years){item.kind='C';item.nextNyd=(item.nextNyd+2)%7;}
 for(const i of [1,2,3])if(years[i].kind==='c'){
  const j=years[i].nyd===years[i-1].nextNyd?1:-1;
  years[i+j].kind='B';years[i+j].nextNyd=(years[i+j].nextNyd+1)%7;
 }
 for(const i of [1,2,3])if(years[i-1].nextNyd!==years[i].nyd&&years[i].nextNyd!==years[i+1].nyd){
  years[i].offset=true;years[i].langsak++;years[i].nyd=(years[i].nyd+6)%7;years[i].nextNyd=(years[i].nextNyd+6)%7;
 }
 for(const item of years)if(item.kind==='c')item.kind='C';
 const result=years[2];result.offsetDays=result.langsak;
 if(result.offsetDays<(result.offset?7:6))result.offsetDays+=29;
 cache.set(year,result);return result;
}
// The month sequence starts at Thai lunar month 5. Raw 88 = month 8 after;
// raw 15/16 are month 5/6 at the tail of the same arithmetic solar year.
const monthCodes=[0,5,6,7,8,9,10,11,12,1,2,3,4,8,88,15,16];
const thresholds:Record<'A'|'B'|'C',readonly (readonly [number,number])[]>={
 A:[[383,16],[354,15],[324,12],[295,11],[265,10],[236,9],[206,8],[177,7],[147,6],[118,5],[88,4],[59,3],[29,2]],
 B:[[384,16],[355,15],[325,12],[296,11],[266,10],[237,9],[207,8],[178,7],[148,6],[119,5],[89,4],[59,3],[29,2]],
 C:[[384,15],[354,12],[325,11],[295,10],[266,9],[236,8],[207,7],[177,6],[148,5],[118,14],[88,13],[59,3],[29,2]],
};
export function julianDay(year:number,month:number,day:number):number {
 const a=div(14-month,12),y=year+4800-a,m=month+12*a-3;
 return day+div(153*m+2,5)+365*y+div(y,4)-div(y,100)+div(y,400)-32045;
}
export interface ThaiLunarDay { month:number; phase:'waxing'|'waning'; lunarDay:number; occurrence:'normal'|'first'|'second'; chulaSakarat:number; yearType:LunarYearType; }
export function thaiLunarDate(iso:string):ThaiLunarDay {
 const [gy,gm,gd]=iso.split('-').map(Number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||gy<1900||gy>2200||!Number.isFinite(Date.UTC(gy,gm-1,gd))||new Date(Date.UTC(gy,gm-1,gd)).toISOString().slice(0,10)!==iso)throw new RangeError('รองรับวันที่จริงระหว่าง ค.ศ. 1900–2200');
 const jd=julianDay(gy,gm,gd),hk=jd-1954167;
 let year=div(hk*800-373,292207),days:number;
 if(hk%292207===95333){year--;days=365;}else days=hk-yearHorakhun(year);
 let data=yearData(year),length=data.leapday?366:365;
 while(days>length){year++;days-=length;data=yearData(year);length=data.leapday?366:365;}
 let lunarDay=data.offsetDays+days,rawMonth=5;
 for(const [limit,index] of thresholds[data.kind as 'A'|'B'|'C'])if(lunarDay>limit){lunarDay-=limit;rawMonth=monthCodes[index];break;}
 const month=rawMonth===88?8:rawMonth>=15?rawMonth-10:rawMonth;
 const phase=lunarDay>15?'waning':'waxing';
 if(lunarDay>15)lunarDay-=15;
 if(month<1||month>12||lunarDay<1||lunarDay>15)throw Error('Suriyayatra date outside supported arithmetic');
 return {month,phase,lunarDay,chulaSakarat:year,occurrence:month===8&&data.kind==='C'?(rawMonth===88?'second':'first'):'normal',yearType:data.kind==='B'?'extra-day':data.kind==='C'?'extra-month':'normal'};
}
