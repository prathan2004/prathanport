# Smart Exam Checker

ระบบภาษาไทยสำหรับ Phase 1–2: จัดการรายวิชา/ห้อง นักเรียน ชุดข้อสอบ เฉลย และสร้างกระดาษคำตอบ A4 PDF ในเครื่อง ไม่มีข้อมูลตัวอย่างในฐานข้อมูลเริ่มต้น

## เปิดบน Windows

ติดตั้ง Node.js 22 หรือใหม่กว่า แล้วเปิด PowerShell:

```powershell
cd C:\Users\User\Documents\GitHub\prathanport\exam
npm.cmd install
npm.cmd run dev
```

เปิด URL ที่ Vite แสดง ปกติคือ http://localhost:5173 หากพอร์ตถูกใช้ ให้รัน `npm.cmd run dev -- --port 5174` ใช้ `npm.cmd` เพื่อหลีกเลี่ยง PowerShell execution policy โดยไม่ต้องแก้ policy

```powershell
npm.cmd test
npm.cmd run build
```

ทดสอบ workflow ผ่าน Microsoft Edge ที่ติดตั้งใน Windows (เปิด dev server ก่อน): `node tests/browser.mjs` ผล PDF และภาพหน้าจออยู่ใน `qa/` ซึ่งไม่เข้า git ทดสอบการ render PDF และถอด QR ด้วย `node tests/pdf-browser.mjs` หลัง workflow test

SheetJS ใช้แพ็กเกจ 0.20.3 จาก [แหล่งติดตั้งทางการ](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) แทนรุ่นเก่าบน npm

## Deploy บน Netlify

### ใช้ในเว็บ prathanport เดิมที่ /exam/

โปรเจกต์นี้เตรียมไฟล์พร้อมใช้ไว้ใน `exam/index.html`, `exam/assets/` และ `exam/fonts/` แล้ว เปิดบนเว็บเดิมได้ที่ `https://ชื่อเว็บ.netlify.app/exam/`

เมื่อแก้โค้ด ให้รัน `npm.cmd run build` ในโฟลเดอร์ `exam` คำสั่งนี้ build ลง `dist` และคัดลอกไฟล์พร้อมใช้กลับมาไว้ใน `exam` อัตโนมัติ แก้หน้า HTML ต้นฉบับใน `source.html` ไม่ใช่ `index.html` ซึ่งเป็นผลจาก build

สำหรับอัปโหลดเว็บเดิมด้วยตนเอง ให้รวมโฟลเดอร์ `exam` ที่มีไฟล์พร้อมใช้เข้ากับไฟล์เว็บ `prathanport` ทั้งชุด แล้วอัปโหลดทั้งชุดในหน้า Deploys ของ site เดิม การ deploy ใหม่แทนที่ไฟล์ทั้งเว็บไซต์ ไม่ใช่เพิ่มโฟลเดอร์ลงใน deployment เก่า จึงอย่าอัปโหลดเฉพาะ `exam` ไปทับเว็บเดิม

ไฟล์จำเป็นของแอปที่ต้องอยู่ในชุดอัปโหลดคือ `exam/index.html`, `exam/assets/`, `exam/fonts/` ไม่ต้องนำ `exam/node_modules`, `.npm-cache`, `qa`, `src`, `tests` หรือไฟล์สำหรับพัฒนาไปด้วย

สำหรับเว็บเดิมที่เชื่อม GitHub ให้ commit/push ไฟล์พร้อมใช้ทั้งสามรายการข้างต้นไปพร้อม source โดยคงค่า publish ของ `prathanport/netlify.toml` เป็น `.` และไม่เปลี่ยน base/package directory เป็น `exam` ไฟล์ `exam/netlify.toml` ใช้เฉพาะกรณีสร้าง site แยก

ตรวจการใช้งานแบบ static ใต้ `/exam/` หลัง build ด้วย `node tests/static.mjs` (ต้องมี Microsoft Edge)

### อัปโหลดด้วยตนเอง

ส่วนนี้เป็นวิธีสร้าง site แยก ไม่ใช่เพิ่มแอปที่ `/exam/` ในเว็บเดิม

รันจากโฟลเดอร์ `exam`:

```powershell
npm.cmd install
npm.cmd run build
```

ลากโฟลเดอร์ `exam/dist` ไปที่ https://app.netlify.com/drop หรือพื้นที่อัปโหลดในหน้า Deploys ของเว็บที่ต้องการ เว็บพร้อมใช้งานบน URL ที่ Netlify ให้ทันที ไม่ต้องอัปโหลด `src`, `node_modules` หรือทั้งโฟลเดอร์ `exam` เพราะการอัปโหลดเองไม่มีขั้นตอน build บน Netlify เมื่อแก้โค้ด ต้อง build และอัปโหลด `dist` ใหม่

### เชื่อม GitHub

สร้าง Netlify site แยกสำหรับแอปนี้ เลือก repository `prathanport` และตั้งค่า:

- Base directory: `exam`
- Package directory: `exam` (หากมีช่องนี้)
- Build command: `npm run build`
- Publish directory: `dist` (relative to base directory)

ไฟล์ `exam/netlify.toml` กำหนด build และ Node.js ไว้แล้ว การเลือก package directory ให้ตรงจะใช้ config ของแอปนี้ แทน config ของเว็บไซต์หลักที่ root หลัง commit/push Netlify จะ build และ deploy ให้ ไม่ต้องแก้ `prathanport/netlify.toml` เพื่อสร้าง site แยก

`vite.config.js` ใช้ `base: './'` อยู่แล้ว และ build จะรวม JavaScript, CSS และฟอนต์ไทยใน `dist` จึงไม่ต้องใช้ Vite server บน Netlify แอปเปลี่ยนหน้าภายในด้วย JavaScript โดยไม่เปลี่ยน URL จึงไม่ต้องเพิ่ม SPA redirect

ข้อมูลยังเก็บใน browser ของแต่ละอุปกรณ์ ไม่ได้กลายเป็นฐานข้อมูลออนไลน์เมื่อ deploy การย้ายจาก localhost ไป URL Netlify ต้องดาวน์โหลดสำรอง JSON จาก localhost แล้วกู้คืนบนเว็บใหม่ หากต้องการให้ครูหลายคนใช้ข้อมูลร่วมกัน ต้องทำ backend ใน Phase 4

เอกสารทางการ: [Manual deploy](https://docs.netlify.com/deploy/create-deploys/) และ [Monorepo settings](https://docs.netlify.com/build/configure-builds/monorepos/)

## การใช้งาน

1. เพิ่มรายวิชา รหัส ห้อง ปีการศึกษา และภาคเรียน
2. เพิ่มนักเรียน หรือดาวน์โหลดแบบฟอร์ม Excel แล้วนำเข้า Excel/CSV ระบบแสดงรายการและข้อผิดพลาดก่อนยืนยัน ไม่ยอมรับรหัสซ้ำในห้องเดียวกัน
3. สร้างข้อสอบชุด A–D กำหนด 1–200 ข้อ คะแนนต่อข้อ คะแนนผ่าน รหัส 6/8/10/13 หลัก และเลขที่ 2/3 หลัก
4. กรอกเฉลย ก ข ค ง จ หรือใช้ Excel/CSV คอลัมน์ `question,answer` บันทึก แล้วตรวจสอบเฉลยและยืนยันเปิดใช้งาน
5. ดาวน์โหลด PDF ทั่วไป หรือ PDF รายบุคคลรวมทั้งห้อง/รายคน พิมพ์ A4 ขนาดจริง 100% ห้าม fit-to-page
6. สำรอง JSON จากหน้าตั้งค่าเป็นระยะ ข้อมูลอยู่ใน localStorage ของ browser/origin นี้ การเปลี่ยนพอร์ต/ล้าง browser ไม่ได้ย้ายข้อมูลให้อัตโนมัติ

ไฟล์นักเรียนใช้คอลัมน์ `student_id,student_no,full_name,class_id,academic_year,status` (`active`/`inactive`) รหัสต้องเป็นข้อความใน Excel เพื่อรักษาศูนย์นำหน้า หาก Excel ลบศูนย์ไปก่อนนำเข้า ระบบไม่สามารถรู้จำนวนศูนย์เดิมได้

PDF รายบุคคลเลือกเฉพาะนักเรียน active ของห้องและปีการศึกษาของรายวิชา รหัสที่สั้นกว่าจำนวนหลักจะเติมศูนย์ด้านหน้า ข้อมูลชื่อพิมพ์บนกระดาษ แต่ QR ไม่มีชื่อหรือรหัสนักเรียน มีเฉพาะ template version, exam ID, random sheet ID, page และ answer key version นักเรียนต้องฝนรหัสและเลขที่เองหากต้องการอ่านช่องฝนใน Phase 3

## โครงสร้าง

- `src/main.js`: หน้าจอ dashboard และ CRUD, ตรวจเฉลย, นำเข้าและสำรองข้อมูล
- `src/services/data.js`: local data service และ validation
- `src/services/import.js`: Excel/CSV
- `src/pdf/template.js`: พิกัด PDF/OMR ร่วมกัน หน่วย point จุดกำเนิดมุมซ้ายล่าง
- `src/pdf/generate.js`: pdf-lib, ฟอนต์ไทย และ QR
- `public/fonts/Sarabun-Regular.ttf`: ฟอนต์ THSarabunNew จาก assets ของโปรเจกต์เดิม
- `tests/template.test.js`: ตรวจ A4, ขอบเขต/ช่องซ้ำ, ลำดับข้อ, กริดตัวเลข, หลายหน้า และศูนย์นำหน้า
- `apps-script/SCHEMA.md`: แนวทางฐานข้อมูลและการติดตั้ง backend ใน Phase 4

แม่แบบ `sec-a4-v1` มี 100 ข้อต่อหน้า (4 คอลัมน์ × 25 แถว), วงกลมรัศมี 4.5 point และ registration marks สี่มุม 10 × 10 point ห้ามแก้แม่แบบโดยไม่เปลี่ยน version OMR ต้องแปลงพิกัดแกน Y ระหว่าง PDF กับภาพ

## ขอบเขตปัจจุบัน

ยังไม่มี login ครู, backend, กล้อง/OMR, คะแนน/รายงาน, PWA offline หรือ deployment ข้อมูล local ไม่ใช่ระบบสิทธิ์หลายครูและไม่เข้ารหัส ไม่ควรใช้เป็นฐานข้อมูลกลางของโรงเรียน เฉลยมีประวัติเวอร์ชันในข้อมูลสำรอง การแก้จำนวนข้อ/คะแนน/แม่แบบจะยกเลิกการอนุมัติเดิม

ทดสอบพิกัดด้วย automated tests ได้ แต่ยังไม่ได้ทดสอบเครื่องพิมพ์จริงหรือภาพถ่ายบนโทรศัพท์ จึงยังไม่มีผล accuracy ของ OMR

## Phase ถัดไป

Phase 3: OpenCV.js + jsQR, registration/perspective, อ่านช่องฝนและ QR, confidence/review, synthetic ground truth tests ตามแสง/เงา/เอียง ห้ามเดาคำตอบเมื่อไม่มั่นใจ

Phase 4: authentication, authorization ต่อครู, Google Apps Script/Sheets/Drive, validation ฝั่ง server, LockService และ audit trail

Phase 5: รายงาน/ส่งออก คะแนน, PWA, ทดสอบโทรศัพท์/เครื่องพิมพ์ และ Firebase Hosting (`dist` เป็น public directory, ไม่เปิด SPA rewrite ทับเว็บไซต์อื่นใน repo)
