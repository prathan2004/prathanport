# RMUTL calendar regression fixtures

Source: https://e-cms.rmutl.ac.th/assets/upload/files/2025/11/ปฏิทินล้านนา_โหราปากเล้ม_ศวธ_1388_ขวาง.pdf

Author: ศักดิ์นรินทร์ ชาวงิ้ว, ศูนย์วัฒนธรรมศึกษา มทร.ล้านนา.
SHA256: 81919C0937650682BCA625FFC86DE5F8D83CFC868BD39B5ED6DCA51377F014B0

`rmutl-2569.json` contains 450 factual rows extracted from PDF pages 5–7 and
18–30 (January 2026–April 2027). Each row retains its physical PDF page number.
Pak Lem month, occurrence, phase, lunar day and the printed bad-day marker are
read from their column positions. Phase is carried over from the printed marker
within each monthly table. Rows with missing lunar-day glyphs (32 rows) were
excluded, not filled from the algorithm. Selected transition pages were also
rendered and visually reviewed; October was visually reviewed previously.

These are regression values independent of the Suriyayatra implementation,
not a claim that every date in 1900–2200 was checked against a printed calendar.
