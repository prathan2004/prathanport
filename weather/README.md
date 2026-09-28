# Chiang Mai Rain & Cloud Monitor

แดชบอร์ดแผนที่สภาพอากาศจังหวัดเชียงใหม่ สร้างด้วย HTML, CSS, Vanilla JavaScript และ Leaflet ข้อมูลสภาพอากาศและ Radar จะอัปเดตจาก API โดยอัตโนมัติ ผู้ดูแลไม่ต้องกรอกข้อมูลรายวันเอง

## แหล่งข้อมูล

- สภาพอากาศปัจจุบัน: [Open-Meteo](https://open-meteo.com/en/docs) เช่น อุณหภูมิ ความชื้น ปริมาณฝน และความเร็วลม
- Radar ฝนย้อนหลังประมาณ 2 ชั่วโมง: [RainViewer](https://www.rainviewer.com/api.html)
- ขอบเขต 25 อำเภอ: [geoBoundaries](https://www.geoboundaries.org/api.html) จาก Royal Thai Survey Department และ OCHA ROAP
- แผนที่ฐาน: [OpenStreetMap](https://www.openstreetmap.org/copyright)

ไฟล์ขอบเขตอำเภอใช้สัญญาอนุญาต CC BY 3.0 IGO และเก็บไว้ใน `data/chiangmai-districts.geojson` เพื่อให้โหลดเร็วและไม่ต้องเรียก API ขอบเขตทุกครั้ง

Open-Meteo ใช้ได้โดยไม่ต้องมี API key ตามเงื่อนไขของผู้ให้บริการ ส่วน RainViewer API สาธารณะเหมาะสำหรับงานส่วนตัว การศึกษา และชุมชนขนาดเล็ก ไม่มี SLA และต้องแสดงเครดิต หากนำไปใช้เชิงพาณิชย์หรือมีผู้ใช้จำนวนมากให้ตรวจสอบแผนบริการและขออนุญาตจากผู้ให้บริการก่อน

## เปิดใช้งานในเครื่อง

```powershell
cd C:\Users\User\Documents\GitHub\prathanport\weather
node dev-server.mjs
```

จากนั้นเปิด `http://localhost:8080`

## การทำงานของข้อมูลสด

เมื่อเปิดเว็บ ระบบจะเรียก Open-Meteo ด้วยพิกัดกลางจังหวัดเชียงใหม่ เมื่อเลือกอำเภอ ระบบจะหาจุดกึ่งกลางจาก polygon แล้วเรียกข้อมูลของบริเวณนั้นใหม่ ข้อมูลถูก cache 5 นาทีและจะอัปเดตเมื่อ:

- เปิดเว็บไซต์
- เลือกอำเภอหรือใช้ตำแหน่ง GPS
- กดปุ่มอัปเดต
- ครบเวลาอัปเดตอัตโนมัติทุก 5 นาที

Radar timeline โหลด metadata และ tile ล่าสุดจาก RainViewer โดยตรง ถ้า API ใดใช้งานไม่ได้ แผนที่และขอบเขตอำเภอยังใช้งานได้ และหน้าจอจะแสดงว่าไม่มีข้อมูลแทนการสร้างค่าขึ้นเอง

## Ping River Monitoring

หน้า Dashboard มี Card, Marker และกราฟสำหรับสถานี P.1 สะพานนวรัฐ พิกัดและระดับตลิ่ง 3.70 เมตรอ้างอิงข้อมูลสถานีของกรมชลประทาน ข้อมูลสดเรียกผ่าน:

```text
Official Water Data
        ↓
Netlify Function: netlify/functions/water-level.mjs
        ↓
/api/water-level?station=P.1&hours=24
        ↓
Frontend
```

จากการตรวจสอบยังไม่พบเอกสาร Public API ของกรมชลประทานสำหรับข้อมูลสดสถานี P.1 ระบบจึงไม่ scrape เว็บไซต์และไม่สร้างค่าจำลอง เมื่อยังไม่เชื่อมแหล่งข้อมูล Card และกราฟจะแสดงว่าไม่มีข้อมูล ส่วนระดับตลิ่งและ metadata สถานียังแสดงจากเอกสารทางการ

เมื่อตรวจสอบและได้รับอนุญาตให้ใช้ API ทางการแล้ว ให้ตั้ง Environment Variable ชื่อ `WATER_DATA_URL` ใน Netlify โดย endpoint ดังกล่าวต้องคืน JSON ที่ normalize แล้ว:

```json
{
  "station": "P.1",
  "waterLevel": 1.25,
  "bankLevel": 3.7,
  "flowRate": 82.4,
  "trend": "stable",
  "updatedAt": "2026-09-28T10:00:00+07:00",
  "history": [
    {
      "waterLevel": 1.24,
      "flowRate": 81.9,
      "recordedAt": "2026-09-28T09:00:00+07:00"
    }
  ]
}
```

Function จะตรวจชนิดข้อมูล คำนวณระยะต่ำกว่าตลิ่ง และคำนวณแนวโน้มจากสองค่าล่าสุดหากต้นทางไม่ได้ส่ง trend มาให้ แต่จะไม่คำนวณสถานะเตือนภัยจนกว่าจะมี threshold ที่ยืนยันจากแหล่งทางการ

กำหนดเกณฑ์ที่ผ่านการยืนยันใน `WATER_THRESHOLDS` ทั้งใน frontend และ Function ปัจจุบันทุกค่าเป็น `null` เพื่อป้องกันการแสดงคำเตือนที่ไม่มีแหล่งอ้างอิง

## Supabase Historical Data

ไฟล์ `sql/water_levels.sql` เตรียมตาราง `water_levels` พร้อม index และ RLS สำหรับเก็บข้อมูลย้อนหลัง การอ่านเปิดสำหรับหน้า Dashboard แต่การเขียนต้องทำผ่าน Serverless Function ที่เก็บ `SUPABASE_SERVICE_ROLE_KEY` ไว้ฝั่ง server เท่านั้น ห้ามนำ service role key ไปไว้ใน `app.js`

## Deploy บน Netlify

1. Push โฟลเดอร์ `weather` ขึ้น repository
2. สร้าง Netlify Site แล้วเชื่อม repository `prathanport`
3. ตั้ง Package directory เป็น `weather`
4. ตั้ง Publish directory เป็น `weather`
5. เว้น Build command ว่าง แล้วกด Deploy

ข้อมูลอากาศและ Radar ไม่ต้องใช้ secret key ส่วน Water Monitoring ใช้ Netlify Function อยู่แล้ว หากเชื่อม provider ทางการภายหลังให้ตั้ง `WATER_DATA_URL` ใน Netlify Environment Variables แล้ว deploy ใหม่

## หมายเหตุสำหรับ Production

- ตรวจสอบเงื่อนไขและโควตาของ Open-Meteo, RainViewer และ OpenStreetMap ให้เหมาะกับจำนวนผู้ใช้
- ข้อมูล Open-Meteo เป็นข้อมูลจากแบบจำลองสภาพอากาศ ไม่ใช่ค่าจากสถานีตรวจวัดรายอำเภอโดยตรง
- พิกัดอำเภอที่ใช้เรียกอากาศเป็นจุดกึ่งกลางของกรอบ polygon ค่าที่แสดงจึงเป็นตัวแทนบริเวณอำเภอ
- หากเปลี่ยนไปใช้ provider ที่ต้องมี secret key ให้เรียกผ่าน Netlify Function และเก็บ key ใน Netlify Environment Variables เท่านั้น
- ควรมีระบบ monitoring และ fallback เพิ่มเติมหากเว็บใช้สำหรับการแจ้งเตือนภัยหรือภารกิจสำคัญ
