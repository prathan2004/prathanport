import type { Result } from './wanSia';
// CMU ch.3, printed pp.133–134; visually verified. Not a civil-date converter.
export const CMU_MONTH_CRITERIA = [6,7,8,9,10,11,12,1,2,3,4,5] as const;
export const CMU_FORMULA = 'เศษจาก ((จ.ศ. หาร 108 เอาเศษ + เกณฑ์เดือน + ติถี) × 4 − 7) หาร 9';
// Deliberately no automatic tithi mapping: the selected section does not specify
// enough for this app to assert how waning days and intercalary months map to T.
export function faTeeSaeng(): Result {
 return {verdict:'pending', title:'รอการยืนยันหลักการคำนวณ', explanation:'ใช้แหล่งหลักจากงานวิจัย มช. บทที่ 3 ตรวจพบตัวคูณ 4 และเกณฑ์เดือนครบแล้ว แต่ยังไม่ยืนยันการแทนค่าติถีและเดือนซ้ำ จึงยังไม่แสดงเศษหรือคำตัดสิน'};
}
