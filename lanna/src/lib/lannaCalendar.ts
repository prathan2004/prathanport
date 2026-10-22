import { isISODate } from './dateUtils';
import { calendarDays } from '../data/calendarDays';
export interface CalendarDay { isoDate: string; month: number; phase:'waxing'|'waning'; lunarDay: number; chulaSakarat:number; monthOccurrence:'normal'; system:'pak-lem-chiang-mai'; sourceId:string; sourcePage:number; verificationStatus:'verified'; }
export type CalendarResult = { status:'verified'; day:CalendarDay } | { status:'unverified'; reason:string };
const records = new Map<string, CalendarDay>(calendarDays.map(day=>[day.isoDate,day]));
// Source records are separate from this lookup. No astronomical extrapolation.
export function lannaCalendar(iso: string): CalendarResult {
 if (!isISODate(iso)) return {status:'unverified', reason:'วันที่ไม่ถูกต้อง'};
 const day=records.get(iso);
 if (!day || day.verificationStatus!=='verified') return {status:'unverified', reason:'ยังไม่สามารถยืนยันเดือนล้านนา'};
 return {status:'verified', day:{...day}};
}
