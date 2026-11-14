# ระบบบันทึกผลการเรียนและเอกสารวัดผลประเมินผล (ปพ.5) ออนไลน์
**โรงเรียนบ้านหาดเค็ด สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1 (สพป.น่าน เขต 1)**

พัฒนาระบบโดย **นายปิยะพันธุ์ ขันไร่** ตำแหน่ง ครู วิทยฐานะครูชำนาญการ โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1

---

## 1. การติดตั้งและรันทดสอบในเครื่อง (Port 8080)
```bash
npm install
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:8080`
- หากยังไม่ได้ตั้งค่าไฟล์ `.env` ระบบจะทำงานใน **โหมดสาธิตพร้อมใช้งาน (Demo Mode)** โดยอัตโนมัติ พร้อมปุ่มทดลองเข้าสู่ระบบครบทั้ง 3 บทบาท (`ผู้บริหาร`, `ผู้ดูแลระบบ /admin`, `ครูผู้สอน`)

## 2. การเชื่อมต่อ Supabase (Region: Southeast Asia - Singapore)
1. สร้างโปรเจกต์บน [Supabase](https://supabase.com) โดยเลือก Region เป็น **Southeast Asia (Singapore)**
2. เปิดเมนู **SQL Editor** แล้วคัดลอกคำสั่งทั้งหมดจากไฟล์ `SUPABASE_SETUP.sql` ไปรัน เพื่อสร้าง:
   - ตารางทั้ง 10 ตาราง (`system_settings`, `users`, `students`, `subjects`, `curriculum_indicators`, `teacher_courses`, `attendance`, `score_structures`, `student_scores`, `characteristics_scores`)
   - Row Level Security (RLS) และ Private Security Helper Functions
   - Public Storage Bucket ชื่อ `school-images` สำหรับโลโก้โรงเรียน ตราครุฑ และลายเซ็นดิจิทัล
   - ข้อมูลตัวอย่างเริ่มต้นของโรงเรียนบ้านหาดเค็ด
3. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`

## 3. การ Deploy บน Vercel
โปรเจกต์มาพร้อมไฟล์ `vercel.json` ที่ตั้งค่า SPA Rewrites ไว้เรียบร้อยแล้ว สามารถ Push ขึ้น GitHub และเชื่อมต่อ Vercel พร้อมกำหนด Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) ได้ทันที

## 4. จุดเชื่อมต่อสำหรับไฟล์อ้างอิง 3 ส่วน (Integration Hooks)
- **ไฟล์ Excel รหัสวิชา:** `src/services/subjectImportAdapter.js` และ `src/hooks/useSubjectImport.js`
- **รูปภาพตัวอย่าง UI สัดส่วนคะแนน:** `src/services/scoringConfigAdapter.js` และ `src/hooks/useScoringModel.js`
- **ไฟล์ Google Docs ตัวอย่างรูปเล่มรายงาน:** `src/services/reportLayoutAdapter.js`, `src/hooks/useReportLayout.js` และ `src/services/exportEngine.js`
