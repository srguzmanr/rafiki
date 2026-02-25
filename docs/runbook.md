# Rafiki — Setup & Deployment Runbook

**Last updated:** Phase 5 (February 2026)  
**Stack:** React + Vite · Supabase · GitHub Pages  
**Repo pattern:** `srguzmanr/rafiki`

---

## Prerequisites

- Node.js 18+
- Supabase CLI: `npm install -g supabase`
- GitHub account with repo created
- Supabase account (free tier — pause other projects if at 2-project limit)

---

## 1. Supabase Setup

### 1.1 Create the project

1. Go to supabase.com → New project
2. Name: `rafiki`
3. Region: US East (or closest to Mexico)
4. Generate a strong database password — **save it**
5. Wait for project to provision (~2 min)

### 1.2 Get credentials

From your Supabase project → Settings → API:

- `Project URL` → your `VITE_SUPABASE_URL`
- `anon / public` key → your `VITE_SUPABASE_ANON_KEY`

### 1.3 Link and run migrations

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Run all four migrations in order. Supabase CLI runs them sequentially.

Verify in Table Editor: you should see `organizations`, `profiles`, `user_roles`, `sorteos`, `prizes`, `boletos`, `sales`, `vendedor_assignments`, `audit_log`.

### 1.4 Deploy the Edge Function

```bash
supabase functions deploy generate-boletos
```

This is the boleto generation function. Required before any sorteo can be activated.

---

## 2. Local Development

### 2.1 Clone and install

```bash
git clone https://github.com/srguzmanr/rafiki
cd rafiki
npm install
```

### 2.2 Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 2.3 Run dev server

```bash
npm run dev
```

App runs at `http://localhost:5173/rafiki/`

---

## 3. Seed Data (First-Time Setup)

### 3.1 Create the admin account

In Supabase Auth → Authentication → Users → **Add user**:

- Email: `admin@rafiki.mx` (or your internal email)
- Password: set securely

Then in Table Editor → `user_roles` → Insert row:
```json
{
  "user_id": "<admin user UUID from Auth>",
  "organization_id": null,
  "role": "admin",
  "status": "active"
}
```

### 3.2 Create an Organizador tenant

1. Log in as admin at `/#/`
2. Use the AdminDashboard → "Nueva organización"
3. Fill in: name, slug, contact email

### 3.3 Create Organizador user

In Supabase Auth → Authentication → Users → **Invite user** (sends email):
- Email: organizador's email

After they accept and set password, in `user_roles` → Insert:
```json
{
  "user_id": "<organizador UUID>",
  "organization_id": "<org UUID from organizations table>",
  "role": "organizador",
  "status": "active"
}
```

### 3.4 Create Vendedor user

Same flow as organizador, but `role: "vendedor"`.

The organizador can then log in and assign the vendedor to their sorteos from the SorteoDetail view.

---

## 4. Smoke Tests

Run these after every migration deployment to verify the system is functional.

### A. Auth flow
- Log in as admin → see AdminDashboard
- Log in as organizador → see OrgDashboard
- Log in as vendedor → see VendedorDashboard
- Visit `/#/org/YOUR_SLUG` without auth → see public sorteo page

### B. Sorteo lifecycle
- Organizador: create sorteo (draft)
- Activate → boleto generation begins (watch for spinner)
- Confirm boleto count in Table Editor: `SELECT COUNT(*) FROM boletos WHERE sorteo_id = 'X'`
- Close sorteo → verify status change

### C. Vendedor sale (30-second test)
- Log in as vendedor on mobile
- Tap sorteo → "⚡ Siguiente disponible"
- Enter buyer name + phone
- Confirm sale
- Verify in Table Editor: `SELECT * FROM sales ORDER BY created_at DESC LIMIT 1`

### D. Online purchase
- Visit `/#/sorteo/YOUR_SLUG/SORTEO_ID`
- Select 2 boletos
- Enter buyer info (email required)
- Confirm
- Verify `sale_channel = 'online'` in sales table

### E. Participante registration
- Click "Registrarme" on `/#/mis-boletos`
- Fill in name, email, password
- Submit
- Verify `user_roles` row created with `role = 'participante'`
  - **This was a silent failure in Phase 4.** Fixed in Phase 5 via `grant_participante_role()` SECURITY DEFINER. If registration succeeds but role is missing, the migration 000004 was not applied.

### F. Reporting
- Organizador: open a sorteo with sales → "📊 Reporte" button
- Verify vendedor breakdown table shows correct counts
- Click "⬇ Descargar CSV" → confirm file downloads with correct columns
- Check BOM: open in Excel and verify accented characters display correctly

### G. Admin panel
- Log in as admin
- Verify org list shows with stats
- Create a new test org → confirm row appears
- Toggle status → confirm badge updates

---

## 5. GitHub Pages Deployment

### 5.1 Set GitHub Secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 5.2 Enable GitHub Pages

Repository → Settings → Pages:
- Source: **GitHub Actions**

### 5.3 Deploy

Push to `main`:

```bash
git add .
git commit -m "deploy"
git push origin main
```

The workflow (`.github/workflows/deploy.yml`) runs automatically:
1. Installs dependencies
2. Builds with Vite (injects env vars)
3. Deploys `dist/` to GitHub Pages

Live URL: `https://srguzmanr.github.io/rafiki/`

### 5.4 Hash routing note

The app uses `HashRouter` (`/#/path`). This is required on GitHub Pages because there is no server-side routing — all navigation is client-side. Deep links work correctly. No 404 on refresh.

---

## 6. Database Migrations (Ongoing)

Every schema change goes through a migration file:

```bash
# Create new migration
touch supabase/migrations/YYYYMMDDNNNNNN_description.sql

# Test locally
psql -d rafiki_test -f supabase/migrations/YYYYMMDDNNNNNN_description.sql

# Deploy to Supabase
supabase db push
```

**Naming convention:** `YYYYMMDD000N_phaseN_description.sql`  
**Never edit a deployed migration.** Always add a new one.  
**Document every migration** in `docs/schema.md` migration history table.

---

## 7. CSV Export Notes

- Generated entirely client-side — no server needed
- Includes UTF-8 BOM (`\uFEFF`) for correct Excel rendering of accented characters (ñ, á, é, etc.)
- Timezone: `America/Hermosillo` (UTC-7, no DST) — matches ITSON's location
- Filename pattern: `{sorteo_title}_ventas_{YYYY-MM-DD}.csv`

---

## 8. Phase 6 Handoff (Arturo — CTO)

Phase 6 requires the Supabase **service role key** for server-side operations. Do not expose it in the frontend. Required for:

**Stripe integration:**
- Payment intent creation (server-side)
- Webhook handling: `payment_intent.succeeded` → update `sales.payment_status = 'confirmed'`
- The `claim_boleto_online()` function already creates sales with `payment_status = 'pending'`. Stripe confirms them.

**Auditable randomness engine:**
- Reads the `sorteos` table — needs service role to update `drawing_result`
- Must set `sorteos.status = 'drawn'` after result is committed (via `transition_sorteo_status()`)
- Result must be immutable once written — the trigger blocks status changes on drawn sorteos

**User invite flow:**
- Currently, admin creates org records and manually creates users in Supabase Auth UI
- Full invite flow: POST to Supabase Admin API (`/auth/v1/invite`) with service role key
- Arturo should implement as a Supabase Edge Function: `invite-organizador(email, org_id)`

---

## 9. Troubleshooting

### "sin rol asignado" after login
User exists in Auth but has no `user_roles` row. Causes:
- For participantes: Phase 5 migration not applied (`grant_participante_role()` function missing)
- For organizadores/vendedores: admin didn't create the `user_roles` row manually

Fix: insert the row directly in Table Editor or run the function.

### Boleto generation spinner never resolves
The `generate-boletos` Edge Function is not deployed or has an error.  
Check: Supabase Dashboard → Edge Functions → `generate-boletos` → Logs.

### CSV opens garbled in Excel
The BOM `\uFEFF` should handle this. If it doesn't on a specific Excel version, open via Data → From Text/CSV and select UTF-8 encoding.

### `claim_boleto_online` returns `race_condition`
Two users claimed the same boleto simultaneously between the pre-check and the claim. The UI handles this by removing the unavailable boletos from the cart and asking the user to select again. No action required — this is expected behavior.

### Supabase free tier — 2 project limit
Pause the Club Rifa project before creating the Rafiki project.  
Dashboard → Club Rifa → Settings → Pause project.
