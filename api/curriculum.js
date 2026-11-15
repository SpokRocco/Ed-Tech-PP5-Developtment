import { ensureSchema, getDb, runBatchChunked } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import {
  makeUuid,
  mapIndicatorRow,
  mapSubjectRow,
  sortIndicators,
  sortSubjects,
  toNullableNumber,
} from '../server/mappers.js';

function sanitizeSubject(sub) {
  const out = {
    id: sub?.id ? String(sub.id) : '',
    subject_code: String(sub?.subject_code || '').trim(),
    subject_name: String(sub?.subject_name || '').trim(),
    learning_area: String(sub?.learning_area || '').trim(),
    grade_level: String(sub?.grade_level || '').trim(),
    subject_type: String(sub?.subject_type || 'พื้นฐาน').trim() || 'พื้นฐาน',
    credits: toNullableNumber(sub?.credits),
    hours_per_semester: toNullableNumber(sub?.hours_per_semester),
    hours_per_week: toNullableNumber(sub?.hours_per_week),
    hours_per_year: toNullableNumber(sub?.hours_per_year),
    semester: sub?.semester ? String(sub.semester) : '',
    sort_order: Number(sub?.sort_order ?? 1),
    curriculum_year: String(sub?.curriculum_year || '2551/2560'),
    is_active: sub?.is_active !== false,
  };
  return out;
}

function deduplicateSubjects(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.subject_code}::${row.grade_level}`;
    const prev = byKey.get(key);
    if (prev && prev.semester && row.semester && prev.semester !== row.semester) {
      byKey.set(key, { ...prev, ...row, semester: '1-2' });
    } else {
      byKey.set(key, prev ? { ...prev, ...row } : row);
    }
  }
  return Array.from(byKey.values());
}

export async function POST(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const nowIso = new Date().toISOString();

    if (body.action === 'upsert_indicator') {
      const ind = body.indicator || {};
      const code = String(ind.indicator_code || '').trim();
      const text = String(ind.indicator_text || '').trim();
      if (!code || !text) {
        return jsonError('กรุณาระบุรหัสตัวชี้วัดและข้อความตัวชี้วัด', 400);
      }
      const id = String(ind.id || code);
      await db.execute({
        sql: `INSERT INTO curriculum_indicators (
                id, indicator_code, learning_area, strand, standard_code,
                standard_text, grade_level, indicator_type, indicator_text, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(indicator_code) DO UPDATE SET
                learning_area = excluded.learning_area,
                strand = excluded.strand,
                standard_code = excluded.standard_code,
                standard_text = excluded.standard_text,
                grade_level = excluded.grade_level,
                indicator_type = excluded.indicator_type,
                indicator_text = excluded.indicator_text,
                updated_at = excluded.updated_at`,
        args: [
          id,
          code,
          String(ind.learning_area || ''),
          String(ind.strand || ''),
          String(ind.standard_code || ''),
          String(ind.standard_text || ''),
          String(ind.grade_level || ''),
          String(ind.indicator_type || ''),
          text,
          nowIso,
        ],
      });
      const res = await db.execute('SELECT * FROM curriculum_indicators');
      return jsonOk({ indicators: sortIndicators((res.rows || []).map(mapIndicatorRow)) });
    }

    // Default: upsert_subjects
    const rawList = Array.isArray(body.subjects) ? body.subjects : [];
    const cleaned = deduplicateSubjects(rawList.map(sanitizeSubject)).filter(
      (s) => s.subject_code && s.subject_name && s.grade_level
    );

    if (cleaned.length > 0) {
      const statements = cleaned.map((sub) => {
        const id = sub.id || `${sub.grade_level}__${sub.subject_code}` || makeUuid();
        return {
          sql: `INSERT INTO subjects (
                  id, subject_code, subject_name, learning_area, grade_level,
                  subject_type, credits, hours_per_semester, hours_per_week, hours_per_year,
                  semester, sort_order, curriculum_year, is_active, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(subject_code, grade_level) DO UPDATE SET
                  subject_name = excluded.subject_name,
                  learning_area = excluded.learning_area,
                  subject_type = excluded.subject_type,
                  credits = COALESCE(excluded.credits, subjects.credits),
                  hours_per_semester = COALESCE(excluded.hours_per_semester, subjects.hours_per_semester),
                  hours_per_week = COALESCE(excluded.hours_per_week, subjects.hours_per_week),
                  hours_per_year = COALESCE(excluded.hours_per_year, subjects.hours_per_year),
                  semester = CASE WHEN excluded.semester != '' THEN excluded.semester ELSE subjects.semester END,
                  sort_order = excluded.sort_order,
                  curriculum_year = excluded.curriculum_year,
                  is_active = excluded.is_active,
                  updated_at = excluded.updated_at`,
          args: [
            id,
            sub.subject_code,
            sub.subject_name,
            sub.learning_area || 'กิจกรรมพัฒนาผู้เรียน',
            sub.grade_level,
            sub.subject_type,
            sub.credits,
            sub.hours_per_semester,
            sub.hours_per_week,
            sub.hours_per_year,
            sub.semester,
            sub.sort_order,
            sub.curriculum_year,
            sub.is_active ? 1 : 0,
            nowIso,
          ],
        };
      });
      await runBatchChunked(db, statements, 80);
    }

    const updated = await db.execute('SELECT * FROM subjects');
    return jsonOk({ subjects: sortSubjects((updated.rows || []).map(mapSubjectRow)) });
  } catch (err) {
    console.error('[api/curriculum POST] failed:', err);
    return jsonError(err?.message || 'บันทึกโครงสร้างรายวิชา/ตัวชี้วัดไม่สำเร็จ', 500);
  }
}

export async function DELETE(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const body = idFromQuery ? {} : await parseJsonBody(request);
    const targetId = String(idFromQuery || body.id || '').trim();
    if (!targetId) return jsonError('ไม่พบรหัสวิชาที่ต้องการลบ', 400);

    await db.execute({ sql: 'DELETE FROM subjects WHERE id = ?', args: [targetId] });
    return jsonOk({ ok: true });
  } catch (err) {
    console.error('[api/curriculum DELETE] failed:', err);
    return jsonError('ลบรายวิชาไม่สำเร็จ', 500);
  }
}
