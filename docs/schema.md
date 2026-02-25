# Rafiki — Database Schema Documentation

**Last updated:** Phase 5 (February 2026)  
**Database:** Supabase (PostgreSQL 15)  
**Migrations:** `supabase/migrations/`

---

## Migration History

| File | Phase | Description |
|------|-------|-------------|
| `20260213000001_phase1_foundation.sql` | 1 | Core schema: all tables, indexes, RLS, `claim_boleto()`, `generate_boletos()` |
| `20260213000002_phase2_sorteo_core.sql` | 2 | Status transition guard, `sorteos_with_stats`, `public_sorteo_detail`, `vendedor_sales_summary`, `transition_sorteo_status()` |
| `20260213000003_phase4_participante.sql` | 4 | `sales.participante_id`, `claim_boleto_online()`, `get_next_available_boletos()`, participante RLS |
| `20260213000004_phase5_reporting.sql` | 5 | **RLS fix:** `grant_participante_role()` SECURITY DEFINER, `all_orgs_with_stats`, `daily_sales_by_sorteo` |

---

## Tables

### `organizations`
Tenants. Each organization isolated by RLS.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text NOT NULL | Display name |
| `slug` | text UNIQUE | URL identifier — `/#/org/itson` |
| `status` | text | `active` \| `inactive` |
| `contact_email` | text | |
| `created_at` | timestamptz | |

---

### `profiles`
One row per auth user. Auto-created by `handle_new_user()` trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Mirrors `auth.users.id` |
| `full_name` | text | From auth metadata |
| `phone` | text | |
| `avatar_url` | text | |
| `created_at` | timestamptz | |

---

### `user_roles`
RBAC grants. A user can hold multiple roles (e.g., vendedor + participante).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `organization_id` | uuid FK → organizations | NULL for admin and participante |
| `role` | enum | `admin` \| `organizador` \| `vendedor` \| `participante` |
| `status` | text | `active` \| `inactive` |
| `granted_by` | uuid FK → profiles | |

**RLS:** Users read own rows. Admin full access. Organizador manages vendedores in their org. Self-grant participante only via `grant_participante_role()` SECURITY DEFINER (Phase 5 RLS fix — direct INSERT silently fails in Supabase).

---

### `sorteos`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations | Tenant isolation |
| `created_by` | uuid FK → profiles | |
| `title` | text NOT NULL | |
| `description` | text | |
| `cause` | text | Shown on public page |
| `total_boletos` | integer NOT NULL | 40,000 for ITSON |
| `price_per_boleto` | numeric(10,2) | MXN |
| `start_date` | date | |
| `end_date` | date | |
| `drawing_date` | date | |
| `permit_number` | text | SEGOB permit |
| `status` | enum | `draft` → `active` → `closed` → `drawn` |
| `drawing_result` | jsonb | Set by Phase 6 randomness engine |

**Status transitions** (trigger-enforced): draft→active (requires boletos), active→closed, closed→drawn, active→draft (only if zero sales). `drawn` is final — no exits.

---

### `prizes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sorteo_id` | uuid FK | |
| `organization_id` | uuid FK | Denormalized for RLS |
| `position` | integer | 1 = first prize |
| `title` | text NOT NULL | |
| `description` | text | |
| `value_mxn` | numeric(12,2) | Optional |
| `image_url` | text | Optional |

---

### `boletos`
One row per boleto number. 40,000 rows per ITSON sorteo.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sorteo_id` | uuid FK | |
| `organization_id` | uuid FK | Denormalized for RLS |
| `numero` | integer NOT NULL | 1–N, unique per sorteo |
| `status` | enum | `available` \| `sold` |

**Unique index:** `(sorteo_id, numero)` — sub-5ms lookup on 40K rows validated.  
**Scale:** Generation 1.0s, specific lookup 3.9ms, next-available 1.2ms.  
**Immutable:** Never deleted. Status changes only via `claim_boleto()` or `claim_boleto_online()`.

---

### `sales`
Immutable financial audit trail.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sorteo_id` | uuid FK | |
| `organization_id` | uuid FK | Denormalized for RLS |
| `boleto_id` | uuid FK → boletos | |
| `boleto_numero` | integer | Denormalized — survives boleto changes |
| `buyer_name` | text NOT NULL | |
| `buyer_phone` | text NOT NULL | |
| `buyer_email` | text | Optional |
| `vendedor_id` | uuid FK → profiles | NULL for online/admin |
| `participante_id` | uuid FK → profiles | NULL for vendedor channel or guest *(Phase 4)* |
| `sale_channel` | enum | `vendedor` \| `online` \| `admin` |
| `amount_mxn` | numeric(10,2) | Price at time of sale |
| `payment_status` | text | `pending` \| `confirmed` \| `refunded` |
| `created_at` | timestamptz | |

**Never DELETE.** Refunds → `payment_status = 'refunded'`. Written only via DB functions.

**RLS:** Admin all. Organizador: own org. Vendedor: own sales. Participante: own purchases.

---

### `vendedor_assignments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `vendedor_id` | uuid FK | |
| `sorteo_id` | uuid FK | |
| `organization_id` | uuid FK | |
| `assigned_by` | uuid FK | |
| `status` | text | `active` \| `removed` |

**Unique:** `(vendedor_id, sorteo_id)`. Removals set `status='removed'`, never delete.

---

### `audit_log`
Written by triggers only. Never by application code.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `table_name` | text | |
| `operation` | text | `INSERT` \| `UPDATE` \| `DELETE` |
| `row_id` | uuid | Affected row |
| `actor_id` | uuid | `auth.uid()` at event time |
| `old_data` | jsonb | Previous state |
| `new_data` | jsonb | New state |
| `created_at` | timestamptz | |

**Trigger coverage:** sorteos (status changes), sales (all writes), boletos (status changes).

---

## Views

| View | Used By | Key Columns |
|------|---------|-------------|
| `sorteos_with_stats` | OrgDashboard, ReportingDashboard | All sorteo fields + `boletos_sold`, `boletos_available`, `pct_sold`, `revenue_mxn` |
| `public_sorteo_detail` | Public pages | Sorteo fields + `org_name`, `org_slug`, `prizes` (jsonb array) — active/closed/drawn only |
| `vendedor_sales_summary` | SorteoDetail, ReportingDashboard | `vendedor_id`, `vendedor_name`, `total_sales`, `confirmed_revenue_mxn`, `pending_revenue_mxn`, `last_sale_at` |
| `all_orgs_with_stats` *(Phase 5)* | AdminDashboard | Org fields + `total_sorteos`, `active_sorteos`, `total_revenue_mxn`, `total_sales`, `active_vendedores` |
| `daily_sales_by_sorteo` *(Phase 5)* | ReportingDashboard | `sorteo_id`, `sale_date`, `sales_count`, `revenue_mxn`, `active_vendedores` |

---

## Functions

| Function | Type | Purpose |
|----------|------|---------|
| `claim_boleto(sorteo_id, numero, vendedor_id, ...)` | SECURITY DEFINER | Vendedor single-boleto claim. Race-safe. |
| `claim_boleto_online(sorteo_id, numeros[], ...)` | SECURITY DEFINER | Online multi-boleto claim. All-or-nothing. Max 20. |
| `get_next_available_boleto(sorteo_id)` | STABLE | Lowest available número (single). Does not claim. |
| `get_next_available_boletos(sorteo_id, count)` | STABLE | Lowest N available números. Does not claim. |
| `transition_sorteo_status(sorteo_id, new_status)` | SECURITY DEFINER | Permission-checked status change. Delegates to trigger. |
| `grant_participante_role(user_id)` | SECURITY DEFINER | Self-grant participante role. Validates caller = user_id. Idempotent. **Phase 5 RLS fix.** |
| `generate_boletos(sorteo_id, total)` | internal | Batch INSERT boleto rows. Called by Edge Function only. |
| `get_my_role()` | SECURITY DEFINER | Returns highest-priority role for current user. Used by RLS policies. |
| `get_my_organization_id()` | SECURITY DEFINER | Returns org for current user. NULL for admin/participante. |

---

## Multi-Tenancy

Tenant isolation is enforced at the DB level via RLS. Application code cannot bypass it.

- Every org-scoped table has `organization_id`
- RLS policies use `get_my_organization_id()` (SECURITY DEFINER prevents recursion)
- Helper functions: `is_admin()`, `is_organizador_of(org_id)`, `is_vendedor_of(org_id)`
- Participantes: cross-tenant, `organization_id = NULL` in user_roles
- Admin: `organization_id = NULL`, passes `is_admin()` globally

---

## ITSON Notes

- **Timezone:** `America/Hermosillo` (UTC-7, no DST) in `daily_sales_by_sorteo`
- **Scale:** 40,000 boletos per sorteo — validated in load tests
- **V2 backlog:** Cartera bundle management, CXM points engine, Sorteo Especial de Colaboradores, configurable role labels per tenant
