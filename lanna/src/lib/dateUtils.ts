import { format, isValid, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
export function isISODate(value: string): boolean {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || +value.slice(0,4) < 1900 || +value.slice(0,4) > 2200) return false;
 const date = parseISO(value);
 return isValid(date) && format(date, 'yyyy-MM-dd') === value;
}
export function bangkokToday(now = new Date()): string {
 const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
 return ['year','month','day'].map(type => parts.find(p=>p.type===type)!.value).join('-');
}
export function buddhistYear(year: number) { return year + 543; }
export function gregorianYear(year: number) { return year - 543; }
export function weekday(iso: string) { if (!isISODate(iso)) throw new Error('วันที่ไม่ถูกต้อง'); return new Date(`${iso}T12:00:00+07:00`).getUTCDay(); }
export const weekNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
export function thaiDate(iso: string) {
 if (!isISODate(iso)) return 'วันที่ไม่ถูกต้อง';
 const date = parseISO(iso);
 return `${format(date, 'd MMMM', { locale: th })} ${buddhistYear(date.getFullYear())}`;
}
export function initialDate(search: string): { date: string; error: string } {
 const value = new URLSearchParams(search).get('date');
 return value && !isISODate(value) ? { date: bangkokToday(), error: 'วันที่ในลิงก์ไม่ถูกต้อง กรุณาเลือกวันที่ใหม่' } : { date: value || bangkokToday(), error: '' };
}
