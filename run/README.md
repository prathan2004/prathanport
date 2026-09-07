# Mhahao run

เว็บบันทึกระยะวิ่งพร้อมระบบสมัครบัญชี, login, บันทึก/แก้ไข/ลบระยะวิ่ง, leaderboard และ export/import JSON โดยไม่มีระบบอัปโหลดรูปภาพ

## การเก็บข้อมูลออนไลน์

เวอร์ชันนี้เก็บข้อมูลออนไลน์บน Netlify ด้วย:

- Netlify Functions: รับ API ที่ `/api/...`
- Netlify Blobs: เก็บข้อมูลแบบ key/value ใน store ชื่อ `mhahao-run`
- Users: เก็บที่ `users/{userId}.json`
- Sessions: เก็บที่ `sessions/{token}.json`
- Runs: เก็บที่ `runs/{runId}.json`

ข้อดีคือไม่ต้องใช้ Database และไม่ต้องทำ migration แต่ผู้ใช้หลายคนจะเห็น leaderboard และข้อมูลระยะทางร่วมกันผ่าน API เดียวกัน

## วิธี deploy บน Netlify สำหรับใช้งานที่ `/run/`

1. ตั้งค่า Base directory เป็นค่าว่าง เพราะต้อง deploy จาก root ของ `prathanport`
2. Build command ใช้ `npm run build`
3. Publish directory ใช้ `.`
4. Netlify จะติดตั้ง dependency `@netlify/blobs` จาก `package.json`

หลัง deploy แล้วระบบจะเริ่มจากข้อมูลว่าง ให้สมัครบัญชีใหม่ได้เลย

## หมายเหตุ

Netlify Blobs เหมาะกับข้อมูลที่อ่านบ่อยและเขียนไม่หนักมาก แต่ไม่ใช่ relational database หากในอนาคตมีผู้ใช้จำนวนมากหรือมีเงื่อนไขค้นหาซับซ้อน ควรพิจารณา database จริง เช่น Neon, Supabase หรือ Turso
