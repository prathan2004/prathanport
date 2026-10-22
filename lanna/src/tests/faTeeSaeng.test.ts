import { it,expect } from 'vitest';
import { CMU_MONTH_CRITERIA, faTeeSaeng } from '../lib/faTeeSaeng';
it('เกณฑ์ครบ 12 เดือน ตรงตารางภาพ S2 หน้า 133–134',()=>expect([...CMU_MONTH_CRITERIA]).toEqual([6,7,8,9,10,11,12,1,2,3,4,5]));
it('เมื่อยังยืนยันติถีและเดือนซ้ำไม่ได้ ต้องไม่แสดงคำตัดสินหรือเศษ',()=>{const result=faTeeSaeng();expect(result.verdict).toBe('pending');expect(result.title).toBe('รอการยืนยันหลักการคำนวณ');expect(result).not.toHaveProperty('remainder');});
// No reference examples for the selected formula/tithi mapping have been validated.
it.todo('ผลฟ้าตี๋แส่งจากตัวอย่างอ้างอิง S2: รอหลักฐานติถีและเดือนซ้ำ ไม่ถือว่าผ่าน');
