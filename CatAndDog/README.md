# CatAndDog Animal Classifier

เว็บ HTML/CSS/JavaScript สำหรับอัปโหลดรูปภาพและทำนายคลาสสัตว์ด้วยโมเดล CNN จาก Google Teachable Machine

## วิธีสร้างโมเดลใน Google Teachable Machine

1. เปิด https://teachablemachine.withgoogle.com/
2. เลือก `Image Project`
3. สร้างคลาส เช่น `Cat`, `Dog` หรือสัตว์อื่นที่ต้องการ
4. อัปโหลดรูปภาพตัวอย่างของแต่ละคลาส
5. กด `Train Model`
6. กด `Export Model`
7. เลือก `TensorFlow.js`
8. กด `Upload my model`
9. คัดลอก Model URL เช่น `https://teachablemachine.withgoogle.com/models/XXXXXX/`

## วิธีใช้งานเว็บ

1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. วาง Model URL จาก Teachable Machine
3. กด `โหลดโมเดล`
4. เลือกรูปภาพ
5. กด `ทำนายภาพ`

เว็บจะจำ Model URL ล่าสุดไว้ในเบราว์เซอร์ด้วย `localStorage`
