import type { Result } from './wanSia';
export function summarize(a:Result,b:Result) {
 if(a.verdict==='pending' && b.verdict==='pending') return {title:'ยังมีข้อมูลไม่เพียงพอที่จะสรุป', explanation:'ทั้งสองวิธียังไม่พร้อมให้ผลสำหรับวันที่เลือก กรุณาดูสถานะและขอบเขตข้อมูลของแต่ละวิธี'};
 if(a.verdict==='pending'||b.verdict==='pending') return {title:'ตรวจสอบได้เพียงหนึ่งวิธี', explanation:'มีผลจากเกณฑ์เดียว จึงยังไม่สามารถเปรียบเทียบทั้งสองวิธี หรือสรุปว่าเป็นวันมงคลได้'};
 if(a.verdict!==b.verdict) return {title:'ทั้งสองวิธีให้ผลแตกต่างกัน', explanation:'ควรอ่านหลักการของแต่ละวิธีประกอบกัน ระบบไม่ตัดสินแทนว่าเกณฑ์ใดสำคัญกว่า'};
 return {title:'ทั้งสองวิธีให้ผลสอดคล้องกัน', explanation:a.verdict==='bad'?'ทั้งสองเกณฑ์จัดอยู่ในกลุ่มวันที่ควรหลีกเลี่ยงตามความเชื่อ':'ไม่เข้าเกณฑ์วันเสียของทั้งสองวิธี ไม่ได้หมายถึงวันมงคลโดยอัตโนมัติ'};
}
