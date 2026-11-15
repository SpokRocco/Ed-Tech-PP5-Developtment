import { ensureSchema, getDb } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { mapSystemSettingsRow } from '../server/mappers.js';
import { DEMO_SYSTEM_SETTINGS } from '../src/data/demoSeedData.js';

export async function PUT(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const patch = await parseJsonBody(request);
    const existingRes = await db.execute('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
    const existing = existingRes.rows?.[0]
      ? mapSystemSettingsRow(existingRes.rows[0])
      : DEMO_SYSTEM_SETTINGS;

    const merged = {
      ...existing,
      ...patch,
      id: 1,
      updated_at: new Date().toISOString(),
    };

    await db.execute({
      sql: `INSERT INTO system_settings (
              id, school_name, affiliation, affiliation_short, school_code, address,
              academic_year, semester, director_name, director_title, academic_head_name,
              registrar_name, logo_url, emblem_url, director_signature_url,
              cover_config, scoring_preset, updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              school_name = excluded.school_name,
              affiliation = excluded.affiliation,
              affiliation_short = excluded.affiliation_short,
              school_code = excluded.school_code,
              address = excluded.address,
              academic_year = excluded.academic_year,
              semester = excluded.semester,
              director_name = excluded.director_name,
              director_title = excluded.director_title,
              academic_head_name = excluded.academic_head_name,
              registrar_name = excluded.registrar_name,
              logo_url = excluded.logo_url,
              emblem_url = excluded.emblem_url,
              director_signature_url = excluded.director_signature_url,
              cover_config = excluded.cover_config,
              scoring_preset = excluded.scoring_preset,
              updated_at = excluded.updated_at`,
      args: [
        merged.school_name || DEMO_SYSTEM_SETTINGS.school_name,
        merged.affiliation || DEMO_SYSTEM_SETTINGS.affiliation,
        merged.affiliation_short || '',
        merged.school_code || '',
        merged.address || '',
        merged.academic_year || '2569',
        String(merged.semester || '1'),
        merged.director_name || '',
        merged.director_title || '',
        merged.academic_head_name || '',
        merged.registrar_name || '',
        merged.logo_url || '/school-logo.webp',
        merged.emblem_url || '',
        merged.director_signature_url || '',
        JSON.stringify(merged.cover_config || {}),
        JSON.stringify(merged.scoring_preset || {}),
        merged.updated_at,
      ],
    });

    const refreshed = await db.execute('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
    return jsonOk({ settings: mapSystemSettingsRow(refreshed.rows?.[0]) || merged });
  } catch (err) {
    console.error('[api/settings PUT] failed:', err);
    return jsonError(err?.message || 'บันทึกการตั้งค่าระบบไม่สำเร็จ', 500);
  }
}

export const POST = PUT;
export const PATCH = PUT;
