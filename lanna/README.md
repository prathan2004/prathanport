# วันดีวันเสียล้านนา

เว็บไซต์รุ่นพร้อมอัปโหลดเป็นโฟลเดอร์ static ใช้บนโฮสต์ที่ให้บริการ HTML/JavaScript/CSS ได้ ไม่ต้องติดตั้ง Node.js หรือสั่ง build บนโฮสต์

## วิธีอัปโหลดที่แนะนำ

1. แตกไฟล์ `upload/lanna-upload.zip` จะได้โฟลเดอร์ `lanna`
2. อัปโหลดโฟลเดอร์นั้นไว้ใต้ web root เช่น `public_html/lanna`
3. เปิด `https://www.prathan.in.th/lanna/`

หรือคัดลอกโฟลเดอร์ `upload/lanna` ขึ้นโฮสต์โดยตรงก็ได้ โครงสร้างที่ต้องอยู่ครบคือ:

```text
lanna/
  index.html
  assets/
    template-<hash>.js
    template-<hash>.css
  favicon.svg
  og-image.png
```

ต้องอัปโหลดทั้ง `index.html` และ `assets` ของรุ่นเดียวกัน ไม่ต้องอัปโหลด `node_modules`, `src`, `public`, `template.html` หรือไฟล์ตั้งค่าพัฒนา ไม่จำเป็นต้องตั้ง rewrite สำหรับหน้าตรวจวันที่ เพราะแชร์วันที่ผ่าน query parameter เช่น `?date=2026-10-19`

ต้องเปิดผ่าน URL ของเว็บเซิร์ฟเวอร์ การดับเบิลคลิกไฟล์จากเครื่องเป็น `file://` ไม่ใช่วิธีเปิดที่รองรับ ปุ่มคัดลอก/แชร์ขึ้นอยู่กับ HTTPS และสิทธิ์เบราว์เซอร์ด้วย

## กรณีใช้ repository prathanport ทั้งเว็บ

`lanna/index.html`, `lanna/assets/`, `lanna/favicon.svg` และ `lanna/og-image.png` ใน repository เป็นไฟล์พร้อมใช้เช่นกัน จึง push โฟลเดอร์นี้พร้อมไฟล์ประกอบได้เลย ไม่ต้อง build บน Netlify

root `netlify.toml` ใช้ Publish directory `.` และ Build command ว่าง ยกเลิก rewrite ที่เคยชี้ไป `lanna/dist` แล้ว ให้ Netlify เสิร์ฟไฟล์ static จาก `lanna` โดยตรง คงกฎ API ของเว็บส่วนอื่นไว้ตามเดิม การเปลี่ยนไฟล์ในเครื่องยังไม่เปลี่ยนเว็บจริงจนกว่า push/deploy หรืออัปโหลดเสร็จ

ถ้าใช้ Netlify manual deploy สำหรับเว็บหลัก ให้ส่งโฟลเดอร์ที่มี `lanna` อยู่ข้างใน หากต้องการให้แอปเป็นหน้าแรกของเว็บไซต์ใหม่ ให้ส่งเนื้อหาภายใน `upload/lanna` เป็น root แทน (หรือใช้ `lanna-netlify.zip`) ไม่ต้องสั่ง build

## สำหรับแก้ไขโค้ดในอนาคต

ไฟล์ต้นฉบับ HTML อยู่ที่ **`template.html`** ไม่แก้ `index.html` โดยตรง เพราะ `index.html` เป็นผลลัพธ์จาก build

ใช้ Node.js 24 เปิด terminal ในโฟลเดอร์โปรเจกต์ `lanna`:

```sh
npm ci
npm run dev
npm run test
npm run build
```

PowerShell ที่ไม่อนุญาต `npm.ps1` ใช้ `npm.cmd` แทนได้ ไม่ต้องเปลี่ยน execution policy

`npm run build` ทำงานเฉพาะบนเครื่องพัฒนา โดยจะสร้าง/อัปเดต:

- `dist/` สำหรับ preview
- `index.html`, `assets/`, favicon และภาพแชร์ในโฟลเดอร์โปรเจกต์ เพื่อให้ repository เปิดเป็นเว็บ static ได้
- `upload/lanna/` เฉพาะไฟล์พร้อมอัปโหลด
- `upload/lanna-upload.zip` มีโฟลเดอร์ `lanna` อยู่ด้านใน
- `lanna-netlify.zip` มีไฟล์หน้าเว็บอยู่ที่ root ของ ZIP สำหรับ standalone deploy

`src/components` แยก UI; `src/lib` แยก logic; `src/data` เก็บหลักฐานปฏิทิน; `src/tests` เก็บชุดทดสอบ การแก้ไขต้นฉบับต้อง build ใหม่และอัปโหลดไฟล์ชุดใหม่พร้อมกัน

## ฟังก์ชันและขอบเขตข้อมูล

เลือกวัน/เดือน/ปี พ.ศ. หรือ Date Picker, ปุ่มวันนี้ตาม Asia/Bangkok, ผลตรวจสามส่วน, คัดลอก/แชร์ผล, URL ระบุวันที่, โหมดมืด, FAQ และแหล่งอ้างอิง รองรับมือถือ คีย์บอร์ด และ reduced motion

- วันเสีย: ตรวจยืนยันจากภาพปฏิทินปากเล้มเชียงใหม่ **1–31 ตุลาคม 2569** เท่านั้น
- วันที่นอกช่วงเลือกได้ แต่แสดง “ยังไม่สามารถยืนยันเดือนล้านนา” ไม่เดาจากเดือนสากล
- ฟ้าตี๋แส่ง: ยึดงานวิจัย มช. บทที่ 3 ตรวจภาพตัวคูณ 4 และเกณฑ์เดือนครบแล้ว แต่ยังรอหลักฐานนิยามติถี/เดือนซ้ำและตัวอย่างตรวจรับ จึงไม่แสดงเศษหรือคำตัดสินรายวัน
- ไม่ตรงวันเสียไม่ได้หมายถึงเป็นวันมงคล เป็นคติความเชื่อ ไม่ใช่ผลในชีวิตที่พิสูจน์ทางวิทยาศาสตร์

ดูที่มาและการอนุมัติใน `CALCULATION_RULES.md` การเปลี่ยนรูปแบบส่งมอบไม่ได้ขยายช่วงข้อมูลปฏิทิน

## การตรวจสอบ

Build ผ่าน; unit tests **63 passed, 1 todo** (todo รอหลักฐานฟ้าตี๋แส่ง ไม่ถือว่าผ่าน) ตรวจใน Chrome โดยเปิดจากเซิร์ฟเวอร์ static ใต้ `/lanna/` โดยไม่มี Vite หรือ rewrite แล้ว รวมถึงทดสอบลิงก์วันที่และการเปลี่ยนวันที่

ไม่มี backend, database, login, analytics, API key หรือการบันทึกวันที่ลง Local Storage วันที่ใน URL อาจอยู่ในประวัติเบราว์เซอร์และ access logs ของโฮสต์ ฟอนต์โหลดจาก Google Fonts และมี system font สำรอง

ภาพ Open Graph ใช้ URL `https://www.prathan.in.th/lanna/og-image.png` หากเปลี่ยนโดเมนหรือชื่อโฟลเดอร์ ให้แก้ metadata ใน `template.html` แล้ว build ใหม่ การทำงานของแอปและ assets ใช้พาธ relative จึงไม่ผูกกับชื่อโฟลเดอร์นี้