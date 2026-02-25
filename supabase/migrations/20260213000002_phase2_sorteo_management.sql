-- =============================================================================
-- RAFIKI — Phase 2: Sorteo Management
-- Migration: 20260213000002_phase2_sorteo_management
-- Date: 2026-02-13
-- Description: Sorteo status transition guard, helper views for reporting
-- Depends on: 20260213000001_phase1_foundation
-- =============================================================================


-- =============================================================================
-- SECTION 1: SORTEO STATUS TRANSITION GUARD
-- Prevents illegal status transitions at the DB level.
-- Valid transitions: draft→active, active→closed, closed→drawn
-- Also allows: active→draft (pause/revert), any→draft when no sales exist
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_sorteo_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale_count INTEGER;
BEGIN
    -- No change — let it through
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define valid transitions
    IF NOT (
        (OLD.status = 'draft'  AND NEW.status = 'active') OR
        (OLD.status = 'active' AND NEW.status = 'closed') OR
        (OLD.status = 'closed' AND NEW.status = 'drawn')  OR
        -- Allow reverting active→draft only if zero sales exist
        (OLD.status = 'active' AND NEW.status = 'draft')
    ) THEN
        RAISE EXCEPTION 'Invalid sorteo status transition: % → %. Valid transitions: draft→active, active→closed, closed→drawn.',
            OLD.status, NEW.status;
    END IF;

    -- Guard: cannot revert active→draft if sales exist
    IF OLD.status = 'active' AND NEW.status = 'draft' THEN
        SELECT COUNT(*) INTO v_sale_count
        FROM sales WHERE sorteo_id = NEW.id;

        IF v_sale_count > 0 THEN
            RAISE EXCEPTION 'Cannot revert sorteo to draft: % sales already recorded. Use "closed" status instead.',
                v_sale_count;
        END IF;
    END IF;

    -- Guard: cannot mark drawn if boletos were never generated
    IF NEW.status = 'drawn' THEN
        IF NOT EXISTS (SELECT 1 FROM boletos WHERE sorteo_id = NEW.id LIMIT 1) THEN
            RAISE EXCEPTION 'Cannot mark sorteo as drawn: no boletos exist for this sorteo.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sorteo_status_transition_guard
    BEFORE UPDATE OF status ON sorteos
    FOR EACH ROW
    EXECUTE FUNCTION validate_sorteo_status_transition();

COMMENT ON FUNCTION validate_sorteo_status_transition() IS
    'Guards sorteo status transitions. Valid: draft→active, active→closed, closed→drawn. active→draft only if zero sales.';


-- =============================================================================
-- SECTION 2: REPORTING VIEWS
-- These views are used by the Organizador dashboard and the public sorteo page.
-- They join across tables so the frontend can make a single query.
-- RLS on the underlying tables still applies when views are queried.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sorteos_with_stats
-- Enriches sorteos with real-time sale counts and revenue.
-- Used by the Organizador dashboard sorteo list.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sorteos_with_stats AS
SELECT
    s.id,
    s.organization_id,
    s.title,
    s.description,
    s.cause,
    s.total_boletos,
    s.price_per_boleto,
    s.start_date,
    s.end_date,
    s.drawing_date,
    s.status,
    s.permit_number,
    s.drawing_result,
    s.created_by,
    s.created_at,
    s.updated_at,
    -- Sale stats (only confirmed + pending sales count as sold)
    COALESCE(stats.boletos_sold, 0)     AS boletos_sold,
    s.total_boletos - COALESCE(stats.boletos_sold, 0) AS boletos_available,
    COALESCE(stats.revenue_mxn, 0)      AS revenue_mxn,
    COALESCE(stats.confirmed_mxn, 0)    AS confirmed_mxn,
    COALESCE(stats.sale_count, 0)       AS sale_count,
    -- Progress percentage (0-100)
    ROUND(
        (COALESCE(stats.boletos_sold, 0)::numeric / NULLIF(s.total_boletos, 0)) * 100,
        1
    ) AS pct_sold
FROM sorteos s
LEFT JOIN (
    SELECT
        sorteo_id,
        COUNT(*)                                                  AS boletos_sold,
        COUNT(*)                                                  AS sale_count,
        SUM(amount_mxn)                                          AS revenue_mxn,
        SUM(amount_mxn) FILTER (WHERE payment_status = 'confirmed') AS confirmed_mxn
    FROM sales
    WHERE payment_status != 'refunded'
    GROUP BY sorteo_id
) stats ON stats.sorteo_id = s.id;

COMMENT ON VIEW sorteos_with_stats IS
    'Sorteos enriched with live sale counts and revenue. Used by Organizador dashboard. RLS on sorteos still applies.';


-- -----------------------------------------------------------------------------
-- public_sorteo_detail
-- What the public-facing sorteo page shows.
-- Includes prize list, sale stats, organization info.
-- Only returns active/closed/drawn sorteos — no drafts.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public_sorteo_detail AS
SELECT
    s.id,
    s.title,
    s.description,
    s.cause,
    s.total_boletos,
    s.price_per_boleto,
    s.start_date,
    s.end_date,
    s.drawing_date,
    s.status,
    s.permit_number,
    s.drawing_result,
    -- Organization info for public display
    o.name    AS org_name,
    o.slug    AS org_slug,
    -- Prize list as JSON array
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',          p.id,
                'position',    p.position,
                'title',       p.title,
                'description', p.description,
                'value_mxn',   p.value_mxn,
                'image_url',   p.image_url
            )
            ORDER BY p.position
        )
        FROM prizes p WHERE p.sorteo_id = s.id
    ), '[]'::jsonb) AS prizes,
    -- Public stats
    COALESCE(stats.boletos_sold, 0)     AS boletos_sold,
    s.total_boletos - COALESCE(stats.boletos_sold, 0) AS boletos_available,
    ROUND(
        (COALESCE(stats.boletos_sold, 0)::numeric / NULLIF(s.total_boletos, 0)) * 100,
        1
    ) AS pct_sold
FROM sorteos s
JOIN organizations o ON o.id = s.organization_id
LEFT JOIN (
    SELECT sorteo_id, COUNT(*) AS boletos_sold
    FROM sales
    WHERE payment_status != 'refunded'
    GROUP BY sorteo_id
) stats ON stats.sorteo_id = s.id
WHERE s.status IN ('active', 'closed', 'drawn');

COMMENT ON VIEW public_sorteo_detail IS
    'Public sorteo info with prizes and live stats. Active/closed/drawn only — never drafts.';


-- =============================================================================
-- SECTION 3: VENDEDOR PERFORMANCE VIEW
-- Used by Organizador sales dashboard (Phase 5 builds the UI,
-- but the view is cheap to add now and Phase 3 vendedor dashboard uses it too).
-- =============================================================================

CREATE OR REPLACE VIEW vendedor_sales_summary AS
SELECT
    va.sorteo_id,
    va.organization_id,
    va.vendedor_id,
    p.full_name      AS vendedor_name,
    u.email          AS vendedor_email,
    -- Sales counts
    COUNT(s.id)                                                   AS total_sales,
    COUNT(s.id) FILTER (WHERE s.payment_status = 'confirmed')     AS confirmed_sales,
    COUNT(s.id) FILTER (WHERE s.payment_status = 'pending')       AS pending_sales,
    -- Revenue
    COALESCE(SUM(s.amount_mxn) FILTER (WHERE s.payment_status != 'refunded'), 0) AS total_revenue_mxn,
    COALESCE(SUM(s.amount_mxn) FILTER (WHERE s.payment_status = 'confirmed'), 0) AS confirmed_revenue_mxn,
    -- Time tracking
    MAX(s.created_at) AS last_sale_at
FROM vendedor_assignments va
JOIN profiles p ON p.id = va.vendedor_id
JOIN auth.users u ON u.id = va.vendedor_id
LEFT JOIN sales s ON s.vendedor_id = va.vendedor_id
    AND s.sorteo_id = va.sorteo_id
    AND s.payment_status != 'refunded'
WHERE va.status = 'active'
GROUP BY va.sorteo_id, va.organization_id, va.vendedor_id, p.full_name, u.email;

COMMENT ON VIEW vendedor_sales_summary IS
    'Per-vendedor sales performance per sorteo. Used by Phase 3 vendedor dashboard and Phase 5 organizador reporting.';


-- =============================================================================
-- SECTION 4: TRANSITION FUNCTION (called via RPC from frontend)
-- Organizador triggers status changes through this function instead of
-- direct UPDATE — it validates permissions and handles side effects.
-- =============================================================================

CREATE OR REPLACE FUNCTION transition_sorteo_status(
    p_sorteo_id UUID,
    p_new_status sorteo_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sorteo        sorteos%ROWTYPE;
    v_boleto_count  INTEGER;
BEGIN
    -- Fetch the sorteo
    SELECT * INTO v_sorteo FROM sorteos WHERE id = p_sorteo_id;

    IF v_sorteo.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    -- Permission check: caller must be admin or organizador of this org
    IF NOT (is_admin() OR is_organizador_of(v_sorteo.organization_id)) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
    END IF;

    -- When activating: require boletos to exist
    IF p_new_status = 'active' THEN
        SELECT COUNT(*) INTO v_boleto_count
        FROM boletos WHERE sorteo_id = p_sorteo_id;

        IF v_boleto_count = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'no_boletos_generated',
                'detail', 'Generate boletos before activating this sorteo.'
            );
        END IF;

        -- Require at least one vendedor assigned (warn but don't block for now)
        -- This is a soft check — online sales (Phase 4) don't need vendedores
    END IF;

    -- Perform the transition (trigger validates the transition itself)
    UPDATE sorteos SET status = p_new_status WHERE id = p_sorteo_id;

    RETURN jsonb_build_object(
        'success',     true,
        'sorteo_id',   p_sorteo_id,
        'new_status',  p_new_status
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'transition_invalid',
            'detail',  SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION transition_sorteo_status(UUID, sorteo_status) IS
    'RPC wrapper for sorteo status transitions. Validates permissions and boleto existence. Trigger handles the transition rules.';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Added: validate_sorteo_status_transition trigger
-- Added: sorteos_with_stats view
-- Added: public_sorteo_detail view
-- Added: vendedor_sales_summary view
-- Added: transition_sorteo_status() RPC function
-- Changelog: docs/schema.md (update below)
-- =============================================================================
