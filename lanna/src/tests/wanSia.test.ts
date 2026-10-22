import { describe, it, expect } from 'vitest';
import { isWanSia, wanSia } from '../lib/wanSia';
// Expected weekdays are from the approved evidence-based rule set, not a derived formula.
const fixtures = [[1,[0,1]],[2,[2]],[3,[4,6]],[4,[3,5]],[5,[0,1]],[6,[2]],[7,[4,6]],[8,[3,5]],[9,[0,1]],[10,[2]],[11,[4,6]],[12,[3,5]]] as const;
describe('กฎวันเสียที่ผู้ว่าจ้างอนุมัติ',()=>{
 for(const [month,bad] of fixtures) {
  it(`เดือน ${month}: วันเสีย`,()=>{for(const day of bad)expect(isWanSia(month,day)).toBe(true);});
  it(`เดือน ${month}: วันที่ไม่เสีย`,()=>{for(let day=0;day<7;day++)if(!(bad as readonly number[]).includes(day))expect(isWanSia(month,day)).toBe(false);});
 }
 it('ปฏิเสธเดือนที่ไม่อยู่ใน 1–12',()=>expect(()=>isWanSia(0,1)).toThrow());
 it('ปฏิเสธวันในสัปดาห์ที่ผิด',()=>expect(()=>isWanSia(1,7)).toThrow());
 it('19 ตุลาคม 2569: จันทร์ เดือนเกี๋ยง ตรงวันเสีย ตาม S1 หน้า 24',()=>expect(wanSia('2026-10-19').verdict).toBe('bad'));
 it('13 ตุลาคม 2569: อังคาร เดือนเกี๋ยง ไม่ตรงวันเสีย ตาม S1 หน้า 24',()=>expect(wanSia('2026-10-13').verdict).toBe('not-bad'));
 it('นอกข้อมูลไม่เดาผล',()=>expect(wanSia('2026-11-01').verdict).toBe('pending'));
});
