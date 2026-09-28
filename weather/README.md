# Chiang Mai Rain & Cloud Monitor

แดชบอร์ดแผนที่สำหรับติดตามกลุ่มเมฆและฝนในจังหวัดเชียงใหม่ สร้างด้วย HTML, CSS, Vanilla JavaScript และ Leaflet เว็บเริ่มต้นใน `DEMO_MODE` จึงทดลอง UI ได้โดยไม่ต้องมี API key และจะแสดงป้าย **ข้อมูลตัวอย่าง (Demo)** อย่างชัดเจน

> `data/chiangmai-districts.geojson` เป็น geometry แบบย่อสำหรับการทดลอง UI เท่านั้น ก่อนใช้งานจริงควรแทนที่ด้วยขอบเขตการปกครองจากกรมการปกครอง, GISTDA หรือแหล่งข้อมูลภาครัฐที่มีใบอนุญาตเหมาะสม

## เปิดใช้งาน

เนื่องจากเว็บโหลด GeoJSON ด้วย `fetch()` จึงต้องเปิดผ่าน local web server ไม่ควรดับเบิลคลิก `index.html` โดยตรง

```powershell
cd C:\Users\User\Documents\GitHub\prathanport\weather
node dev-server.mjs
```

จากนั้นเปิด `http://localhost:8080`

## เชื่อมต่อ Weather API

แก้ค่า `WEATHER_CONFIG.weatherEndpoint` ใน `app.js` ให้ชี้ไปยัง Backend API หรือ Serverless Function และเปลี่ยน `DEMO_MODE` เป็น `false` โดย endpoint ควรรับ `district` และคืนค่า JSON รูปแบบนี้:

```json
{
  "status": "มีฝนเล็กน้อย",
  "rainfall": 2.4,
  "temperature": 27,
  "humidity": 81,
  "windSpeed": 6,
  "updatedAt": "2026-09-28T13:20:00+07:00"
}
```

อย่าใส่ secret API key ใน `app.js` ให้เก็บ key เป็น Environment Variable ฝั่ง Serverless/Backend แล้วให้ frontend เรียก endpoint ของระบบแทน

## เพิ่ม Radar และ Weather Layer

กำหนด URL template ของ tile provider ใน `WEATHER_CONFIG` เช่น `https://provider.example/{z}/{x}/{y}.png` สำหรับ `radarUrl`, `cloudUrl`, `rainUrl` หรือ `satelliteUrl` ต้องตรวจสอบ attribution, legend, time frame และข้อกำหนดการใช้งานจาก provider ทุกครั้ง

หาก provider มี radar timeline ให้แก้ `updateRadarFrame()` เพื่อเปลี่ยน tile URL ตาม timestamp ของแต่ละ frame แทนค่าจำลองปัจจุบัน

## Deploy บน Netlify

1. สร้าง Site ใหม่แล้วเลือกโฟลเดอร์หรือ repository นี้
2. ตั้ง Publish directory เป็น `weather`
3. ไม่ต้องกำหนด Build command สำหรับเว็บแบบ static
4. เพิ่ม API key ที่ Site configuration > Environment variables และอ่านจาก Netlify Function เท่านั้น

## Deploy บน Vercel

1. Import repository เข้า Vercel
2. ตั้ง Root Directory เป็น `weather`
3. เลือก Framework Preset เป็น `Other`
4. เพิ่ม API key ที่ Project Settings > Environment Variables และอ่านจาก API Route/Serverless Function เท่านั้น

## เปลี่ยนเป็นข้อมูลจริง

1. เปลี่ยน `DEMO_MODE` ใน `app.js` เป็น `false`
2. ตั้ง `WEATHER_CONFIG.weatherEndpoint`
3. แทนที่ GeoJSON ตัวอย่างด้วยข้อมูลขอบเขตอำเภอที่ถูกต้อง
4. ตั้ง Tile URL ของ provider ที่เลือกและปรับ legend ให้ตรงกับเกณฑ์ของ provider
5. ทดสอบ error state, timeout, rate limit และ attribution ก่อน deploy
