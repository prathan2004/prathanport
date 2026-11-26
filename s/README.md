# My ShortLink

เว็บย่อลิงก์ส่วนตัวที่เก็บกฎ HTTP 302 ในไฟล์ `public/_redirects` และใช้ Netlify Functions จัดการไฟล์ผ่าน GitHub Contents API ผู้ที่มีลิงก์สั้นเปิดลิงก์ได้โดยตรง ส่วนการจัดการต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแล ไม่มีฐานข้อมูล ระบบสมัครสมาชิก หรือการนับคลิก

## 1. ติดตั้งบนเครื่อง

ติดตั้ง Node.js 24 LTS พร้อม npm และ Git จากนั้นเปิด PowerShell ใน repository

```powershell
cd s
node --version
npm install
npm test
```

ชุดทดสอบใช้ Node.js ทดสอบ Functions โดยจำลอง HTTP ตรงขอบเขตของ GitHub และ Netlify จึงรันได้โดยไม่ต้องใช้บัญชีหรือ Token

## 2. ตั้งค่า GitHub

1. ใช้ repository `prathanport` เดิม หรือสร้าง repository ใหม่ใน GitHub โดยเลือกระดับการเปิดเผยตามต้องการ
2. ไปที่ **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** เลือกเจ้าของ repository และเลือกเฉพาะ repository ที่จะใช้งาน
3. ตั้ง Repository permissions → **Contents → Read and write** และตั้งวันหมดอายุ เก็บ Token ไว้สำหรับตั้งค่าในเครื่องและ Netlify
4. ตรวจสอบว่า Token เขียนสาขาที่ใช้ Deploy ได้ หากมี Branch protection หรือ Ruleset ที่บังคับ Pull Request การ Commit จาก Functions จะถูกปฏิเสธ ใช้สาขาสำหรับ Publish ที่กำหนดสิทธิ์ไว้เหมาะสม แล้วตั้งชื่อสาขาเดียวกันทั้ง GitHub Branch และ Netlify Production branch

[GitHub Contents API และสิทธิ์ของ Token](https://docs.github.com/en/rest/repos/contents?apiversion=2022-11-28)

## 3. สร้าง Password Hash และ Session Secret

รันคำสั่งจากโฟลเดอร์ `s` ใช้รหัสผ่านอย่างน้อย 12 ตัวอักษร คำสั่งนี้รับรหัสผ่านโดยซ่อนข้อความที่พิมพ์และส่งเข้าตัวสร้าง hash ผ่าน stdin

```powershell
$shortLinkPassword = Read-Host "Admin password" -MaskInput
$shortLinkPassword | node scripts/hash-password.js
Remove-Variable shortLinkPassword
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`-MaskInput` ใช้ PowerShell 7 หากใช้รหัสผ่านอักขระนอก ASCII ให้ตั้ง `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)` ใน PowerShell ก่อนส่งเข้าคำสั่ง Node เก็บผลลัพธ์คำสั่งแรกเป็น `ADMIN_PASSWORD_HASH` และคำสั่งสุดท้ายเป็น `SESSION_SECRET` การเปลี่ยน Session Secret ทำให้ Session เดิมหมดอายุ

## 4. ตั้ง Environment Variables

คัดลอก `.env.example` เป็น `.env` สำหรับการทดสอบในเครื่อง

```powershell
Copy-Item .env.example .env
```

| ตัวแปร | ค่า |
| --- | --- |
| `GITHUB_OWNER`, `GITHUB_REPO` | ชื่อเจ้าของและชื่อ repository |
| `GITHUB_TOKEN` | Fine-grained Token |
| `GITHUB_BRANCH` | สาขาที่ให้ Functions อ่านและ Commit ค่าเริ่มต้น `main` |
| `GITHUB_FILE_PATH` | `s/public/_redirects` เมื่อใช้ `prathanport` หรือ `public/_redirects` หากย้ายโปรเจกต์ไปไว้ที่ราก repository ใหม่ |
| `ADMIN_USERNAME` | ชื่อบัญชีผู้ดูแล |
| `ADMIN_PASSWORD_HASH` | Hash จากคำสั่งด้านบน |
| `SESSION_SECRET` | Secret สุ่มอย่างน้อย 32 ไบต์ |
| `SITE_URL` | ในเครื่องใช้ `http://localhost:8888` บน Netlify ใช้ HTTPS URL หลักของไซต์ เช่น `https://short.example.com` |
| `NETLIFY_SITE_ID`, `NETLIFY_API_TOKEN` | ใช้เมื่อต้องการอ่านสถานะ Production Deploy ล่าสุดจาก Netlify API |

กำหนดตัวแปร production ใน Netlify ที่ **Project configuration → Environment variables** ให้ Functions เข้าถึงได้ เก็บค่าลับเฉพาะใน `.env` หรือในระบบจัดการ Environment Variables ของ Netlify

## 5. ทดสอบด้วย Netlify CLI

```powershell
npm run dev
curl.exe -sI http://localhost:8888/cmru
```

เปิด `http://localhost:8888/login.html` จาก hostname เดียวกับ `SITE_URL` เพื่อให้ตรวจ Origin ได้ กฎตัวอย่าง `/cmru` ควรตอบ HTTP 302 พร้อม `Location` ชี้ไปที่เว็บไซต์มหาวิทยาลัย การแก้ไขจาก Dashboard จะเขียนกลับ repository ที่ตั้งไว้จริง หากทดสอบ CRUD ให้ใช้ repository หรือสาขาทดสอบ สำหรับ Redirect บนเครื่อง Netlify Dev อ่านจากไฟล์ใน working tree หลังแก้ผ่าน Dashboard ให้ดึง Commit ล่าสุดจากสาขาทดสอบมาที่เครื่องก่อนตรวจซ้ำ

## 6. Push ขึ้น GitHub และเชื่อม Netlify

สำหรับ `prathanport` ให้รันจากโฟลเดอร์รากของ repository

```powershell
git add s netlify.toml .gitignore
git commit -m "Add personal URL shortener"
git push origin main
```

1. ที่ Netlify เลือก **Add new project → Import an existing project → GitHub** แล้วเลือก repository
2. สร้างโปรเจกต์ Netlify แยกสำหรับ ShortLink กำหนด **Base directory** เป็น `s` และปล่อย **Package directory** ว่าง ใช้ `s/netlify.toml` ซึ่งตั้ง Publish เป็น `public` และ Functions เป็น `netlify/functions` นับจาก Base directory เว้น Build command ว่าง
3. ถ้าใช้ repository ใหม่ที่วางไฟล์ของโปรเจกต์นี้ที่ราก ให้เว้น Base directory ว่าง และตั้ง `GITHUB_FILE_PATH=public/_redirects`
4. ตั้ง Production branch ให้ตรงกับ `GITHUB_BRANCH` และเปิด Continuous deployment ตั้งค่าตัวแปร production จากขั้นตอนก่อนหน้า แล้ว Deploy
5. ตรวจว่าไฟล์ใน Deploy มาจาก `s/public` และมี Functions ทั้ง 8 รายการ เปิดหน้า Login และตรวจ Redirect ตัวอย่างบนโดเมนจริง

ไฟล์ `netlify.toml` ที่รากของ `prathanport` ตอบ 404 สำหรับเส้นทาง `/s` บนไซต์หลัก เพราะไซต์หลักตั้ง Publish ไว้ที่ราก repository ส่วนเว็บไซต์ ShortLink ใช้โดเมนของโปรเจกต์แยกและลิงก์รูปแบบ `https://your-domain/alias`

ใช้ Git-based Deploy เป็นวิธีหลักเพื่อให้ Netlify Deploy อัตโนมัติทุกครั้งที่ Functions Commit หากต้องการ Deploy ด้วย CLI จากโฟลเดอร์ `s` ให้ใช้ `npx netlify link` แล้วเลือกโปรเจกต์ ShortLink จากนั้นรัน `npm run deploy -- --dir=public --functions=netlify/functions` จาก working tree ที่ตรงกับสาขา production

[ตั้งค่าโครงการย่อยใน Netlify](https://docs.netlify.com/build/configure-builds/monorepos/)

## 7. ใช้ Custom Domain

เปิด **Domain management** ของโปรเจกต์ ShortLink เพิ่มโดเมนหรือ subdomain และตั้ง DNS ตามค่าที่ Netlify แสดง รอ HTTPS พร้อมใช้งาน ตั้งเป็น Primary domain จากนั้นเปลี่ยน `SITE_URL` เป็น URL หลักใหม่แล้ว Deploy อีกครั้ง ให้ผู้ดูแลเข้า Dashboard จาก URL ใหม่นี้และตรวจลิงก์ตัวอย่าง

## 8. สร้าง จัดการ และสำรองลิงก์

- ใน **Create Link** กรอก HTTP หรือ HTTPS URL และระบุ Alias หรือเว้นว่างให้ระบบสุ่ม 6 ตัวอักษร
- ใน **Manage Links** ค้นหาจาก Alias หรือ URL แล้วใช้ปุ่มคัดลอก เปิด QR Code แก้ไข หรือลบ การลบมีหน้าต่างยืนยัน
- ในหน้าต่าง QR Code กดดาวน์โหลด PNG เพื่อใช้ในเอกสาร
- ใน **Backup & Export** ดาวน์โหลดไฟล์ `_redirects` ล่าสุด ส่งออก CSV หรือดู Commit History ของไฟล์ใน GitHub
- Dashboard ตรวจความพร้อมจาก HTTP 302 และ `Location` ที่ตรงกับค่าบน GitHub โดยเรียกเฉพาะโดเมนที่กำหนดใน `SITE_URL` และตรวจซ้ำช่วงสั้น ๆ หลังแก้ไข สถานะ Deploy ล่าสุดเป็นอีกข้อมูลหนึ่งจาก Netlify API
- กฎที่จัดการได้คือ Alias หนึ่งส่วนและ HTTP 302 แบบตรงไปตรงมา กฎ rewrite, wildcard, 301 และคอมเมนต์อื่นยังอยู่ในไฟล์ วางกฎเฉพาะไว้ก่อน wildcard ที่ครอบเส้นทางเดียวกัน และเก็บไฟล์เป็น UTF-8
- หลัง Deploy จริง ให้สร้าง Alias ทดสอบ เปิดลิงก์หลังสถานะพร้อมใช้งาน แก้ URL แล้วตรวจ `Location` อีกครั้ง จากนั้นลบและตรวจว่า URL เดิมตอบ 404 หลัง Deploy
- Login ถูกจำกัด 8 คำขอต่อ 60 วินาทีต่อ IP ผ่าน Netlify Function rate limiting ตรวจการเปิดใช้งานกฎใน Deploy log ของไซต์จริง

[Netlify API](https://open-api.netlify.com/) · [Netlify Rate Limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)

## 9. แก้ปัญหา

| อาการ | วิธีตรวจสอบ |
| --- | --- |
| เข้าสู่ระบบไม่ได้หรือคำขอถูกปฏิเสธ | ใช้โดเมนตาม `SITE_URL` ตรวจบัญชี Hash และ Secret หากส่งคำขอถี่ให้รอ 60 วินาที |
| GitHub แจ้ง 401, 403 หรือ 404 | ตรวจอายุ Token สิทธิ์ Contents การอนุมัติขององค์กร ชื่อ repository ชื่อสาขา และพาธไฟล์ |
| GitHub จำกัดคำขอ | รอช่วงเวลาที่ GitHub กำหนด แล้วรีเฟรช |
| Alias ซ้ำหรือไฟล์ถูกแก้พร้อมกัน | รีเฟรชเพื่ออ่านข้อมูลล่าสุด หาก Alias ถูกใช้แล้วให้เลือกชื่ออื่น |
| Commit แล้วแต่ยังไม่ Redirect | ดู Production Deploy log ตรวจสาขา Publish directory กฎ wildcard และโดเมนที่ตั้งไว้ |
| ตรวจสถานะ Deploy ล่าสุดไม่ได้ | ตรวจ `NETLIFY_SITE_ID` และ `NETLIFY_API_TOKEN` ระบบยังตรวจ HTTP 302 ของลิงก์ได้ |
| Netlify Dev เปิด Function ไม่ได้ | เรียก CLI จาก `s` และใช้พอร์ต 8888 ตรวจว่า Functions ถูกโหลดครบ |
| เครือข่ายขัดข้องหลังบันทึก | รีเฟรช Dashboard และตรวจ Commit History ก่อนส่งคำขอซ้ำ |
