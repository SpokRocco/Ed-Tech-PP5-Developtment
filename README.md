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
- `npm run dev` มาพร้อมปลั๊กอินจำลอง Vercel `/api/*` (`localVercelApiPlugin` ใน `vite.config.js`) จึงรันทั้ง Frontend และ Backend API บนพอร์ตเดียวได้เลย
- หากยังไม่ได้ตั้งค่า `TURSO_DATABASE_URL` ใน `.env` (หรือกดสลับเป็นโหมด Demo) ระบบเปิด **Demo Mode (`localStorage`)** ให้ทดลองใช้ได้ครบทั้ง 3 บทบาท (`ผู้บริหาร`, `ผู้ดูแลระบบ`, `ครูผู้สอน`)

---

## 2. การอัปโหลดขึ้น GitHub Account (แยกขาดจากระบบเว็บโรงเรียน `hadket`)
```bash
git init
git add .
git commit -m "feat: Ban Hat Khet Pp.5 academic system on Turso SQL + Vercel API"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
git push -u origin main
```
> หมายเหตุ: ไฟล์ `.env` / `.env.local` ถูกกันออกผ่าน `.gitignore` เพื่อความปลอดภัย ห้าม Commit คีย์จริงขึ้น GitHub

---

## 3. การตั้งค่าฐานข้อมูล Turso SQL + ระบบ Auth/Session
ระบบใช้ **ฐานข้อมูล SQL เต็มรูปแบบบน Turso (libSQL / SQLite)** แยกขาดจากระบบ `hadket` ทำงานผ่านชั้น **Backend API (`api/*.js`) บน Vercel**:
- **Schema SQL เต็มรูปแบบ (`db/schema.sql`):** ตาราง `system_settings`, `users`, `sessions`, `students`, `subjects`, `curriculum_indicators`, `teacher_courses`, `score_structures`, `attendance`, `student_scores`, `characteristics_scores`, `classroom_pp5_summaries`, `primary2568_assessments`
- **Auth & Session (`api/auth.js`, `server/auth.js`):** เข้ารหัสรหัสผ่านด้วย `scrypt` + Timing-safe verify และออกคุกกี้ `HttpOnly` (`pp5_session`)
- **Images (โลโก้ / ตราครุฑ / ลายเซ็น):** บีบอัดเป็น Data URL เก็บในตาราง `system_settings` โดยไม่ต้องเปิด Object Storage เสียเงิน

### ขั้นตอนการติดตั้ง Turso Database (ฟรี)
1. สมัครและสร้างฐานข้อมูลฟรีที่ [turso.tech](https://turso.tech) (แนะนำ Region ใกล้ไทย เช่น `sin` - Singapore) หรือใช้ Turso CLI:
   ```bash
   turso auth login
   turso db create banhatkhet-pp5 --location sin
   turso db show banhatkhet-pp5 --url
   turso db tokens create banhatkhet-pp5
   ```
2. ตั้งค่า `.env` (ใช้สำหรับรันในเครื่อง — **ไม่มี prefix `VITE_`** เพื่อไม่ให้รั่วออกฝั่งเบราว์เซอร์):
   ```env
   TURSO_DATABASE_URL=libsql://banhatkhet-pp5-<org>.turso.io
   TURSO_AUTH_TOKEN=your-turso-auth-token
   SESSION_SECRET=สุ่มสตริงยาว-32-ตัวอักษรขึ้นไป
   ```
3. สร้างตาราง SQL และ Seed ข้อมูลตั้งต้น (136 วิชา, นักเรียน, ตัวชี้วัด และ ปพ.5 ตัวอย่าง):
   ```bash
   npm run db:push
   npm run seed:turso
   ```
   > หมายเหตุ: สามารถกำหนด `SEED_DEFAULT_PASSWORD` หรือระบุ `SEED_ADMIN_EMAIL=admin@banhatkhet.ac.th` ก่อนรัน `npm run seed:turso` หรือกด **"สร้าง Admin คนแรก"** บนหน้า `/login` แล้วค่อยกด **"ติดตั้งข้อมูลตั้งต้นเข้า Turso SQL"** ในหน้า `/admin` ได้ทันที

---

## 4. การ Deploy บน Vercel
โปรเจกต์มีโฟลเดอร์ `api/` (10 Serverless Functions — อยู่ภายใต้ลิมิต 12 ฟังก์ชันของ Vercel Hobby Plan) และ `vercel.json` (`"/((?!api/).*)" -> "/index.html"`) เรียบร้อยแล้ว
1. Import Repository จาก GitHub เข้าสู่ [Vercel](https://vercel.com)
2. เพิ่ม **Environment Variables** ใน Vercel Project Settings (เลือก Production / Preview / Development):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET`
3. กด **Deploy**

---

## 5. จุดเชื่อมต่อไฟล์และโมดูลหลัก
- **SQL Schema & Server Layer:** `db/schema.sql`, `server/db.js`, `server/schema.js`, `server/auth.js`, `server/mappers.js`, `server/seedService.js`
- **Vercel Serverless API (`api/`):** `health.js`, `auth.js`, `bootstrap.js`, `settings.js`, `users.js`, `students.js`, `curriculum.js`, `courses.js`, `classroom.js`
- **Client Auth & Data Layer:** `src/lib/mediaUtils.js`, `src/hooks/useAuth.jsx`, `src/services/dataService.js`
- **CLI Scripts:** `scripts/pushSchema.mjs`, `scripts/seedTurso.mjs`
- **โครงสร้างรายวิชา 136 วิชา & Import Excel:** `src/data/schoolCurriculumCatalog.js`, `src/services/subjectImportAdapter.js`, `src/hooks/useSubjectImport.js`
- **สัดส่วนคะแนน & การคิดเกรด/สรุปความครบถ้วน:** `src/services/scoringConfigAdapter.js`, `src/hooks/useScoringModel.js`, `src/lib/thaiFormatting.js`
- **รูปเล่มรายงาน & ส่งออก Excel/PDF/Word:** `src/services/reportLayoutAdapter.js`, `src/hooks/useReportLayout.js`, `src/services/exportEngine.js`
