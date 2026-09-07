# Run Club Tracker

เว็บนี้เป็น static site สำหรับ Netlify มีระบบสมัครบัญชี, login, บันทึกการวิ่ง, แก้ไข/ลบรายการ, leaderboard และ export/import ข้อมูล JSON โดยไม่มีระบบอัปโหลดรูปภาพ

## วิธีเก็บข้อมูลในเวอร์ชันนี้

ไฟล์ `app.js` เก็บข้อมูลไว้ใน `localStorage` ของเบราว์เซอร์ผู้ใช้ จึงไม่ต้องใช้ Database และ deploy บน Netlify แบบ static ได้ทันที

ข้อจำกัดคือข้อมูลจะอยู่เฉพาะเครื่องและเบราว์เซอร์นั้น ๆ ผู้ใช้คนอื่นจะไม่เห็นข้อมูลเดียวกัน เว้นแต่จะ export/import ไฟล์ JSON เอง

บัญชีเริ่มต้นสำหรับทดสอบ:

- Username: `admin`
- Password: เว้นว่าง

## ถ้าต้องการข้อมูลกลางบน Netlify โดยไม่ใช้ Database

ตัวเลือกที่เหมาะสุดคือ Netlify Functions + Netlify Blobs

- Netlify Functions ทำหน้าที่เป็น API สำหรับ signup, login, บันทึก, แก้ไข และลบการวิ่ง
- Netlify Blobs เก็บข้อมูลเป็น key/value หรือไฟล์ JSON เช่น `users.json`, `runs.json`, `sessions.json`
- ไม่ต้อง provision database, ไม่มี migrations และอยู่ในระบบของ Netlify

ข้อควรระวัง: Netlify Blobs เหมาะกับงานอ่านบ่อย เขียนไม่ถี่มาก และการเขียน key เดียวกันพร้อมกันจะเป็นแบบ last write wins ถ้าคนใช้เยอะควรแยก key ต่อรายการ เช่น `runs/{runId}.json` เพื่อลดปัญหาข้อมูลชนกัน

Netlify Forms เหมาะกับการรับ submission แบบฟอร์มและดูในแผง Netlify แต่ไม่เหมาะกับ login/dashboard ที่ต้องอ่านข้อมูลกลับมาแบบ realtime ให้ผู้ใช้ทั่วไป
