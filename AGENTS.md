# Ban Hat Khet Pp.5 Academic System — Workspace Guardrails

These rules apply across every session in this repository:

1. **Standalone Turso SQL + Vercel Serverless Architecture (Completely Separated from `hadket`)**:
   - This system uses a dedicated **Turso (libSQL / SQLite)** SQL database paired with **Vercel Serverless Functions (`api/`)** and cookie-backed Auth/Session, completely isolated from the Ban Hat Khet school website (`hadket`).
   - Do **not** connect this application to Supabase or Firebase, and never modify any `hadket` database resources.
   - Keep `api/` file count strictly at or below Vercel Hobby's **12 Serverless Functions** limit (currently 10 files in `api/`). Shared server helpers MUST live under `server/`, never inside `api/`.
   - Images (`logo_url`, `emblem_url`, `director_signature_url`) are compressed client-side into Data URLs via `src/lib/mediaUtils.js` and stored directly inside the SQL `system_settings` table so no paid blob/object storage is needed.

2. **Strict Account Isolation, Server RBAC & PII Separation**:
   - Authentication uses per-user `scrypt` password hashes in SQL `users` and `HttpOnly` session cookies (`pp5_session`) tracked in SQL `sessions`.
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `SESSION_SECRET` are **server-only** environment variables (never prefix with `VITE_`).
   - API endpoints under `api/` enforce session authentication and role checks (`admin`, `executive`, `teacher`) plus course ownership checks server-side.
   - `/api/bootstrap` strips `email` and `phone` from the `users` list for non-admin sessions, and `password_hash` is never exposed to any client.

3. **Keep SQL Schema, Seed Service & Client Data Layer Synced**:
   - Whenever modifying SQL tables, columns, indexes, or queries in `db/schema.sql`, `server/schema.js`, `server/mappers.js`, or `api/*.js`, keep `server/seedService.js`, `scripts/pushSchema.mjs`, `scripts/seedTurso.mjs`, and `src/services/dataService.js` synchronized, then verify API/SQL tests and `npm run build` pass.
