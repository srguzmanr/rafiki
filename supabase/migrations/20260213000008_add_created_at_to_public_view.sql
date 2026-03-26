-- Migration: Add created_at to public_sorteo_detail view.
--
-- The view was missing s.created_at, which caused PostgREST to return 400
-- when queries tried to ORDER BY created_at. This broke the landing page
-- sorteo listing (the error was silently swallowed, showing empty state).

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
    s.created_at,
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
