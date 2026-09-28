# Mae Khan Flood Monitor

เว็บแดชบอร์ดสำหรับสนับสนุนการติดตามระดับน้ำลำน้ำแม่ขานในพื้นที่ตำบลบ้านแม อำเภอสันป่าตอง จังหวัดเชียงใหม่ ใช้ข้อมูลจริงที่ตรวจสอบย้อนกลับได้เท่านั้น ช่องข้อมูลที่ยังไม่มีแหล่งอ้างอิงจะแสดงว่าไม่มีข้อมูลและไม่สร้างค่าจำลอง

## Architecture

`Official source -> Netlify Function -> HTML table parser -> JSON -> Vanilla JS dashboard`

หน้าแผนที่แยกจาก API ระดับน้ำ จึงยังเปิดใช้งานและอ่าน GeoJSON ได้เมื่อเว็บไซต์ต้นทางหรือ Function ขัดข้อง Function cache ผลลัพธ์ 5 นาที และแยก `observedAt` ออกจาก `fetchedAt` เสมอ

## Run locally

การเปิดผ่าน HTTP server จะทำให้ ES modules และ GeoJSON ทำงานถูกต้อง:

```bash
npx netlify dev
```

หรือดูเฉพาะ frontend ด้วย static server เช่น `npx serve .` แต่ endpoint ของ Function จะไม่ทำงาน

## Deploy to Netlify

1. เลือกโฟลเดอร์ `banmae` เป็น Base directory ของ Site
2. ไม่ต้องกำหนด Build command
3. Publish directory ใช้ `.` และ Functions directory ใช้ `netlify/functions` ตาม `netlify.toml`
4. Deploy แล้วทดสอบ `/.netlify/functions/water-level` ก่อนเปิดหน้า Dashboard

## Data sources and parser

ตั้งค่า URL และรหัสสถานีใน `netlify/functions/config.js` ปัจจุบัน P.71A อ้างอิงหน้ารายงานของสถาบันสารสนเทศทรัพยากรน้ำ/กรมชลประทาน และตำแหน่งสถานีอ้างอิงเอกสารประวัติสถานีของศูนย์อุทกวิทยาและบริหารน้ำภาคเหนือตอนบน

Parser ใน `water-level.js` จะจับคู่คอลัมน์จากชื่อหัวตารางก่อนอ่านค่า หากหัวตารางต้นทางเปลี่ยนหรือไม่สามารถยืนยันคอลัมน์ได้ ระบบจะคืน `null` แทนการเดาค่า เมื่อแก้ parser ให้เก็บ HTML ตัวอย่างจากต้นทาง ตรวจชื่อคอลัมน์จริง และเพิ่ม pattern เฉพาะที่ผ่านการทดสอบแล้ว

## Add a station

1. ยืนยันรหัส ชื่อ ลำน้ำ และพิกัดจากเอกสารหรือ Dataset ทางการ
2. เพิ่ม Feature ใน `data/stations.geojson` พร้อม `source` และ `sourceUrl`
3. เพิ่ม source config ใน `netlify/functions/config.js`
4. เพิ่ม parser หรือ adapter เฉพาะแหล่งข้อมูล และคืน JSON schema เดิม

ห้ามวาง Marker หากยังไม่มีพิกัดที่ยืนยันได้ สถานีบ้านเหมืองฟูจึงยังแสดงเฉพาะในรายการสถานี

## Add GIS and flood layers

ไฟล์ GeoJSON ที่ยังรอข้อมูลมี `FeatureCollection` ว่างและ `metadata.requiredSource` ระบุชนิดแหล่งข้อมูลที่ต้องใช้ ให้นำข้อมูลจากหน่วยงานรัฐ, OpenStreetMap ตามเงื่อนไขสัญญาอนุญาต, ชุดข้อมูลดาวเทียมที่อนุญาต หรือผลสำรวจที่ตรวจสอบได้มาใส่ในไฟล์ที่ตรงกับชั้นข้อมูล

- `banmae-boundary.geojson`: Polygon/MultiPolygon ขอบเขตตำบลบ้านแม
- `maekhan-river.geojson`: LineString/MultiLineString แนวลำน้ำแม่ขาน
- `villages.geojson`: Point หมู่บ้าน พร้อมชื่อและหมายเลขหมู่ที่ยืนยันแล้ว
- `flood-current.geojson`: Polygon น้ำท่วมปัจจุบัน
- `flood-historical.geojson`: Polygon พร้อมวันที่เหตุการณ์และแหล่งข้อมูล
- `flood-risk.geojson`: Polygon เขตเสี่ยงจากหน่วยงานเจ้าของข้อมูล
- `obstructions.geojson`: Point พร้อมชนิด ระดับการกีดขวาง วันที่สำรวจ และแหล่งข้อมูล

เมื่อ `banmae-boundary.geojson` มีข้อมูล แผนที่จะเรียก `map.fitBounds()` โดยอัตโนมัติ ห้ามวาด Polygon หรือพิกัดจากการประมาณ

## Add rain radar

เพิ่ม TileLayer ใน `js/map.js` เฉพาะ provider ที่อนุญาตให้เผยแพร่ tile ผ่านเว็บสาธารณะ ระบุ attribution, ข้อจำกัด cache และ API key ตามเงื่อนไขผู้ให้บริการ หากยังไม่มี provider ให้คง layer เป็นสถานะปิด

## Data quality

- `LIVE`: มี `observedAt` และอายุข้อมูลไม่เกิน 3 ชั่วโมง
- `DELAYED`: อายุข้อมูลเกิน 3 ชั่วโมง
- `OFFLINE`: Function ติดต่อแหล่งข้อมูลไม่ได้
- `UNVERIFIED`: ข้อมูลสำคัญหรือเวลาตรวจวัดยังยืนยันไม่ได้

ตรวจทุกครั้งว่า `observedAt` มาจากเวลาที่สถานีวัดจริง ไม่ใช่เวลาที่ระบบดึงข้อมูล (`fetchedAt`) และห้ามกำหนดเกณฑ์สถานการณ์น้ำจนกว่าจะได้ Threshold พร้อมแหล่งอ้างอิงจากหน่วยงานเจ้าของสถานี

## Verified references

- [ข้อมูลสถานี P.71A](https://www.hydro-1.net/Data/STATION/P.71A.html)
- [เอกสารประวัติสถานี P.71A](https://www.hydro-1.net/Data/STATION/History/P71A.pdf)
- [รายงานสถานีสำรวจปริมาณน้ำท่า](https://tiwrm.hii.or.th/DATA/REPORT/php/show_itcwater.php)
- [ลิขสิทธิ์และ Attribution ของ OpenStreetMap](https://www.openstreetmap.org/copyright)

## Safety

ข้อมูลในระบบใช้เพื่อสนับสนุนการติดตามสถานการณ์เท่านั้น โปรดติดตามประกาศเตือนภัยอย่างเป็นทางการจากหน่วยงานภาครัฐและองค์กรปกครองส่วนท้องถิ่น
