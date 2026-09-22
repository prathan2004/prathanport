# ระบบจัดทำบันทึกข้อความอิเล็กทรอนิกส์

เว็บแอป HTML/CSS/Vanilla JavaScript สำหรับจัดทำบันทึกข้อความภาษาไทย มี Supabase Auth, เอกสารส่วนตัว, ลายเซ็น และ PDF A4

## ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [Supabase](https://supabase.com/dashboard) และรอให้ฐานข้อมูลพร้อม
2. เปิด SQL Editor แล้วรัน `sql/schema.sql` ตามด้วย `sql/rls.sql` (ไฟล์หลังสร้าง private Storage buckets และ policies ด้วย)
3. ใน Authentication > Providers เปิด Email/Password จากนั้นสร้างผู้ใช้ใน Authentication > Users หรือเปิด email sign-up ตามนโยบายหน่วยงาน แอปนี้มีหน้า login แต่ไม่มีหน้าสมัครสมาชิกสาธารณะ
4. ไปที่ Project Settings > API คัดลอก Project URL และ publishable key (หรือ legacy anon key) ใส่ใน `js/config.js` ห้ามใส่ service_role/secret key
5. ใช้ Storage ตรวจสอบว่ามี bucket `signatures` และ `documents` แบบ private ตาม SQL แล้ว

RLS จำกัดข้อมูลทุกตารางตาม `auth.uid()` และ Storage จำกัดพาธแรกให้เป็น user ID ของผู้ใช้เอง ตัวแอปบันทึกไฟล์เป็น `signatures/{user_id}/{filename}` และ `documents/{user_id}/{document_id}/{filename}` โดยชื่อ bucket ไม่ใช่ส่วนหนึ่งของ object path

## เปิดใช้งานในเครื่อง

จากโฟลเดอร์ `newdoc` รัน `node server.cjs` แล้วเปิด `http://localhost:8765/login.html` (หรือกำหนดพอร์ตผ่านตัวแปร `PORT`) ต้องใช้ HTTP server เพราะ JavaScript modules ไม่ทำงานผ่าน `file://` ทุกหน้าโหลดไลบรารีผ่าน CDN จึงต้องเชื่อมต่ออินเทอร์เน็ต

## Deploy

ตั้ง publish directory เป็น `newdoc` สำหรับ Netlify หรือ Vercel แบบ static site ไม่ต้องตั้ง build command เพิ่ม URL และ key ใน `js/config.js` ก่อน deploy และเพิ่ม URL ที่ deploy ใน Supabase Authentication > URL Configuration > Site URL / Redirect URLs ตามที่ใช้

## หมายเหตุ

- PDF สร้างจาก DOM ของพรีวิวด้วย html2pdf/html2canvas จึงได้ A4 แบบภาพภายใน PDF ภาษาไทยจะไม่แตกจากการฝังฟอนต์ผิด แต่ข้อความใน PDF อาจเลือกหรือค้นหาไม่ได้
- พรีวิวเป็นกระดาษ A4 หน้าแรก เมื่อเนื้อหายาว PDF จะแบ่งหลายหน้าและใส่เลขหน้า ควรเปิดตรวจไฟล์ก่อนส่งเอกสารทางราชการ โดยเฉพาะเอกสารที่มีเนื้อหาหรือรายการยาว
- UI และพรีวิวใช้ฟอนต์ Sarabun จาก Google Fonts ถ้าต้องใช้ TH Sarabun New จริง ให้จัดหาไฟล์ฟอนต์ที่มีสิทธิ์ใช้งานและเพิ่ม `@font-face` ใน CSS
- ระบบนี้ยังไม่ได้เชื่อมโครงการ Supabase จริง จนกว่าจะใส่ URL/key และรัน SQL ด้วยบัญชีของคุณ
