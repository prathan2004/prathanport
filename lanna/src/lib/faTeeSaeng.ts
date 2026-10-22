import type { Result } from './wanSia';
import { lannaCalendar } from './lannaCalendar';
import { monthNames } from '../data/calendarSources';

// CMU ch.3 pp.133–134; appendix pp.247–249 (PDF pages 1–3).
// Formula, month criteria and all 30 tithi entries visually checked.
export const CMU_MONTH_CRITERIA = [6,7,8,9,10,11,12,1,2,3,4,5] as const;
export const CMU_FORMULA = 'เศษจาก ((จ.ศ. หาร 108 เอาเศษ + เกณฑ์เดือน + ติถี) × 4 − 7) หาร 9';
export const CMU_METHOD_NOTE = 'ใช้เกณฑ์ตามเลขเดือนในตารางเดิม เดือนซ้ำก่อน/หลังใช้เกณฑ์เดือนเดียวกัน ไม่บวกเกณฑ์สะสมเดือนแทรก ภาคผนวกไม่ได้แยกกฎเดือนซ้ำไว้ จึงเป็นวิธีใช้ตารางของเว็บนี้ และอาจต่างจากปั๋กขะตืนที่นับเดือนแทรกต่อเนื่อง';
export const CMU_SOURCE_URL = 'https://archive.lib.cmu.ac.th/full/T/2549/lanna0449st_app.pdf';
export interface FaResult extends Result {
 remainder?:number; tithi?:number; criterion?:number; yearRemainder?:number; total?:number; steps?:string[];
 methodNote:string;
}
export function tithiOf(phase:'waxing'|'waning',lunarDay:number):number {
 if((phase!=='waxing'&&phase!=='waning')||!Number.isInteger(lunarDay)||lunarDay<1||lunarDay>15)throw new RangeError('ข้างหรือค่ำไม่ถูกต้อง');
 return lunarDay+(phase==='waning'?15:0);
}
export function calculateCmu(chulaSakarat:number,month:number,phase:'waxing'|'waning',lunarDay:number) {
 if(!Number.isSafeInteger(chulaSakarat)||chulaSakarat<0||!Number.isInteger(month)||month<1||month>12)throw new RangeError('จุลศักราชหรือเดือนล้านนาไม่ถูกต้อง');
 const tithi=tithiOf(phase,lunarDay),criterion=CMU_MONTH_CRITERIA[month-1],yearRemainder=chulaSakarat%108;
 const total=(yearRemainder+criterion+tithi)*4-7,remainder=((total%9)+9)%9;
 return {tithi,criterion,yearRemainder,total,remainder,good:[2,4,5,6].includes(remainder)};
}
export function faTeeSaeng(iso?:string|null):FaResult {
 const calendar=iso?lannaCalendar(iso):null;
 if(!calendar||calendar.status==='unverified')return {verdict:'pending',title:'ยังไม่สามารถคำนวณฟ้าตี๋แส่ง',explanation:'กรุณาเลือกวันที่จริงในช่วง พ.ศ. 2443–2743',methodNote:CMU_METHOD_NOTE};
 const day=calendar.day,math=calculateCmu(day.chulaSakarat,day.month,day.phase,day.lunarDay);
 const phase=day.phase==='waxing'?'ขึ้น':'แรม';
 return {
  ...math,verdict:math.good?'not-bad':'bad',evidence:'calculated',evidenceLabel:'ผลคำนวณสูตร มช. ×4',
  title:math.good?'ดีตามเกณฑ์ฟ้าตี๋แส่ง':'ไม่ดีตามเกณฑ์ฟ้าตี๋แส่ง',
  explanation:`ได้เศษ ${math.remainder} ${math.good?'อยู่ในกลุ่มเศษ 2, 4, 5, 6 ที่ตำราจัดว่าดีสำหรับงานมงคล':'อยู่ในกลุ่มเศษ 0, 1, 3, 7, 8 ที่ตำราจัดว่าไม่เหมาะกับงานมงคล'} เป็นผลตามสูตรและวิธีใช้ตารางที่ระบุ ไม่ใช่คำทำนายผลในชีวิต`,
  methodNote:CMU_METHOD_NOTE,
  steps:[
   `จ.ศ. ${day.chulaSakarat} หาร 108 เหลือเศษ ${math.yearRemainder}`,
   `เดือน${monthNames[day.month-1]} ใช้เกณฑ์ ${math.criterion}; ${phase} ${day.lunarDay} ค่ำ เป็นติถี ${math.tithi}`,
   `(${math.yearRemainder} + ${math.criterion} + ${math.tithi}) × 4 − 7 = ${math.total}`,
   `${math.total} หาร 9 เหลือเศษ ${math.remainder}`,
  ],
 };
}
