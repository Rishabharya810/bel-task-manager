# BEL Task Command Center

Employee Task Management System (ETMS) for the BEL internship portfolio project.

> **Status:** Phase 1 scaffold complete. Authentication, database schema, reporting, and deployment are being added in subsequent phases.

## Tech stack
- **Frontend:** HTML5, CSS3, vanilla JavaScript, Vite
- **Backend / Database / Auth:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Deployment:** Cloudflare Pages

## Local development

```bash
cd /c/Users/RISHAB\ ARYA/zcode/bel-task-manager-rebuild
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |

These are client-side values by design; the actual authorization is enforced by Supabase Row-Level Security (RLS).
