import { ensureSchema, getDb } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { makeUuid, mapAcademicDocumentRow, sortAcademicDocuments } from '../server/mappers.js';

export async function GET(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const docType = url.searchParams.get('docType');
    const gradeLevel = url.searchParams.get('gradeLevel');
    const classroom = url.searchParams.get('classroom');

    const conditions = [];
    const args = [];
    if (id) {
      conditions.push('id = ?');
      args.push(id);
    }
    if (docType) {
      conditions.push('doc_type = ?');
      args.push(docType);
    }
    if (gradeLevel) {
      conditions.push('grade_level = ?');
      args.push(gradeLevel);
    }
    if (classroom) {
      conditions.push('classroom = ?');
      args.push(String(classroom));
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await db.execute({
      sql: `SELECT * FROM academic_documents ${whereSql}`,
      args,
    });
    return jsonOk({
      documents: sortAcademicDocuments((res.rows || []).map(mapAcademicDocumentRow)),
    });
  } catch (err) {
    console.error('[api/documents GET] failed:', err);
    return jsonError('ไม่สามารถดึงข้อมูลเอกสารประเมินผลได้', 500);
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const doc = body.document || body || {};
    const docType = String(doc.doc_type || '').trim();
    const title = String(doc.title || '').trim();
    if (!docType || !title) {
      return jsonError('กรุณาระบุประเภทเอกสาร (doc_type) และชื่อเอกสาร (title)', 400);
    }

    const existingId = doc.id ? String(doc.id).trim() : '';
    const existingRes = existingId
      ? await db.execute({ sql: 'SELECT * FROM academic_documents WHERE id = ? LIMIT 1', args: [existingId] })
      : { rows: [] };
    const existing = existingRes.rows?.[0] || null;

    if (existing && user.role !== 'admin' && existing.owner_id !== user.id) {
      if (user.role !== 'executive') {
        return jsonError('คุณไม่มีสิทธิ์แก้ไขเอกสารของครูท่านอื่น', 403);
      }
    }

    const id = existing?.id || existingId || makeUuid();
    const ownerId = existing?.owner_id || (user.role === 'admin' && doc.owner_id ? doc.owner_id : user.id);
    const validStatuses = ['draft', 'in_progress', 'completed', 'submitted', 'approved'];
    const status = validStatuses.includes(doc.status)
      ? doc.status
      : existing?.status || 'in_progress';
    const pct = Math.min(100, Math.max(0, Math.round(Number(doc.completion_pct ?? existing?.completion_pct ?? 0))));
    const nowIso = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO academic_documents (
              id, doc_type, title, grade_level, classroom, academic_year, semester,
              student_id, owner_id, status, completion_pct, payload, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              doc_type = excluded.doc_type,
              title = excluded.title,
              grade_level = excluded.grade_level,
              classroom = excluded.classroom,
              academic_year = excluded.academic_year,
              semester = excluded.semester,
              student_id = excluded.student_id,
              status = excluded.status,
              completion_pct = excluded.completion_pct,
              payload = excluded.payload,
              updated_at = excluded.updated_at`,
      args: [
        id,
        docType,
        title,
        String(doc.grade_level ?? existing?.grade_level ?? ''),
        String(doc.classroom ?? existing?.classroom ?? '1'),
        String(doc.academic_year ?? existing?.academic_year ?? '2569'),
        String(doc.semester ?? existing?.semester ?? '1'),
        doc.student_id ? String(doc.student_id) : null,
        ownerId,
        status,
        pct,
        JSON.stringify(doc.payload || {}),
        nowIso,
      ],
    });

    const refreshed = await db.execute({
      sql: 'SELECT * FROM academic_documents WHERE id = ? LIMIT 1',
      args: [id],
    });
    return jsonOk({ document: mapAcademicDocumentRow(refreshed.rows?.[0]) });
  } catch (err) {
    console.error('[api/documents POST] failed:', err);
    return jsonError(err?.message || 'บันทึกเอกสารประเมินผลไม่สำเร็จ', 500);
  }
}

export async function DELETE(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const body = idFromQuery ? {} : await parseJsonBody(request);
    const docId = String(idFromQuery || body.id || '').trim();
    if (!docId) return jsonError('ไม่พบรหัสเอกสารที่ต้องการลบ', 400);

    const existingRes = await db.execute({
      sql: 'SELECT id, owner_id FROM academic_documents WHERE id = ? LIMIT 1',
      args: [docId],
    });
    const existing = existingRes.rows?.[0];
    if (!existing) return jsonError('ไม่พบเอกสารที่ระบุ', 404);
    if (user.role !== 'admin' && existing.owner_id !== user.id) {
      return jsonError('คุณไม่มีสิทธิ์ลบเอกสารของครูท่านอื่น', 403);
    }

    await db.execute({ sql: 'DELETE FROM academic_documents WHERE id = ?', args: [docId] });
    return jsonOk({ ok: true });
  } catch (err) {
    console.error('[api/documents DELETE] failed:', err);
    return jsonError('ลบเอกสารประเมินผลไม่สำเร็จ', 500);
  }
}
