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

## Deploy บน Netlify

1. Push โฟลเดอร์ `weather` ขึ้น repository
2. สร้าง Netlify Site แล้วเชื่อม repository `prathanport`
3. ตั้ง Package directory เป็น `weather`
4. ตั้ง Publish directory เป็น `weather`
5. เว้น Build command ว่าง แล้วกด Deploy

เว็บชุดนี้เรียก API ที่ไม่ต้องใช้ secret key จึงยังไม่จำเป็นต้องตั้ง Environment Variable หรือ Netlify Function

## หมายเหตุสำหรับ Production

- ตรวจสอบเงื่อนไขและโควตาของ Open-Meteo, RainViewer และ OpenStreetMap ให้เหมาะกับจำนวนผู้ใช้
- ข้อมูล Open-Meteo เป็นข้อมูลจากแบบจำลองสภาพอากาศ ไม่ใช่ค่าจากสถานีตรวจวัดรายอำเภอโดยตรง
- พิกัดอำเภอที่ใช้เรียกอากาศเป็นจุดกึ่งกลางของกรอบ polygon ค่าที่แสดงจึงเป็นตัวแทนบริเวณอำเภอ
- หากเปลี่ยนไปใช้ provider ที่ต้องมี secret key ให้เรียกผ่าน Netlify Function และเก็บ key ใน Netlify Environment Variables เท่านั้น
- ควรมีระบบ monitoring และ fallback เพิ่มเติมหากเว็บใช้สำหรับการแจ้งเตือนภัยหรือภารกิจสำคัญ
