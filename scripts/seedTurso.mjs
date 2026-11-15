import fs from 'node:fs';
import path from 'node:path';
import { getDb, isTursoConfigured } from '../server/db.js';
import { seedDatabaseWithClient } from '../server/seedService.js';

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

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...rest] = arg.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  })
);

const extraAdminEmail = String(args.email || process.env.SEED_ADMIN_EMAIL || '').trim();
const defaultPassword = String(args.password || process.env.SEED_DEFAULT_PASSWORD || '').trim();

const db = getDb();
const res = await seedDatabaseWithClient(db, {
  adminEmails: extraAdminEmail ? [extraAdminEmail] : [],
  defaultPassword,
});

console.log(
  `Seed ข้อมูล SQL สำเร็จ (${res.seededStatements} statements) ลงใน ${process.env.TURSO_DATABASE_URL}`
);
