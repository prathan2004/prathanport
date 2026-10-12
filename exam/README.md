# Smart Exam Checker — ระบบตรวจข้อสอบอัจฉริยะ

เว็บ HTML/CSS/Vanilla JavaScript แบบ static สำหรับสร้างกระดาษคำตอบ A4 ตรวจรอยฝนด้วย OpenCV.js ตรวจทาน/แก้คำตอบ บันทึกคะแนนใน IndexedDB และส่งออกผล ไม่ต้องมี backend ฐานข้อมูลออนไลน์ บัญชีสมาชิก API key หรือขั้นตอน build

## เปิดใช้งาน

ไฟล์เว็บพร้อมใช้คือ `index.html`, `css/`, `js/` และ `assets/` ไลบรารีและฟอนต์มีอยู่ใน `assets` แล้ว ไม่ต้องติดตั้ง npm บน Netlify

เปิดในเครื่องผ่าน HTTP server เพื่อให้ ES Modules ทำงาน ไม่ใช่ double-click HTML:

```powershell
cd C:\Users\User\Documents\GitHub\prathanport\exam
node tools/serve.mjs
```

เปิด http://localhost:5173/exam/ ถ้าพอร์ตถูกใช้:

```powershell
$env:PORT = '5174'
node tools/serve.mjs
```

กล้องใช้ได้ผ่าน HTTPS หรือ localhost เท่านั้น อุปกรณ์ต้องอนุญาต camera access หากเปิดกล้องไม่ได้ ยังเลือก JPG/PNG/WebP จากเครื่องได้ รองรับไฟล์ไม่เกิน 25 MB

## Deploy ในเว็บ prathanport เดิม

1. ใส่โฟลเดอร์ `exam` ลงในชุดไฟล์เว็บไซต์ `prathanport` โดย `exam/index.html`, `exam/css/`, `exam/js/`, `exam/assets/` ต้องครบ
2. อัปโหลดชุดไฟล์ **prathanport ทั้งเว็บ** ไปหน้า Deploys ของ Netlify site เดิม ไม่ใช่เฉพาะ exam เพราะ deploy ใหม่แทนที่ไฟล์ของ deployment เดิม
3. เปิด `https://ชื่อเว็บของคุณ.netlify.app/exam/`
4. สำหรับ site เดิมที่เชื่อม GitHub ให้ commit/push ไฟล์เว็บใน exam และคง root `netlify.toml` ที่ publish `.` ไม่เปลี่ยน base directory เป็น exam

ไม่ต้องอัปโหลด `node_modules/`, `.npm-cache/`, `qa/`, `tests/`, `tools/`, `release/` หรือ `package*.json` สำหรับการเปิดเว็บ ชุดไฟล์สะอาดสร้างได้ด้วย:

```powershell
node tools/package.mjs
```

นำ `release/exam` ไปใส่ในชุดอัปโหลด prathanport ในตำแหน่ง `exam` ฟอนต์และ OpenCV ต้องอัปโหลดไปด้วย ห้ามใช้ไฟล์จากโปรเจกต์ exam รุ่นก่อนที่ลบไปแล้วผสมกับชุดนี้

## Deploy เป็นเว็บแยก

อัปโหลด **เนื้อหาภายใน** `release/exam` ให้ `index.html` อยู่ที่รากของ site ใหม่ หรือเชื่อม repository แล้วกำหนด Base directory `exam`, Publish directory `.`, ไม่มี build command ไฟล์ `exam/netlify.toml` ใช้กับกรณีเว็บแยกนี้

อัปโหลดเองด้วย [Netlify Drop](https://app.netlify.com/drop) หรือหน้า Deploys ไม่มี server runtime ไม่ต้องเพิ่ม SPA rewrite เพราะเมนูเปลี่ยน view ภายในหน้าเดียว

อ้างอิง: [Netlify manual deploy](https://docs.netlify.com/deploy/create-deploys/) และ [Monorepo settings](https://docs.netlify.com/build/configure-builds/monorepos/)

## วิธีใช้งาน

1. สร้างชุดข้อสอบ ระบุวิชา ชื่อ รหัส จำนวนข้อ 10/20/30/40/50/100 ตัวเลือก 4 หรือ 5 และคะแนนต่อข้อ
2. กรอกเฉลย A–D หรือ A–E แล้วบันทึก นำเข้า/ส่งออกเฉลย JSON ได้ การแก้เฉลยจะเพิ่มเวอร์ชันและเก็บเฉลยเก่า
3. ดาวน์โหลด PDF ที่หน้าเฉลย พิมพ์ A4 ขนาดจริง **100%** ห้าม fit-to-page และอย่าตัดจุดอ้างอิงหรือ QR
4. ให้นักเรียนฝนเต็มวงกลมเพียงคำตอบเดียว ใช้ดินสอ 2B หรือปากกาดำ ไม่เขียนเครื่องหมายถูก และลบรอยเดิมให้สะอาด
5. หน้า “ตรวจข้อสอบ” เลือกชุดข้อสอบ เปิดกล้องหลัง ถ่าย หรือเลือกภาพ ตรวจ preview แล้วกด “ตรวจภาพนี้” ภาพต้องเห็นกระดาษครบสี่มุม QR ต้องอ่านได้
6. ดูภาพที่ปรับมุมและ overlay เทียบคำตอบกับเฉลย แก้คำตอบที่อ่านผิด ข้อ “ไม่แน่ใจ” ทุกข้อต้องตัดสินโดยผู้ใช้ก่อนบันทึก ช่องว่างและฝนซ้ำได้ศูนย์คะแนน
7. เลือกนักเรียนที่มีอยู่ หรือกรอกรหัส ชื่อ ห้อง และเลขที่ ยืนยันว่าตรวจทานครบแล้วบันทึกคะแนน รหัสนักเรียนเป็นข้อความ จึงรักษาศูนย์นำหน้า
8. กลับไปถ่าย/อัปโหลดแผ่นต่อไป ผลซ้ำของนักเรียนในชุดเดียวกันต้องยืนยันการแทนที่ก่อน และระบบเก็บประวัติการแก้ไข
9. หน้า “ผลคะแนน” เลือกข้อสอบและเวอร์ชันเฉลยเพื่อดูผลรายข้อ ดูการกระจายคะแนน ส่งออก Excel/CSV/JSON แก้/ลบผลย้อนหลังได้
10. หน้าตั้งค่าใช้สำรอง JSON **พร้อมภาพ** และกู้คืนข้อมูล การกู้คืนแทนที่ข้อมูลปัจจุบันทั้งหมดและต้องยืนยันก่อน

## ข้อมูลและความเป็นส่วนตัว

ข้อมูลอยู่ใน IndexedDB ของ browser/origin/อุปกรณ์นี้ ไม่มีการส่งรูปหรือชื่อนักเรียนไปบริการตรวจภายนอก แต่ผู้ใช้เครื่องหรือ browser profile เดียวกันสามารถเข้าถึงข้อมูลได้ ระบบนี้ไม่มี login หรือระบบสิทธิ์หลายครู

เมื่อเปลี่ยน domain, browser, อุปกรณ์ หรือย้ายจาก localhost ไป Netlify ต้องใช้สำรอง/กู้คืนเพื่อย้ายข้อมูล สำรองบ่อย ๆ การล้างข้อมูลเว็บไซต์หรือการทำงานใน private mode อาจทำให้ข้อมูลหาย ควรใช้แท็บเดียวในการแก้ไขข้อมูลเพื่อหลีกเลี่ยงการเขียนทับจากหลายแท็บ

ผลตรวจเก็บเฉลย เวอร์ชัน คะแนนต่อข้อ คำตอบที่อ่านได้ คำตอบที่แก้ไข ภาพที่ปรับมุม และประวัติเดิมไว้ การแก้เฉลยภายหลังไม่เปลี่ยนคะแนนที่บันทึกไปแล้ว กระดาษเก่าใช้เฉลยเวอร์ชันจาก QR หากมีในเครื่อง ห้ามนำเข้ากระดาษจากชุดอื่นโดยเดาแม่แบบ

ข้อมูลสำรองต้องไม่เกิน 100 MB รูปที่บันทึกเป็น JPEG ภาพที่ปรับมุม 1260 × 1782 พิกเซล พื้นที่จัดเก็บจริงขึ้นกับ browser หากเต็ม ระบบจะแจ้งและไม่แสดงว่าบันทึกสำเร็จ

## OMR และแม่แบบ

`js/template.js` เป็นแหล่งพิกัดเดียวของ PDF และ OMR หน่วยมิลลิเมตร จุดกำเนิดซ้ายบน A4 210 × 297 mm พิกัดจุดอ้างอิงเรียง TL, TR, BR, BL ที่ (10,10), (200,10), (200,287), (10,287) จุดสีดำเป็นสี่เหลี่ยม 4 × 4 mm วงกลมรัศมี 1.7 mm แถวห่าง 7 mm และคอลัมน์ห่าง 47 mm สูงสุด 25 แถวต่อคอลัมน์

Pipeline:

- ภาพอัปโหลด/กล้องลดขนาดด้านยาวเป็นไม่เกิน 2000 px ด้านสั้นต้องอย่างน้อย 650 px
- Grayscale, Gaussian blur, adaptive threshold
- ค้น contour ของสี่เหลี่ยมสีดำในสี่มุม ตรวจรูปร่าง ความทึบ ขนาด และตำแหน่ง ไม่ crop รูปถ่ายด้วยพิกัดตายตัว
- Perspective transform/warp ไปขนาดอ้างอิง 1260 × 1782 px ตรวจ QR เพื่อระบุ template/exam/version และแนวกระดาษ
- อ่าน ROI ด้านในวงกลมที่ 64% ของรัศมี ตัดเส้นขอบออก ใช้ความเข้มเทียบพื้นขาวรอบช่อง เพื่อลดผลจากเงา
- classify single, blank, multiple, uncertain โดยไม่เลือกคำตอบที่เข้มที่สุดเมื่อไม่มั่นใจ
- ตรวจความสว่างและ variance ของ Laplacian เพื่อเตือน/ปฏิเสธภาพไม่ชัด คืนทรัพยากร Mat ด้วย `finally`

เกณฑ์ทั้งหมดอยู่ใน `js/config.js` ผู้ใช้ปรับ fill/uncertain threshold ในหน้าตั้งค่าได้ ค่าเริ่มต้น 0.58/0.20 Confidence เป็นคะแนนเชิง heuristic ไม่ใช่ความน่าจะเป็นที่สอบเทียบทางสถิติ ภาพเบลอ แสงจ้า รอยลบ และการฝนเล็ก/นอกวงอาจทำให้อ่านผิดหรือดูเป็นช่องว่าง ต้องตรวจทานภาพทุกครั้งก่อนยืนยัน

ใช้ได้เฉพาะกระดาษที่ระบบนี้สร้างและมี QR อ่านได้ ไม่รองรับการ OCR ลายมือ ไม่อ่านชื่อ/รหัสจากกระดาษอัตโนมัติ และไม่รองรับแม่แบบภายนอก ความเอียง/บิดมุมมากหรือจุดอ้างอิงถูกบังจะต้องถ่ายใหม่

## ทดสอบซ้ำ

เฉพาะการพัฒนา/ทดสอบต้องมี Node.js 24 และ Microsoft Edge บน Windows:

```powershell
npm.cmd ci --cache .npm-cache
npm.cmd test
npm.cmd run test:browser
```

Browser test เปิด static server ชั่วคราวแล้วปิดเอง ทดสอบ actual OpenCV.js ใน Edge ไม่ mock คำตอบ สร้างภาพสังเคราะห์จาก template ที่มี ground truth ที่กำหนดไว้ ทดสอบ PDF จาก jsPDF ด้วย PDF.js แล้วฝนและส่งกลับเข้า OMR อีกครั้ง

ผลล่าสุดอยู่ใน `tests/RESULTS.json` รายละเอียด mismatch และภาพสำหรับ QA อยู่ใน `qa/omr-results.json`, `qa/desktop.png`, `qa/mobile.png`, `qa/review-mobile.png`, `qa/aligned.png` หลังรันทดสอบ

| กรณีสังเคราะห์ | ถูก / ทั้งหมด |
| --- | --- |
| ภาพตรง | 20/20 |
| ภาพเอียง 8 องศา | 20/20 |
| Perspective distortion | 20/20 |
| แสงไม่สม่ำเสมอ | 20/20 |
| ช่องไม่ตอบ | 20/20 |
| ฝนสองช่อง | 20/20 |
| ฝนจาง (จัดเป็นไม่แน่ใจ) | 20/20 |
| 100 ข้อ 4 ตัวเลือก | 100/100 |

กรณีจุดอ้างอิงไม่ครบ, QR อ่านไม่ได้, คนละ template และคนละ exam ถูกปฏิเสธตามที่คาดไว้ ทดสอบ workflow รวม CRUD, ปรับคะแนน/ประวัติ, ตรวจซ้ำ, เฉลยเวอร์ชันเก่า, persistence, restore พร้อมภาพ, exports, viewport desktop/mobile/tablet และหยุด camera stream เมื่อออกจากหน้า กรณี permission denied จำลองผ่าน browser test

ผล 240/240 นี้เป็นเพียงข้อมูลสังเคราะห์ในชุดที่กำหนด ไม่ใช่ความแม่นยำจากกระดาษจริงทุกสภาพ ยังไม่ได้ทดสอบกล้องจริงบน Android/iPhone หรือเครื่องพิมพ์จริง ควรทดสอบกับภาพและเครื่องพิมพ์ของโรงเรียนก่อนนำคะแนนไปใช้จริง

## โครงสร้างและ dependencies

- `js/app.js`: dashboard, exam/student CRUD, เฉลย, reports, backup/restore
- `js/database.js`: IndexedDB transactions และ validation
- `js/exam.js`, `js/answer-key.js`: validation/version และ PDF
- `js/template.js`, `js/config.js`: geometry และ OMR parameters
- `js/camera.js`, `js/scanner.js`: camera, preview, review, manual corrections
- `js/image-processing.js`, `js/omr.js`, `js/grading.js`: OpenCV, ROI, classification, scoring
- `js/reports.js`, `js/export.js`: aggregate reports และ exports
- `assets/vendor/`: OpenCV.js, jsPDF, SheetJS, QR generator/reader, Lucide พร้อม version/license
- `assets/fonts/`: Sarabun จาก Google Fonts พร้อม SIL Open Font License
- `tests/`: unit tests, synthetic fixtures, browser integration และผลทดสอบ

อัปเดต vendor ด้วย `npm.cmd ci` ตาม lockfile แล้ว `npm.cmd run vendor` และรันทดสอบใหม่ ไม่ใช้รุ่น SheetJS เก่า 0.18.5 บน npm ไฟล์ runtime เป็น static local ทั้งหมด

อ้างอิง: [OpenCV thresholding](https://docs.opencv.org/3.4.4/d7/dd0/tutorial_js_thresholding.html), [OpenCV perspective example](https://github.com/opencv/opencv/blob/5.x/doc/js_tutorials/js_assets/js_geometric_transformations_warpPerspective.html), [SheetJS distribution](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)
