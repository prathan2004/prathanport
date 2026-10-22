import { describe,it,expect } from 'vitest';
import { lannaCalendar } from '../lib/lannaCalendar';
import { bangkokToday, buddhistYear, gregorianYear, initialDate, isISODate, weekday } from '../lib/dateUtils';
describe('วันที่สากลและเวลาไทย',()=>{
 it('พ.ศ./ค.ศ.',()=>{expect(buddhistYear(2026)).toBe(2569);expect(gregorianYear(2569)).toBe(2026);});
 it('29 กุมภาพันธ์ ปีอธิกสุรทิน',()=>expect(isISODate('2024-02-29')).toBe(true));
 it.each(['2023-02-29','2026-02-30','2026-13-01','2026-1-01','invalid','0000-01-01'])('ปฏิเสธ %s',s=>expect(isISODate(s)).toBe(false));
 it('เวลา UTC ยังวันที่ 18 แต่กรุงเทพฯ วันที่ 19',()=>expect(bangkokToday(new Date('2026-10-18T17:00:00Z'))).toBe('2026-10-19'));
 it('ก่อนเที่ยงคืนกรุงเทพฯ',()=>expect(bangkokToday(new Date('2026-10-18T16:59:59Z'))).toBe('2026-10-18'));
 it('วันจันทร์ที่ 19 ตุลาคม',()=>expect(weekday('2026-10-19')).toBe(1));
 it('อ่านลิงก์วันที่',()=>expect(initialDate('?date=2026-10-19')).toEqual({date:'2026-10-19',error:''}));
 it('วันที่เสียในลิงก์ต้องแจ้งข้อผิดพลาด',()=>expect(initialDate('?date=2026-02-30').error).not.toBe(''));
});
describe('ปฏิทิน: หลักฐาน S1 หน้าไฟล์ 24 ตรวจภาพจริง',()=>{
 const rows = [ ['2026-10-01',12,'waning',5], ['2026-10-11',12,'waning',15], ['2026-10-12',1,'waxing',1], ['2026-10-19',1,'waxing',8], ['2026-10-26',1,'waxing',15], ['2026-10-27',1,'waning',1], ['2026-10-31',1,'waning',5] ] as const;
 it.each(rows)('%s: เดือน/ข้าง/ค่ำตรงภาพ',(iso,month,phase,lunarDay)=>{const result=lannaCalendar(iso);expect(result.status).toBe('verified');if(result.status==='verified')expect(result.day).toMatchObject({month,phase,lunarDay,sourcePage:24,chulaSakarat:1388});});
 it('เปลี่ยนเดือนเกี๋ยงไม่เปลี่ยนจุลศักราช',()=>{const a=lannaCalendar('2026-10-11'),b=lannaCalendar('2026-10-12');if(a.status==='verified'&&b.status==='verified')expect(a.day.chulaSakarat).toBe(b.day.chulaSakarat);else throw Error('missing fixture');});
 it.each(['2026-09-30','2026-11-01','2026-07-15','2027-01-01'])('ไม่คาดคะเนขอบเขต/เดือนซ้ำ/ปีใหม่: %s',iso=>expect(lannaCalendar(iso).status).toBe('unverified'));
 it('วันที่ผิดไม่ถูกจัดเป็นข้อมูลที่ยืนยัน',()=>expect(lannaCalendar('2026-10-32').status).toBe('unverified'));
});
