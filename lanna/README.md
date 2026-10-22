# วันดีวันเสียล้านนา

เว็บภาษาไทยสไตล์ Modern Lanna Minimal สร้างด้วย React, TypeScript, Vite, Tailwind CSS, Lucide React, date-fns และ Vitest ไม่มี Backend ฐานข้อมูล หรือระบบสมาชิก

## สถานะรุ่นนี้

สร้างและใช้งานหน้าเว็บได้จริง พร้อม build สำหรับ Netlify แต่ขอบเขตการคำนวณยังจำกัดตามหลักฐาน:

- วันเสีย: มีข้อมูลปากเล้มเชียงใหม่ **1–31 ตุลาคม 2569** ตรวจภาพตารางจาก มทร.ล้านนา หน้าไฟล์ 24 แล้ว
- วันที่นอกช่วงยังเลือกได้ แต่แสดง “ยังไม่สามารถยืนยันเดือนล้านนา” ไม่มีการเดาจากเดือนสากล
- ฟ้าตี๋แส่ง: ยึดงานวิจัย มช. บทที่ 3 ตามที่ผู้ว่าจ้างเลือก ตรวจภาพตัวคูณ 4 และเกณฑ์เดือนครบแล้ว แต่ยังแสดง “รอการยืนยันหลักการคำนวณ” เพราะยังขาดหลักฐานนิยามติถี/การนับเดือนซ้ำและตัวอย่างตรวจรับ
- ไม่ตีความ “ไม่ตรงวันเสีย” ว่าเป็นวันมงคล ไม่ทำนายผลในชีวิต

ดูหลักฐาน การอนุมัติ และข้อจำกัดใน [CALCULATION_RULES.md](./CALCULATION_RULES.md)

## รันบนเครื่อง

ใช้ Node.js 24 และ npm เปิดเทอร์มินัลในโฟลเดอร์ `lanna`:

```sh
npm ci
npm run dev
```

เปิด URL ที่ Vite แสดง ตัวอย่าง `http://127.0.0.1:5173/` หาก PowerShell ปฏิเสธ `npm.ps1` ให้ใช้ `npm.cmd` แทน `npm` ไม่จำเป็นต้องเปลี่ยน execution policy

```sh
npm run test
npm run build
npm run preview
```

`dist/` คือไฟล์สำหรับเผยแพร่ ต้องเปิดผ่าน HTTP server ไม่ใช่ดับเบิลคลิก `index.html`

## ฟังก์ชัน

เลือกวัน/เดือน/ปี พ.ศ. หรือ Date Picker, ปุ่มวันนี้ตาม Asia/Bangkok, ผลตรวจสามส่วน, ลิงก์แชร์ `?date=2026-10-19`, คัดลอกผล, Web Share API (ถ้าไม่รองรับใช้คัดลอกแทน), โหมดมืด, ตารางเกณฑ์วันเสีย, FAQ และแหล่งอ้างอิง

มีสถานะเริ่มต้น กำลังตรวจสอบ วันที่ผิด และข้อมูลไม่ครบ รองรับคีย์บอร์ด focus indicator, skip link และ reduced motion การแชร์/คัดลอกต้องอาศัยสิทธิ์และความสามารถของเบราว์เซอร์; หากถูกปฏิเสธมีข้อความแจ้งให้คัดลอก URL เอง

## ทดสอบ

ผลตรวจล่าสุด: **63 passed, 1 todo** ใน 4 ไฟล์ กรณี todo เป็นผลฟ้าตี๋แส่งที่ยังขาดตัวอย่างอ้างอิง ไม่ได้นับว่าผ่าน

- กฎวันเสียทั้ง 12 เดือน มีวันเสียและวันที่ไม่เสีย 24 กรณี
- หลักฐานปฏิทินรายวัน ขอบเขตเปลี่ยนเดือน ข้างขึ้น/แรม และ 19 ตุลาคม 2569
- ปี พ.ศ./ค.ศ. วันอธิกสุรทิน วันที่ผิด และเวลาเปลี่ยนวันในกรุงเทพฯ
- การสรุปผลสอดคล้อง/ขัดแย้ง/ข้อมูลไม่ครบ
- ทดสอบผ่าน Chrome จริงที่ desktop และขนาดมือถือ 390px; ยังไม่ได้ทดสอบบน Firefox, Safari หรือ Edge จริง

ชุดทดสอบกฎตามที่อนุมัติไม่ใช่การพิสูจน์สูตรดาราศาสตร์หรือการรับรองตำราทุกสำนัก ไม่มีการแสดงผลฟ้าตี๋แส่งจำลองเป็นผลจริง

## Deploy ผ่าน Netlify

### เว็บหลัก prathan.in.th/lanna/ (ตั้งค่าแล้ว)

กรณีเผยแพร่ทั้ง repository `prathanport` เป็นเว็บหลัก ให้ใช้ Base directory ว่าง, Package directory ว่าง, Build command `npm run build`, Publish directory `.` และ config `netlify.toml` ที่ root

root build จะติดตั้ง dependency และ build แอป `lanna` อัตโนมัติ root Netlify config จะ rewrite `/lanna/` ไปยัง `/lanna/dist/index.html` และไฟล์ประกอบไปยัง `/lanna/dist/` โดยคง URL ของผู้ใช้ไว้ กฎ force จำเป็นเพื่อให้ใช้ HTML ที่ build แล้วแทน source `lanna/index.html` ส่วน Vite ใช้ base `./` เพื่อโหลด assets ผ่าน `/lanna/assets/` ได้

หลัง commit/push การแก้ไข ต้องรอ Netlify deploy สำเร็จ การแก้ไฟล์บนเครื่องยังไม่เปลี่ยนเว็บจริง ห้ามอัปโหลด source `lanna/index.html` อย่างเดียว เพราะอ้างถึง TypeScript ที่ต้องผ่าน Vite build ก่อน

### เชื่อม GitHub

หัวข้อนี้ใช้สำหรับสร้าง Netlify project แยกให้แอป `lanna` เป็นหน้า root ของเว็บใหม่ ไม่ใช่การตั้งค่าของเว็บหลักด้านบน

1. นำโค้ดขึ้น repository ของคุณ แล้วสร้าง Netlify project จาก repository นั้น
2. หากใช้ repository `prathanport` ให้ตั้ง **Base directory: `lanna`** และ **Package directory: `lanna`** เพื่อเลือก config และ build ของเว็บนี้แทนเว็บอื่นที่ root
3. Build command: `npm run build`
4. Publish directory: `dist` (สัมพันธ์กับ base directory `lanna`)
5. ใช้ Node.js 24 ตาม `netlify.toml` และสั่ง Deploy

หากแยก `lanna` เป็น repository ใหม่ ให้เว้น Base directory ว่าง ใช้ build/publish เดิม ไฟล์ `netlify.toml` และ `public/_redirects` รองรับ SPA และเปิดลิงก์วันที่โดยตรง

อ้างอิงการตั้งค่าโฟลเดอร์จาก [Netlify Monorepos](https://docs.netlify.com/build/configure-builds/monorepos/) และ [File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/)

### อัปโหลดด้วยตนเอง

รัน `npm ci` และ `npm run build` แล้วลากโฟลเดอร์ `lanna/dist` เข้า Netlify manual deploy ไฟล์ `_redirects` จะถูกคัดลอกอยู่ใน build แล้ว

ยังไม่มีการ deploy หรือ push GitHub จากงานนี้ การ build สำเร็จไม่ได้หมายความว่าครอบคลุมข้อมูลปฏิทินทุกวัน ควรรักษาข้อความขอบเขตข้อมูลไว้เมื่อเผยแพร่

### Metadata สำหรับโดเมนจริง

มี SEO, Open Graph, ภาพ PNG 1200×630 และ favicon แล้ว หลังทราบโดเมนจริงควรตั้ง canonical และ `og:url` เป็น URL ของเว็บนั้น และเปลี่ยน `og:image` จาก path `/og-image.png` เป็น URL absolute ของโดเมนจริงเพื่อให้ social crawler อ่านได้สม่ำเสมอ

## โครงสร้าง

```text
src/components/       ส่วนแสดงผลและเลือกวันที่
src/data/             รายการปฏิทินที่ตรวจแล้ว ชื่อเดือน ขอบเขตและแหล่งอ้างอิง
src/lib/              จัดการวันที่ ค้นปฏิทิน กฎวันเสีย สถานะฟ้าตี๋แส่ง และสรุป
src/tests/            กฎที่อนุมัติและกรณีอ้างอิง/รออ้างอิง
public/               favicon, Open Graph image และ SPA redirects
```

เพิ่มช่วงข้อมูลใหม่ที่ `src/data/calendarDays.ts` โดยแต่ละวันต้องมีเดือน/ค่ำ/ระบบ/ครั้งของเดือน/จุลศักราช/แหล่งอ้างอิง/เลขหน้าและสถานะตรวจรับ จากนั้นเพิ่ม fixtures ที่อ่านแยกจากหลักฐานต้นฉบับ ปรับ coverage ให้ตรงช่วงข้อมูลจริงและอัปเดตข้อความบนเว็บ ห้ามขยายช่วงโดยคำนวณต่อจากวันที่สุดท้ายเอง

## ความเป็นส่วนตัวและ dependencies

ไม่มี API key, secrets, cookies ของแอป, analytics หรือการบันทึกวันที่ลงฐานข้อมูล/Local Storage วันที่ใน URL อาจถูกเก็บในประวัติเบราว์เซอร์หรือ access logs ของผู้ให้บริการโฮสติ้งตามปกติ ฟอนต์โหลดจาก Google Fonts และมี fallback system font หากโหลดไม่ได้

ติดตั้ง dependencies จาก lockfile; `npm audit` หลังปรับ Vitest รายงาน 0 vulnerabilities ณ รอบตรวจนี้ ไม่ติดตั้งเครื่องมือวิจัย PDF ชั่วคราวเป็น dependency ของเว็บ
