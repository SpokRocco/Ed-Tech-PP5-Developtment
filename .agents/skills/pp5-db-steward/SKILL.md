---
name: pp5-db-steward
description: >-
  Dedicated database architect and steward for Ban Hat Khet School's Pp.5 academic system using Turso (libSQL/SQLite), normalized SQL schema, and Vercel Serverless API (/api/) with cookie sessions, isolated from hadket. Use whenever modifying db/schema.sql, server/*, api/*, seed scripts, or auth/session handling.
---

# Pp.5 Turso SQL & Backend API Steward

## 1. Architecture Boundaries
- **Database:** Standalone **Turso (libSQL / SQLite)** database defined in `db/schema.sql` and `server/schema.js`, completely separated from `hadket`.
- **Backend API (`api/`):** Maximum **12 files** inside `api/` (Vercel Hobby plan cap; currently 10). Shared server utilities remain in `server/`.
- **Auth & Sessions:** Per-user `scrypt` password hashes in `users` + SHA-256 hashed tokens in `sessions` + `HttpOnly` cookie (`pp5_session`) with HMAC signing (`SESSION_SECRET`).
- **PII Isolation:** Non-admin sessions do not receive `email` or `phone` from `/api/bootstrap`, and `password_hash` is never returned to clients.
- **Images:** `logo_url`, `emblem_url`, and `director_signature_url` are compressed client-side in `src/lib/mediaUtils.js` (`compressImageToDataUrl`) and persisted as Data URLs inside `system_settings`.

## 2. SQL Table & Constraint Conventions (`db/schema.sql`)
1. `system_settings` (`id = 1` singleton)
2. `users` (`UNIQUE(email)`, roles `'executive' | 'admin' | 'teacher'`, `is_active`, `password_hash`)
3. `sessions` (`id`, `user_id -> users(id) ON DELETE CASCADE`, `token_hash UNIQUE`, `expires_at`)
4. `students` (`UNIQUE(student_code)`)
5. `subjects` (`UNIQUE(subject_code, grade_level)`)
6. `curriculum_indicators` (`UNIQUE(indicator_code)`)
7. `teacher_courses` (`subject_id -> subjects(id) ON DELETE SET NULL`, `teacher_id -> users(id) ON DELETE CASCADE`)
8. `score_structures` (`course_id PRIMARY KEY -> teacher_courses(id) ON DELETE CASCADE`)
9. `attendance` (`UNIQUE(course_id, student_id, session_date, period_number)`)
10. `student_scores` (`UNIQUE(course_id, student_id)`)
11. `characteristics_scores` (`UNIQUE(course_id, student_id)`)
12. `classroom_pp5_summaries` (`UNIQUE(grade_level, classroom, academic_year, semester)`)
13. `primary2568_assessments` (`UNIQUE(student_id, academic_year, semester)`)
14. `academic_documents` (ปพ.4/ปพ.6/ปพ.7/ปพ.8/เทียบผล ปพ.1/อบ.1-3/อบ.1-3 (2569) พร้อม `payload` JSON และ `owner_id -> users(id) ON DELETE CASCADE`)

> Note: Because libSQL over HTTP does not always retain `PRAGMA foreign_keys = ON` across stateless calls, destructive routes (`api/users.js`, `api/courses.js`) also perform explicit atomic child deletes inside `db.batch([...], 'write')`.

## 3. Sync & Verification Checklist
- Keep `db/schema.sql`, `server/schema.js`, `server/mappers.js`, `server/seedService.js`, `api/*.js`, and `src/services/dataService.js` in sync.
- Run SQL/API integration checks, `npm run build`, and `verify_ref_and_pp5.mjs` after backend/schema edits.
