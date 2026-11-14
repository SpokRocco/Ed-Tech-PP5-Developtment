-- ============================================================================
-- ระบบบันทึกผลการเรียนและเอกสารวัดผลประเมินผล (ปพ.5) ออนไลน์
-- โรงเรียนบ้านหาดเค็ด สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1 (สพป.น่าน เขต 1)
-- พัฒนาระบบโดย นายปิยะพันธุ์ ขันไร่ ตำแหน่ง ครู วิทยฐานะครูชำนาญการ
-- Database: Supabase PostgreSQL (Project: hadket / fhfckuypfstlokashcmu)
-- ครอบคลุมเอกสาร 3 ประเภท:
--   1. ปพ.5 ประจำรายวิชา (teacher_courses, attendance, score_structures, student_scores, characteristics_scores)
--   2. ปพ.5 รายชั้นเรียน (classroom_pp5_summaries)
--   3. ปพ.5 ป.1-3 (2568) ความสามารถ 8 ด้าน + ปพ.6 รายบุคคล (primary2568_assessments)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================================
-- 1. SYSTEM SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  school_name TEXT NOT NULL DEFAULT 'โรงเรียนบ้านหาดเค็ด',
  affiliation TEXT NOT NULL DEFAULT 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1',
  affiliation_short TEXT NOT NULL DEFAULT 'สพป.น่าน เขต 1',
  school_code TEXT NOT NULL DEFAULT '55010048',
  address TEXT NOT NULL DEFAULT 'บ้านหาดเค็ด ตำบลเมืองจัง อำเภอภูเพียง จังหวัดน่าน 55000',
  academic_year TEXT NOT NULL DEFAULT '2569',
  semester TEXT NOT NULL DEFAULT '1',
  director_name TEXT NOT NULL DEFAULT 'นายเอกชัย สุภา',
  director_title TEXT NOT NULL DEFAULT 'ผู้อำนวยการโรงเรียนบ้านหาดเค็ด',
  academic_head_name TEXT NOT NULL DEFAULT 'นายปิยะพันธุ์ ขันไร่',
  registrar_name TEXT NOT NULL DEFAULT 'นายปิยะพันธุ์ ขันไร่',
  logo_url TEXT DEFAULT 'https://fhfckuypfstlokashcmu.supabase.co/storage/v1/object/public/images/school_logo/1793976024904_by8r2q.webp',
  emblem_url TEXT DEFAULT '',
  director_signature_url TEXT DEFAULT '',
  cover_config JSONB NOT NULL DEFAULT '{
    "documentCode": "ปพ.5",
    "documentTitle": "แบบบันทึกผลการพัฒนาคุณภาพผู้เรียนรายวิชา",
    "subtitle": "ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)",
    "themeStyle": "academic-navy-gold",
    "showLogo": true,
    "showGaruda": false,
    "showSummaryTable": true,
    "showApprovalBlock": true,
    "footerCredit": "พัฒนาระบบโดย นายปิยะพันธุ์ ขันไร่ ตำแหน่ง ครู วิทยฐานะครูชำนาญการ โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1"
  }'::jsonb,
  scoring_preset JSONB NOT NULL DEFAULT '{
    "defaultRatio": { "formative": 60, "midterm": 20, "final": 20 },
    "minAttendancePct": 80,
    "traitsScaleMax": 3,
    "rtwScaleMax": 3
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'ครู',
  academic_standing TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('executive', 'admin', 'teacher')),
  learning_area TEXT DEFAULT '',
  homeroom_grade TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- ============================================================================
-- 3. STUDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT UNIQUE NOT NULL,
  national_id TEXT DEFAULT '',
  prefix TEXT NOT NULL DEFAULT 'เด็กชาย',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'ช' CHECK (gender IN ('ช', 'ญ', 'อื่นๆ')),
  grade_level TEXT NOT NULL,
  classroom TEXT NOT NULL DEFAULT '1',
  student_number INTEGER NOT NULL DEFAULT 1,
  academic_year TEXT NOT NULL DEFAULT '2569',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'inactive')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_grade_class ON public.students (grade_level, classroom, student_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);

-- ============================================================================
-- 4. SUBJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  learning_area TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน' CHECK (subject_type IN ('พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน')),
  credits NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  hours_per_semester INTEGER NOT NULL DEFAULT 40,
  hours_per_year INTEGER NOT NULL DEFAULT 80,
  hours_per_week NUMERIC(4,1) NOT NULL DEFAULT 2.0,
  semester TEXT NOT NULL DEFAULT '1',
  sort_order INTEGER NOT NULL DEFAULT 100,
  curriculum_year TEXT NOT NULL DEFAULT 'หลักสูตรแกนกลาง 2551 (ปรับปรุง 2560)',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_code, grade_level)
);

CREATE INDEX IF NOT EXISTS idx_subjects_lookup ON public.subjects (learning_area, grade_level);

-- ============================================================================
-- 5. CURRICULUM INDICATORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.curriculum_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code TEXT UNIQUE NOT NULL,
  learning_area TEXT NOT NULL,
  strand TEXT NOT NULL,
  standard_code TEXT NOT NULL,
  standard_text TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ตัวชี้วัดระหว่างทาง', 'ตัวชี้วัดปลายทาง')),
  indicator_text TEXT NOT NULL,
  curriculum_version TEXT NOT NULL DEFAULT 'หลักสูตรแกนกลาง 2551 (ปรับปรุง 2560 & ตัวชี้วัดระหว่างทาง/ปลายทาง สพฐ.)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicators_area_grade ON public.curriculum_indicators (learning_area, grade_level);
CREATE INDEX IF NOT EXISTS idx_indicators_standard ON public.curriculum_indicators (standard_code);

-- ============================================================================
-- 6. TEACHER COURSES (ปพ.5 ประจำรายวิชา + ข้อความตัวชี้วัดพิมพ์ลงเล่มอัตโนมัติ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  learning_area TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน' CHECK (subject_type IN ('พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน')),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  grade_level TEXT NOT NULL,
  classroom TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2569',
  semester TEXT NOT NULL DEFAULT '1',
  credits NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  total_hours INTEGER NOT NULL DEFAULT 40,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  selected_indicator_ids UUID[] NOT NULL DEFAULT '{}',
  custom_indicators_text TEXT NOT NULL DEFAULT '',
  indicators_status TEXT NOT NULL DEFAULT 'sample' CHECK (indicators_status IN ('sample', 'confirmed')),
  cover_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'submitted', 'revision_requested', 'approved')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  executive_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON public.teacher_courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.teacher_courses (subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_approved_by ON public.teacher_courses (approved_by);
CREATE INDEX IF NOT EXISTS idx_courses_grade_status ON public.teacher_courses (grade_level, status);

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS hours_per_year INTEGER NOT NULL DEFAULT 80;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester TEXT NOT NULL DEFAULT '1';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.teacher_courses ADD COLUMN IF NOT EXISTS subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน';

-- ============================================================================
-- 7. ATTENDANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.teacher_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  period_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'personal_leave', 'sick_leave', 'late')),
  remark TEXT DEFAULT '',
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id, session_date, period_number)
);

CREATE INDEX IF NOT EXISTS idx_attendance_course_date ON public.attendance (course_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON public.attendance (recorded_by);

-- ============================================================================
-- 8. SCORE STRUCTURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.score_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID UNIQUE NOT NULL REFERENCES public.teacher_courses(id) ON DELETE CASCADE,
  formative_ratio INTEGER NOT NULL DEFAULT 60,
  midterm_ratio INTEGER NOT NULL DEFAULT 20,
  final_ratio INTEGER NOT NULL DEFAULT 20,
  units JSONB NOT NULL DEFAULT '[]'::jsonb,
  grading_policy JSONB NOT NULL DEFAULT '{
    "minAttendancePct": 80,
    "requireFinalExam": true
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ratio_sum CHECK (formative_ratio + midterm_ratio + final_ratio = 100)
);

-- ============================================================================
-- 9. STUDENT SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.teacher_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  unit_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  formative_total NUMERIC(5,2) NOT NULL DEFAULT 0,
  midterm_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT '0',
  special_status TEXT CHECK (special_status IS NULL OR special_status IN ('ร', 'มส')),
  teacher_note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_scores_course ON public.student_scores (course_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student ON public.student_scores (student_id);

-- ============================================================================
-- 10. CHARACTERISTICS SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.characteristics_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.teacher_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  characteristics_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  traits JSONB NOT NULL DEFAULT '{}'::jsonb,
  traits_avg NUMERIC(4,2) NOT NULL DEFAULT 0,
  traits_level INTEGER NOT NULL DEFAULT 3 CHECK (traits_level BETWEEN 0 AND 3),
  reading_thinking_writing JSONB NOT NULL DEFAULT '{}'::jsonb,
  rtw_avg NUMERIC(4,2) NOT NULL DEFAULT 0,
  rtw_level INTEGER NOT NULL DEFAULT 3 CHECK (rtw_level BETWEEN 0 AND 3),
  competencies JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_characteristics_course ON public.characteristics_scores (course_id);
CREATE INDEX IF NOT EXISTS idx_characteristics_student ON public.characteristics_scores (student_id);

-- ============================================================================
-- 11. CLASSROOM PP.5 SUMMARIES (ปพ.5 รายชั้นเรียน สำหรับครูประจำชั้น)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classroom_pp5_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level TEXT NOT NULL,
  classroom TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2569',
  semester TEXT NOT NULL DEFAULT '1',
  homeroom_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_decisions JSONB NOT NULL DEFAULT '{}'::jsonb,
  activities_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  class_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'submitted', 'revision_requested', 'approved')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executive_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade_level, classroom, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_classroom_pp5_grade ON public.classroom_pp5_summaries (grade_level, classroom);
CREATE INDEX IF NOT EXISTS idx_classroom_pp5_teacher ON public.classroom_pp5_summaries (homeroom_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_pp5_approved_by ON public.classroom_pp5_summaries (approved_by);

-- ============================================================================
-- 12. PRIMARY 2568 ASSESSMENTS (ปพ.5 ป.1-3 หลักสูตร 2568 & ปพ.6 รายบุคคล)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.primary2568_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL CHECK (grade_level IN ('ป.1', 'ป.2', 'ป.3')),
  classroom TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2569',
  semester TEXT NOT NULL DEFAULT '1',
  capabilities JSONB NOT NULL DEFAULT '{
    "c1": 3, "c2": 3, "c3": 3, "c4": 3,
    "c5": 3, "c6": 3, "c7": 3, "c8": 3
  }'::jsonb,
  traits_5 JSONB NOT NULL DEFAULT '{
    "t1": true, "t2": true, "t3": true, "t4": true, "t5": true
  }'::jsonb,
  activities_pass BOOLEAN NOT NULL DEFAULT TRUE,
  grade3_central_result TEXT DEFAULT '',
  grade3_central_note TEXT DEFAULT '',
  teacher_comment TEXT DEFAULT '',
  school_level_labels JSONB NOT NULL DEFAULT '{
    "4": "ดีเยี่ยม (เชี่ยวชาญ)",
    "3": "ดี (คล่องแคล่ว)",
    "2": "พอใช้ (กำลังพัฒนา)",
    "1": "ควรเสริม (เริ่มต้น)"
  }'::jsonb,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_primary2568_grade ON public.primary2568_assessments (grade_level, classroom, academic_year);
CREATE INDEX IF NOT EXISTS idx_primary2568_recorded_by ON public.primary2568_assessments (recorded_by);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at & Safe Auth Sync
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'system_settings', 'users', 'students', 'subjects',
      'teacher_courses', 'attendance', 'score_structures',
      'student_scores', 'characteristics_scores',
      'classroom_pp5_summaries', 'primary2568_assessments'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', tbl, tbl);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND auth_user_id IS NULL;

  IF NOT FOUND THEN
    INSERT INTO public.users (auth_user_id, email, full_name, role, position)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
      'teacher',
      'ครูผู้สอน'
    )
    ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- ============================================================================
-- SECURITY HELPER FUNCTIONS (Private non-exposed schema)
-- ============================================================================
CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = (SELECT auth.uid()) AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users
  WHERE auth_user_id = (SELECT auth.uid()) AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_course_owner(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_courses c
    JOIN public.users u ON u.id = c.teacher_id
    WHERE c.id = target_course_id
      AND u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.current_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_course_owner(UUID) FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_course_owner(UUID) TO authenticated;

-- ============================================================================
-- DATA API GRANTS & ROW LEVEL SECURITY (RLS)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.system_settings,
  public.users,
  public.students,
  public.subjects,
  public.curriculum_indicators,
  public.teacher_courses,
  public.attendance,
  public.score_structures,
  public.student_scores,
  public.characteristics_scores,
  public.classroom_pp5_summaries,
  public.primary2568_assessments
TO authenticated;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characteristics_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_pp5_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary2568_assessments ENABLE ROW LEVEL SECURITY;

-- system_settings
DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;
CREATE POLICY "system_settings_select_all" ON public.system_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "system_settings_admin_insert" ON public.system_settings;
CREATE POLICY "system_settings_admin_insert" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "system_settings_admin_update" ON public.system_settings;
CREATE POLICY "system_settings_admin_update" ON public.system_settings
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin')
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "system_settings_admin_delete" ON public.system_settings;
CREATE POLICY "system_settings_admin_delete" ON public.system_settings
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- users
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
CREATE POLICY "users_admin_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "users_admin_delete" ON public.users;
CREATE POLICY "users_admin_delete" ON public.users
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;
CREATE POLICY "users_update_admin_or_self" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin' OR auth_user_id = (SELECT auth.uid()))
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (auth_user_id = (SELECT auth.uid()) AND role = (SELECT private.current_user_role()))
  );

-- students
DROP POLICY IF EXISTS "students_select_authenticated" ON public.students;
CREATE POLICY "students_select_authenticated" ON public.students
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "students_admin_insert" ON public.students;
CREATE POLICY "students_admin_insert" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "students_admin_update" ON public.students;
CREATE POLICY "students_admin_update" ON public.students
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin')
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "students_admin_delete" ON public.students;
CREATE POLICY "students_admin_delete" ON public.students
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- subjects
DROP POLICY IF EXISTS "subjects_select_authenticated" ON public.subjects;
CREATE POLICY "subjects_select_authenticated" ON public.subjects
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
CREATE POLICY "subjects_admin_insert" ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
CREATE POLICY "subjects_admin_update" ON public.subjects
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin')
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;
CREATE POLICY "subjects_admin_delete" ON public.subjects
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- curriculum_indicators
DROP POLICY IF EXISTS "indicators_select_authenticated" ON public.curriculum_indicators;
CREATE POLICY "indicators_select_authenticated" ON public.curriculum_indicators
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "indicators_admin_insert" ON public.curriculum_indicators;
CREATE POLICY "indicators_admin_insert" ON public.curriculum_indicators
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "indicators_admin_update" ON public.curriculum_indicators;
CREATE POLICY "indicators_admin_update" ON public.curriculum_indicators
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin')
  WITH CHECK ((SELECT private.current_user_role()) = 'admin');
DROP POLICY IF EXISTS "indicators_admin_delete" ON public.curriculum_indicators;
CREATE POLICY "indicators_admin_delete" ON public.curriculum_indicators
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- teacher_courses
DROP POLICY IF EXISTS "courses_select_role_scoped" ON public.teacher_courses;
CREATE POLICY "courses_select_role_scoped" ON public.teacher_courses
  FOR SELECT TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher')
    OR teacher_id = (SELECT private.current_user_id())
  );
DROP POLICY IF EXISTS "courses_insert_teacher_admin" ON public.teacher_courses;
CREATE POLICY "courses_insert_teacher_admin" ON public.teacher_courses
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR teacher_id = (SELECT private.current_user_id())
  );
DROP POLICY IF EXISTS "courses_update_owner_admin_exec" ON public.teacher_courses;
CREATE POLICY "courses_update_owner_admin_exec" ON public.teacher_courses
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive')
    OR teacher_id = (SELECT private.current_user_id())
  )
  WITH CHECK (
    (SELECT private.current_user_role()) IN ('admin', 'executive')
    OR teacher_id = (SELECT private.current_user_id())
  );
DROP POLICY IF EXISTS "courses_delete_owner_or_admin" ON public.teacher_courses;
CREATE POLICY "courses_delete_owner_or_admin" ON public.teacher_courses
  FOR DELETE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (teacher_id = (SELECT private.current_user_id()) AND status IN ('draft', 'in_progress'))
  );

-- attendance
DROP POLICY IF EXISTS "attendance_select_scoped" ON public.attendance;
CREATE POLICY "attendance_select_scoped" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher')
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "attendance_insert_owner_admin" ON public.attendance;
CREATE POLICY "attendance_insert_owner_admin" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "attendance_update_owner_admin" ON public.attendance;
CREATE POLICY "attendance_update_owner_admin" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  )
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "attendance_delete_owner_admin" ON public.attendance;
CREATE POLICY "attendance_delete_owner_admin" ON public.attendance
  FOR DELETE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );

-- score_structures
DROP POLICY IF EXISTS "score_structures_select_scoped" ON public.score_structures;
CREATE POLICY "score_structures_select_scoped" ON public.score_structures
  FOR SELECT TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher')
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "score_structures_insert_owner_admin" ON public.score_structures;
CREATE POLICY "score_structures_insert_owner_admin" ON public.score_structures
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "score_structures_update_owner_admin" ON public.score_structures;
CREATE POLICY "score_structures_update_owner_admin" ON public.score_structures
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  )
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "score_structures_delete_owner_admin" ON public.score_structures;
CREATE POLICY "score_structures_delete_owner_admin" ON public.score_structures
  FOR DELETE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );

-- student_scores
DROP POLICY IF EXISTS "student_scores_select_scoped" ON public.student_scores;
CREATE POLICY "student_scores_select_scoped" ON public.student_scores
  FOR SELECT TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher')
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "student_scores_insert_owner_admin" ON public.student_scores;
CREATE POLICY "student_scores_insert_owner_admin" ON public.student_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "student_scores_update_owner_admin" ON public.student_scores;
CREATE POLICY "student_scores_update_owner_admin" ON public.student_scores
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  )
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "student_scores_delete_owner_admin" ON public.student_scores;
CREATE POLICY "student_scores_delete_owner_admin" ON public.student_scores
  FOR DELETE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );

-- characteristics_scores
DROP POLICY IF EXISTS "characteristics_select_scoped" ON public.characteristics_scores;
CREATE POLICY "characteristics_select_scoped" ON public.characteristics_scores
  FOR SELECT TO authenticated
  USING (
    (SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher')
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "characteristics_insert_owner_admin" ON public.characteristics_scores;
CREATE POLICY "characteristics_insert_owner_admin" ON public.characteristics_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "characteristics_update_owner_admin" ON public.characteristics_scores;
CREATE POLICY "characteristics_update_owner_admin" ON public.characteristics_scores
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  )
  WITH CHECK (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );
DROP POLICY IF EXISTS "characteristics_delete_owner_admin" ON public.characteristics_scores;
CREATE POLICY "characteristics_delete_owner_admin" ON public.characteristics_scores
  FOR DELETE TO authenticated
  USING (
    (SELECT private.current_user_role()) = 'admin'
    OR (SELECT private.is_course_owner(course_id))
  );

-- classroom_pp5_summaries
DROP POLICY IF EXISTS "classroom_pp5_select_auth" ON public.classroom_pp5_summaries;
CREATE POLICY "classroom_pp5_select_auth" ON public.classroom_pp5_summaries
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "classroom_pp5_insert_auth" ON public.classroom_pp5_summaries;
CREATE POLICY "classroom_pp5_insert_auth" ON public.classroom_pp5_summaries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher'));
DROP POLICY IF EXISTS "classroom_pp5_update_auth" ON public.classroom_pp5_summaries;
CREATE POLICY "classroom_pp5_update_auth" ON public.classroom_pp5_summaries
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher'))
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'executive', 'teacher'));
DROP POLICY IF EXISTS "classroom_pp5_delete_auth" ON public.classroom_pp5_summaries;
CREATE POLICY "classroom_pp5_delete_auth" ON public.classroom_pp5_summaries
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- primary2568_assessments
DROP POLICY IF EXISTS "primary2568_select_auth" ON public.primary2568_assessments;
CREATE POLICY "primary2568_select_auth" ON public.primary2568_assessments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "primary2568_insert_auth" ON public.primary2568_assessments;
CREATE POLICY "primary2568_insert_auth" ON public.primary2568_assessments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'teacher'));
DROP POLICY IF EXISTS "primary2568_update_auth" ON public.primary2568_assessments;
CREATE POLICY "primary2568_update_auth" ON public.primary2568_assessments
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'teacher'))
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'teacher'));
DROP POLICY IF EXISTS "primary2568_delete_auth" ON public.primary2568_assessments;
CREATE POLICY "primary2568_delete_auth" ON public.primary2568_assessments
  FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'admin');

-- ============================================================================
-- STORAGE BUCKET: school-images
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-images', 'school-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "school_images_public_read" ON storage.objects;
CREATE POLICY "school_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'school-images');

DROP POLICY IF EXISTS "school_images_auth_insert" ON storage.objects;
CREATE POLICY "school_images_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'school-images');

DROP POLICY IF EXISTS "school_images_auth_update" ON storage.objects;
CREATE POLICY "school_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'school-images')
  WITH CHECK (bucket_id = 'school-images');

DROP POLICY IF EXISTS "school_images_auth_delete" ON storage.objects;
CREATE POLICY "school_images_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'school-images' AND (SELECT private.current_user_role()) = 'admin');
