# BEL Task Command Center - Runbook

## Live environment
- **GitHub repo:** https://github.com/Rishabharya810/bel-task-manager
- **Live URL:** https://rishabharya810.github.io/bel-task-manager/
- **Supabase project:** https://supabase.com/dashboard/project/dzhtfrdrgszyqxzopxen

## CI/CD
Every push to `main` triggers `.github/workflows/build.yml`:
1. Installs Node.js 22.16.0
2. Runs `npm run lint`
3. Runs `npm run build` (with Supabase secrets from GitHub Actions)
4. Deploys the `dist/` folder to GitHub Pages

## Demo credentials
See `README.md` for live demo accounts.

## Common operations

### Update Supabase schema
```bash
npx supabase migration new <description>
# edit supabase/migrations/<timestamp>_<description>.sql
npx supabase db push
```

### Reset local data
```bash
npx supabase db reset
```

### Add demo accounts
Edit `scripts/seed-cloud.mjs` and run:
```bash
node scripts/seed-cloud.mjs
```

### Rollback a bad deployment
In GitHub, revert the last commit on `main`. The workflow will redeploy the previous version automatically.

### Monitor
- GitHub Actions: `https://github.com/Rishabharya810/bel-task-manager/actions`
- Supabase logs: `https://supabase.com/dashboard/project/dzhtfrdrgszyqxzopxen/logs`

## Known trade-offs
- Frontend bundle is large (~935 KB) because jsPDF + html2canvas + xlsx are bundled. Acceptable for a demo; for production, split reports into dynamic imports.
- Reports are client-side generated from data already visible to the user.
- The app assumes a single active Supabase project and GitHub Pages site.
