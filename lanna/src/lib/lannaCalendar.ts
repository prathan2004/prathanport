import { isISODate } from './dateUtils';
import { calendarDays } from '../data/calendarDays';
import { thaiLunarDate, type LunarYearType } from './suriyayatra';
export interface CalendarDay { isoDate: string; month: number; phase:'waxing'|'waning'; lunarDay: number; chulaSakarat:number; monthOccurrence:'normal'|'first'|'second'; system:'pak-lem-chiang-mai'; sourceId:string; sourcePage?:number; verificationStatus:'verified'|'calculated'; yearType?:LunarYearType; }
export type CalendarResult = { status:'verified'|'calculated'; day:CalendarDay } | { status:'unverified'; reason:string };
const records = new Map<string, CalendarDay>(calendarDays.map(day=>[day.isoDate,day]));
// Prefer checked primary-source rows. Other supported dates use the documented
// Suriyayatra model and are explicitly labelled calculated, not row-verified.
export function lannaCalendar(iso: string): CalendarResult {
 if (!isISODate(iso)) return {status:'unverified', reason:'วันที่ไม่ถูกต้อง'};
 const day=records.get(iso);
 if (day?.verificationStatus==='verified') return {status:'verified', day:{...day}};
 const lunar=thaiLunarDate(iso);
 // Selected convention only: Pak Lem Chiang Mai. The repeated Thai month 8
 // becomes Lanna month 10 before/after, retaining occurrence rather than 13.
 return {status:'calculated',day:{isoDate:iso,month:(lunar.month+1)%12+1,phase:lunar.phase,lunarDay:lunar.lunarDay,chulaSakarat:lunar.chulaSakarat,monthOccurrence:lunar.occurrence,system:'pak-lem-chiang-mai',sourceId:'suriyayatra-paklem',verificationStatus:'calculated',yearType:lunar.yearType}};
}
