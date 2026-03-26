-- Migration: Add anon SELECT policies for public landing page.
--
-- The landing page queries public_sorteo_detail (a view) as the anon role.
-- The view joins sorteos, organizations, prizes, and sales. If the view
-- uses security_invoker semantics (Supabase default in some configurations),
-- the anon role needs direct SELECT access on the underlying tables.
--
-- This migration:
--   1. Expands the sorteos public policy to include closed/drawn (not just active)
--   2. Adds anon SELECT on organizations (for org names on cards)
--   3. Expands the prizes public policy to include closed/drawn sorteos
--   4. Adds anon SELECT on sales for non-draft sorteos (view needs this for sold counts)

-- 1. Sorteos: expand public policy from 'active' to 'active', 'closed', 'drawn'
DROP POLICY IF EXISTS "sorteos: public active sorteos" ON sorteos;
CREATE POLICY "sorteos: public non-draft sorteos"
    ON sorteos FOR SELECT
    USING (status IN ('active', 'closed', 'drawn'));

-- 2. Organizations: allow anon to see org names for public display
CREATE POLICY "organizations: public can view"
    ON organizations FOR SELECT
    TO anon
    USING (true);

-- 3. Prizes: expand public policy to include closed/drawn sorteos
DROP POLICY IF EXISTS "prizes: public for active sorteos" ON prizes;
CREATE POLICY "prizes: public for non-draft sorteos"
    ON prizes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sorteos s
            WHERE s.id = prizes.sorteo_id
              AND s.status IN ('active', 'closed', 'drawn')
        )
    );

-- 4. Sales: allow anon to read sales for non-draft sorteos (for sold counts in views)
CREATE POLICY "sales: public stats for non-draft sorteos"
    ON sales FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM sorteos s
            WHERE s.id = sales.sorteo_id
              AND s.status IN ('active', 'closed', 'drawn')
        )
    );
