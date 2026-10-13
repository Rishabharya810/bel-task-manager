# BEL Task Command Center

Employee Task Management System (ETMS) for the BEL internship portfolio project.

**Live URL:** https://rishabharya810.github.io/bel-task-manager/

> **Status:** Phase 1 complete — Vite scaffold, GitHub Pages CI/CD, and Supabase schema are in place. The app currently renders the login UI; auth/task features activate once a Supabase project is connected.

## Tech stack
- **Frontend:** HTML5, CSS3, vanilla JavaScript, Vite
- **Backend / Database / Auth:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Reporting:** jsPDF + SheetJS (client-side exports)
- **Deployment:** GitHub Pages (auto-deploy on every push to `main`)
- **CI/CD:** GitHub Actions

## Project structure

```
├── .github/workflows/build.yml   # Build + deploy to GitHub Pages
├── public/                     # Static assets (BEL logos, favicon)
├── src/
│   ├── main.js                 # App entry point
│   └── style.css               # Global styles
├── supabase/
│   ├── migrations/               # Schema + RLS policies
│   └── seed.sql                # Demo users, tasks, logs
├── eslint.config.js
├── vite.config.js
├── .env.example
└── README.md
```

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

## Demo accounts (defined in seed.sql)

| Email | Password | Role |
|---|---|---|
| admin@bel.com | (set after signup) | Admin |
| manager@bel.com | (set after signup) | Manager |
| employee1@bel.com | (set after signup) | Employee |
| employee2@bel.com | (set after signup) | Employee |

> Note: seed users use placeholder passwords; reset them via Supabase Auth after initial setup.

## License

MIT
