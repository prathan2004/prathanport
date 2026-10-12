export const emptyData = () => ({courses: [], students: [], exams: [], sheets: []});
const KEY = 'smart-exam-checker-v1';
export function loadData() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyData();
  const data = JSON.parse(raw);
  if (!['courses','students','exams','sheets'].every(k => Array.isArray(data[k]))) throw new Error('ข้อมูลในเครื่องมีรูปแบบไม่ถูกต้อง');
  return data;
}
export function saveData(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export const id = () => crypto.randomUUID();
export function validateStudents(rows, existing = []) {
  const seen = new Set(existing.map(s => `${s.class_id}:${s.student_id}`));
  const errors = [];
  const students = rows.map((row, i) => {
    const s = {student_id: String(row.student_id ?? '').trim(), student_no: String(row.student_no ?? '').trim(), full_name: String(row.full_name ?? '').trim(), class_id: String(row.class_id ?? '').trim(), academic_year: String(row.academic_year ?? '').trim(), status: String(row.status || 'active')};
    if (!/^\d{1,13}$/.test(s.student_id) || !/^\d{1,3}$/.test(s.student_no) || !s.full_name || !s.class_id || !/^\d{4}$/.test(s.academic_year) || !['active','inactive'].includes(s.status)) errors.push(`แถว ${i+2}: ตรวจรหัส เลขที่ ชื่อ ห้อง ปีการศึกษา และสถานะ`);
    const key = `${s.class_id}:${s.student_id}`;
    if (seen.has(key)) errors.push(`แถว ${i+2}: รหัส ${s.student_id} ซ้ำในห้อง ${s.class_id}`);
    seen.add(key);
    return s;
  });
  if (!rows.length) errors.push('ไม่พบรายการนักเรียน');
  return {students, errors};
}
