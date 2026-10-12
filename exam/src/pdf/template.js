export const TEMPLATE_VERSION = 'sec-a4-v1';
export const CHOICES = ['ก', 'ข', 'ค', 'ง', 'จ'];
export const PAGE = { width: 595.28, height: 841.89 };
export function createTemplate(count, idDigits = 8, noDigits = 2) {
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('จำนวนข้อต้องอยู่ระหว่าง 1–200');
  if (![6, 8, 10, 13].includes(idDigits) || ![2, 3].includes(noDigits)) throw new Error('จำนวนหลักไม่ถูกต้อง');
  const pages = [];
  for (let offset = 0; offset < count; offset += 100) {
    const questions = Array.from({ length: Math.min(100, count - offset) }, (_, i) => ({
      number: offset + i + 1,
      labelX:  forty(i),
      y: 397 - (i % 25) * 12,
      bubbles: CHOICES.map((choice, j) => ({ choice, x: forty(i) + 26 + j * 17, y: 397 - (i % 25) * 12, radius: 4.5 })),
    }));
    const digitGrid = (digits, startX) => Array.from({ length: digits }, (_, column) => ({column, bubbles: Array.from({length: 10}, (_, digit) => ({digit, x: startX + column * 21, y: 650 - digit * 14, radius: 4.5}))}));
    pages.push({page: pages.length + 1, questions, studentId: digitGrid(idDigits, 51), studentNo: digitGrid(noDigits, 390), marks: [{x:25,y:25},{x:570.28,y:25},{x:25,y:816.89},{x:570.28,y:816.89}]});
  }
  return { version: TEMPLATE_VERSION, ...PAGE, idDigits, noDigits, pages };
}
function forty(i) { return 40 + Math.floor(i / 25) * 132; }
