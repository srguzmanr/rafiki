-- =============================================================================
-- RAFIKI — Phase 4: Participante Experience
-- Migration: 20260213000003_phase4_participante
-- Date: 2026-02-13
-- Description: Online purchase support — participante_id on sales,
--              claim_boleto_online() for multi-boleto purchases,
--              RLS for participante "My Boletos" view.
-- Depends on: 20260213000001, 20260213000002
-- =============================================================================


-- =============================================================================
-- SECTION 1: ADD participante_id TO SALES
-- Links an authenticated participante to their online purchases.
-- NULL = guest purchase (no account) or vendedor-channel sale.
-- =============================================================================

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS participante_id uuid REFERENCES profiles(id);

COMMENT ON COLUMN sales.participante_id IS
    'Set when a logged-in participante buys online. NULL for guest purchases and vendedor-channel sales. Used for "My Boletos" RLS.';

-- Index for "My Boletos" query (participante sees all their purchases)
CREATE INDEX IF NOT EXISTS idx_sales_participante
    ON sales(participante_id)
    WHERE participante_id IS NOT NULL;


-- =============================================================================
-- SECTION 2: RLS — PARTICIPANTE SEES OWN PURCHASES
-- Participantes can only see their own sales (by participante_id = auth.uid()).
-- They cannot see other buyers' data, vendedor-channel sales, or other orgs.
-- =============================================================================

CREATE POLICY "sales: participante sees own purchases"
    ON sales FOR SELECT
    USING (
        participante_id = auth.uid()
        AND participante_id IS NOT NULL
    );


-- =============================================================================
-- SECTION 3: claim_boleto_online()
-- Online purchase function — no vendedor assignment required.
-- Accepts an ARRAY of boleto números so a participante can buy multiple boletos
-- in a single atomic transaction (e.g., 3 boletos for a family).
--
-- Returns:
--   {success: true,  claimed: [{sale_id, boleto_numero, amount_mxn}, ...]}
--   {success: false, reason: "...", unavailable: [numero, ...]}
--
-- Atomicity: ALL números must be available or the entire call fails.
-- The UI shows which numbers are already taken so the user can pick again.
-- =============================================================================

CREATE OR REPLACE FUNCTION claim_boleto_online(
    p_sorteo_id     UUID,
    p_numeros       INTEGER[],          -- array of boleto números to claim
    p_buyer_name    TEXT,
    p_buyer_phone   TEXT,
    p_buyer_email   TEXT DEFAULT NULL,
    p_participante_id UUID DEFAULT NULL -- auth.uid() if logged in, NULL if guest
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sorteo        sorteos%ROWTYPE;
    v_boleto        boletos%ROWTYPE;
    v_sale_id       UUID;
    v_claimed       JSONB[]  := '{}';
    v_unavailable   INTEGER[] := '{}';
    v_numero        INTEGER;
    v_rows_updated  INTEGER;
BEGIN
    -- Validate input
    IF p_numeros IS NULL OR array_length(p_numeros, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_boletos_selected');
    END IF;

    IF array_length(p_numeros, 1) > 20 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'too_many_boletos',
            'detail', 'Maximum 20 boletos per transaction.');
    END IF;

    -- Fetch the sorteo
    SELECT * INTO v_sorteo FROM sorteos WHERE id = p_sorteo_id;

    IF v_sorteo.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    IF v_sorteo.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_active',
            'status', v_sorteo.status::text);
    END IF;

    -- Pre-check: verify all requested números are available before claiming any.
    -- This avoids partial claims — either we get all of them or none.
    FOREACH v_numero IN ARRAY p_numeros LOOP
        IF NOT EXISTS (
            SELECT 1 FROM boletos
            WHERE sorteo_id = p_sorteo_id
              AND numero     = v_numero
              AND status     = 'available'
        ) THEN
            v_unavailable := array_append(v_unavailable, v_numero);
        END IF;
    END LOOP;

    IF array_length(v_unavailable, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success',     false,
            'reason',      'boletos_unavailable',
            'unavailable', to_jsonb(v_unavailable)
        );
    END IF;

    -- Claim all boletos atomically.
    -- Uses the same UPDATE...WHERE status='available' race guard as claim_boleto().
    FOREACH v_numero IN ARRAY p_numeros LOOP

        -- Atomic claim
        UPDATE boletos
        SET status = 'sold'
        WHERE sorteo_id = p_sorteo_id
          AND numero     = v_numero
          AND status     = 'available';

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

        -- Race condition: someone else claimed this número between our pre-check and now
        IF v_rows_updated = 0 THEN
            -- Rollback everything claimed so far by raising an exception
            RAISE EXCEPTION 'race_condition:% ', v_numero;
        END IF;

        -- Create the sale record
        v_sale_id := gen_random_uuid();

        INSERT INTO sales (
            id, sorteo_id, organization_id, boleto_id,
            boleto_numero, buyer_name, buyer_phone, buyer_email,
            vendedor_id, participante_id, sale_channel, amount_mxn, payment_status
        )
        SELECT
            v_sale_id,
            p_sorteo_id,
            v_sorteo.organization_id,
            b.id,
            v_numero,
            p_buyer_name,
            p_buyer_phone,
            p_buyer_email,
            NULL,                       -- no vendedor for online purchases
            p_participante_id,          -- NULL if guest
            'online',
            v_sorteo.price_per_boleto,
            'pending'                   -- Stripe (Phase 6) will confirm payment
        FROM boletos b
        WHERE b.sorteo_id = p_sorteo_id AND b.numero = v_numero;

        v_claimed := array_append(v_claimed, jsonb_build_object(
            'sale_id',      v_sale_id,
            'boleto_numero', v_numero,
            'amount_mxn',   v_sorteo.price_per_boleto
        ));

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'claimed', to_jsonb(v_claimed),
        'total_amount_mxn', v_sorteo.price_per_boleto * array_length(p_numeros, 1)
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Catches race condition raises and any unexpected errors.
        -- The transaction rolls back all INSERTs and UPDATEs automatically.
        IF SQLERRM LIKE 'race_condition:%' THEN
            RETURN jsonb_build_object(
                'success',     false,
                'reason',      'boletos_unavailable',
                'unavailable', to_jsonb(ARRAY[SQLERRM::text])
            );
        END IF;
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'unexpected_error',
            'detail',  SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION claim_boleto_online(UUID, INTEGER[], TEXT, TEXT, TEXT, UUID) IS
    'Online purchase: claims an array of boletos atomically. All succeed or all fail. Sets sale_channel=online, vendedor_id=NULL. participante_id optional (NULL for guest). Phase 6 Stripe integration changes payment_status from pending to confirmed.';


-- =============================================================================
-- SECTION 4: get_next_available_boletos() — multi-boleto quick-select
-- Returns the N lowest available boleto números for a sorteo.
-- Used when a participante wants X boletos but doesn't care which ones.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_next_available_boletos(
    p_sorteo_id UUID,
    p_count     INTEGER DEFAULT 1
)
RETURNS INTEGER[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        ARRAY(
            SELECT numero
            FROM boletos
            WHERE sorteo_id = p_sorteo_id
              AND status = 'available'
            ORDER BY numero
            LIMIT LEAST(p_count, 20)   -- cap at 20 matching claim_boleto_online limit
        ),
        '{}'::INTEGER[]
    );
$$;

COMMENT ON FUNCTION get_next_available_boletos(UUID, INTEGER) IS
    'Returns array of N lowest available boleto números. Used for multi-boleto quick-select in participante buy flow. Does not claim — call claim_boleto_online() immediately after.';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Added: sales.participante_id column + index
-- Added: "sales: participante sees own purchases" RLS policy
-- Added: claim_boleto_online(sorteo_id, numeros[], ...) function
-- Added: get_next_available_boletos(sorteo_id, count) function
-- Changelog: docs/schema.md
-- =============================================================================
