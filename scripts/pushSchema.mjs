import fs from 'node:fs';
import path from 'node:path';
import { ensureSchema, getDb, isTursoConfigured } from '../server/db.js';

function loadEnvIntoProcess() {
  for (const fname of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), fname);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnvIntoProcess();

if (!isTursoConfigured()) {
  console.error(
    'ไม่พบค่า TURSO_DATABASE_URL / TURSO_AUTH_TOKEN ใน .env หรือ environment variables'
  );
  process.exit(1);
}

const db = getDb();
await ensureSchema(db);
console.log(`สร้างตาราง SQL ทั้งหมดลงฐานข้อมูล ${process.env.TURSO_DATABASE_URL} สำเร็จ`);
