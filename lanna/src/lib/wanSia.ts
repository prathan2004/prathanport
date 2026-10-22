import { weekday, weekNames } from './dateUtils';
import { lannaCalendar } from './lannaCalendar';
import { monthNames } from '../data/calendarSources';
export type Verdict = 'bad'|'not-bad'|'pending';
export interface Result { verdict:Verdict; title:string; explanation:string; evidence?:'verified'|'calculated'; evidenceLabel?:string; }
export const wanSiaRules: readonly (readonly number[])[] = [[0,1],[2],[4,6],[3,5],[0,1],[2],[4,6],[3,5],[0,1],[2],[4,6],[3,5]];
export function isWanSia(month:number, day:number) {
 if (!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day)||day<0||day>6) throw new Error('เดือนหรือวันในสัปดาห์ไม่ถูกต้อง');
 return wanSiaRules[month-1].includes(day);
}
export function wanSia(iso:string): Result {
 const calendar = lannaCalendar(iso);
 if (calendar.status === 'unverified') return {verdict:'pending', title:calendar.reason, explanation:'กรุณาเลือกวันที่ในช่วง พ.ศ. 2443–2743 ที่ระบบรองรับ'};
 const month = calendar.day.month;
 const bad = isWanSia(month, weekday(iso));
 return {verdict:bad?'bad':'not-bad', evidence:calendar.status, title:bad?'ตรงกับวันเสีย':'ไม่ตรงกับวันเสีย', explanation:`เดือน${monthNames[month-1]} มีวันเสียคือ${wanSiaRules[month-1].map(n=>'วัน'+weekNames[n]).join(' และ ')} วันที่เลือกเป็นวัน${weekNames[weekday(iso)]} จึง${bad?'เข้า':'ไม่เข้า'}เกณฑ์นี้`};
}
