# BEL Task Command Center

Employee Task Management System (ETMS) for the BEL internship portfolio project.

**Live URL:** https://rishabharya810.github.io/bel-task-manager/

## What it does
- Role-based access: Admin, Manager, Employee
- Employees log daily tasks with status, priority, and time spent
- Managers view their team's tasks and workload
- Admins manage users, assign managers, and promote roles
- Task detail panel with subtasks/checklist, activity logs, and file attachments
- Reports: export individual or team task data to PDF and Excel
- Dark/light mode and compact density

## Tech stack
- **Frontend:** HTML5, CSS3, vanilla JavaScript, Vite
- **Backend / Database / Auth:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Reporting:** jsPDF + jspdf-autotable + SheetJS (xlsx)
- **Deployment:** GitHub Pages (auto-deploy on every push to `main`)
- **CI/CD:** GitHub Actions

## Project structure

```
├── .github/workflows/build.yml   # Build + deploy to GitHub Pages
├── public/                     # Static assets (BEL logos, favicon)
├── scripts/
│   └── seed-cloud.mjs          # One-time demo-data seeder
├── src/
│   ├── main.js                 # App entry and logic
│   └── style.css               # Global styles
├── supabase/
│   ├── migrations/               # Schema + RLS policies
│   └── seed.sql                # Local demo seed
├── eslint.config.js
├── vite.config.js
├── .env.example
└── README.md
```

## Live demo credentials

| Email | Password | Role |
|---|---|---|
| admin@bel.com | Admin@123 | Admin |
| manager@bel.com | Manager@123 | Manager |
| employee1@bel.com | Employee@1 | Employee |
| employee2@bel.com | Employee@2 | Employee |

## Local development

```bash
cd /c/Users/RISHAB\ ARYA/zcode/bel-task-manager-rebuild
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
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

These are client-side values by design; the real authorization is enforced by Supabase Row-Level Security (RLS).

Set them as GitHub repository secrets (`Settings → Secrets and variables → Actions`) for production builds:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database setup

Schema and seed are in `supabase/migrations/` and `supabase/seed.sql`. To apply locally (requires Docker + `supabase start`):

```bash
npx supabase start
npx supabase db reset
```

To apply to a cloud project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

To seed a cloud project with demo users (set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):

```bash
node scripts/seed-cloud.mjs
```

## Security

- Row-Level Security policies enforce:
  - Employees see only their own tasks + tasks they collaborate on
  - Managers see their own tasks + all direct/indirect subordinates' tasks
  - Admins see everything
- Admin-only actions: role promotion, user deletion
- Storage bucket `attachments` is public-read so file links work, but uploads require authentication

## License

MIT
