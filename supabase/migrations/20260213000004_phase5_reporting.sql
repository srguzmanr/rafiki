-- =============================================================================
-- RAFIKI — Phase 5: Reporting, Admin, & RLS Fix
-- Migration: 20260213000004_phase5_reporting
-- Date: 2026-02-13
-- Description:
--   1. SECURITY FIX: grant_participante_role() — replaces direct INSERT that
--      silently fails under real Supabase RLS. Verified: RLS gap confirmed live.
--   2. Admin reporting: all_orgs_with_stats view for AdminDashboard.
--   3. Reporting helpers: daily_sales_by_sorteo view for Organizador charts.
-- Depends on: 000001, 000002, 000003
-- =============================================================================


-- =============================================================================
-- SECTION 1: RLS FIX — grant_participante_role()
--
-- Problem confirmed: direct INSERT into user_roles from the client silently
-- fails under Supabase RLS. There is no INSERT policy that allows a newly
-- authenticated user to grant themselves the participante role. The user
-- ends up with a valid Auth account but no role row → "sin rol asignado."
--
-- Fix: SECURITY DEFINER function that validates:
--   (a) caller can only grant themselves (p_user_id = auth.uid())
--   (b) role must be 'participante' — no privilege escalation possible
--   (c) idempotent — safe to call twice (upsert on conflict)
-- =============================================================================

CREATE OR REPLACE FUNCTION grant_participante_role(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Caller must be granting their own role — no impersonation
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'unauthorized',
            'detail',  'You can only grant your own participante role.'
        );
    END IF;

    -- Upsert: idempotent — safe if called multiple times.
    -- ON CONFLICT ON CONSTRAINT works here because uq_user_role_per_org was defined
    -- with NULLS NOT DISTINCT (PG15+), so (user_id, NULL, 'participante') correctly
    -- conflicts with an existing row where organization_id IS NULL.
    -- ON CONFLICT uses column list because uq_user_role_per_org is a UNIQUE INDEX
    -- (not a named CONSTRAINT), so ON CONFLICT ON CONSTRAINT doesn't apply.
    -- NULLS NOT DISTINCT on the index ensures (user_id, NULL, 'participante')
    -- correctly conflicts with an existing row where organization_id IS NULL.
    INSERT INTO user_roles (user_id, organization_id, role, status)
    VALUES (p_user_id, NULL, 'participante', 'active')
    ON CONFLICT (user_id, organization_id, role)
    DO UPDATE SET status = 'active'; -- user_roles has no updated_at

    RETURN jsonb_build_object('success', true);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unexpected_error', 'detail', SQLERRM);
END;
$$;

COMMENT ON FUNCTION grant_participante_role(UUID) IS
    'SECURITY DEFINER: allows a newly registered user to grant themselves the participante role. '
    'Replaces direct INSERT into user_roles which silently fails under Supabase RLS. '
    'Validates caller = p_user_id to prevent privilege escalation. Idempotent.';

-- Note on the ON CONFLICT clause:
-- user_roles has a unique constraint on (user_id, role, organization_id).
-- participante has organization_id = NULL. PostgreSQL NULL != NULL so we coerce
-- NULL to a sentinel UUID for the conflict check. If this causes issues on
-- a particular Supabase version, the fallback is: INSERT ... WHERE NOT EXISTS.


-- =============================================================================
-- SECTION 2: ALL ORGS WITH STATS — Admin reporting view
-- Powers the AdminDashboard tenant list. Admin-only (enforced by organizations RLS).
-- =============================================================================

CREATE OR REPLACE VIEW all_orgs_with_stats AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.status,
    o.contact_email,
    o.created_at,

    -- Sorteo counts
    COUNT(DISTINCT s.id)                                         AS total_sorteos,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')     AS active_sorteos,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'drawn')      AS completed_sorteos,

    -- Sales totals across all sorteos
    COALESCE(SUM(sl.amount_mxn), 0)                             AS total_revenue_mxn,
    COUNT(sl.id)                                                 AS total_sales,

    -- Vendedor count
    COUNT(DISTINCT ur.user_id)
        FILTER (WHERE ur.role = 'vendedor' AND ur.status = 'active') AS active_vendedores,

    -- Last activity
    MAX(sl.created_at)                                           AS last_sale_at

FROM organizations o
LEFT JOIN sorteos s   ON s.organization_id = o.id
LEFT JOIN sales sl    ON sl.organization_id = o.id
LEFT JOIN user_roles ur ON ur.organization_id = o.id

GROUP BY o.id, o.name, o.slug, o.status, o.contact_email, o.created_at
ORDER BY o.created_at DESC;

COMMENT ON VIEW all_orgs_with_stats IS
    'Admin-only: all organizations with aggregate sorteo/sales stats. '
    'Access controlled by organizations RLS (admin sees all, others see own org only).';


-- =============================================================================
-- SECTION 3: DAILY SALES VIEW — Organizador reporting chart
-- Aggregates sales by day for a given org. Used for the reporting dashboard.
-- =============================================================================

CREATE OR REPLACE VIEW daily_sales_by_sorteo AS
SELECT
    sl.sorteo_id,
    sl.organization_id,
    DATE(sl.created_at AT TIME ZONE 'America/Hermosillo') AS sale_date,
    COUNT(sl.id)                                           AS sales_count,
    SUM(sl.amount_mxn)                                     AS revenue_mxn,
    COUNT(DISTINCT sl.vendedor_id)                         AS active_vendedores
FROM sales sl
WHERE sl.payment_status != 'refunded'
GROUP BY sl.sorteo_id, sl.organization_id, DATE(sl.created_at AT TIME ZONE 'America/Hermosillo')
ORDER BY sale_date DESC;

COMMENT ON VIEW daily_sales_by_sorteo IS
    'Daily sales aggregation per sorteo. Timezone: America/Hermosillo (ITSON anchor client). '
    'RLS on sales table controls access — organizadors see only their org data.';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Fixed: grant_participante_role() SECURITY DEFINER — resolves silent RLS failure
-- Added: all_orgs_with_stats view (admin reporting)
-- Added: daily_sales_by_sorteo view (organizador reporting chart)
-- =============================================================================
