-- =============================================================================
-- Migration 005: Giveaway Support
-- =============================================================================
-- Adds marketing_consent column to sales table.
-- Updates claim_boleto() and claim_boleto_online() to:
--   1. Accept a 7th parameter p_marketing_consent (BOOLEAN DEFAULT TRUE)
--   2. Auto-set payment_status = 'confirmed' when price_per_boleto = 0 (giveaway)
--   3. Store marketing_consent in the sales record
--
-- Context: Giveaway sorteos have price_per_boleto = 0. No payment is needed,
-- so we skip the 'pending' status and go straight to 'confirmed'.
-- The marketing_consent field captures opt-in for promotional communications,
-- which is the value exchange in a free giveaway.
-- =============================================================================

-- SECTION 1: Add marketing_consent column
-- =============================================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN sales.marketing_consent IS
    'Whether the buyer consented to marketing communications. Default TRUE. '
    'Primary value exchange in giveaway (price=0) sorteos.';


-- SECTION 2: Update claim_boleto() — vendedor flow
-- =============================================================================
CREATE OR REPLACE FUNCTION claim_boleto(
    p_sorteo_id         UUID,
    p_numero            INTEGER,
    p_vendedor_id       UUID,
    p_buyer_name        TEXT,
    p_buyer_phone       TEXT,
    p_buyer_email       TEXT DEFAULT NULL,
    p_marketing_consent BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_boleto_id      UUID;
    v_sale_id        UUID;
    v_org_id         UUID;
    v_price          NUMERIC(10,2);
    v_sorteo_status  sorteo_status;
    v_is_assigned    BOOLEAN;
    v_pay_status     payment_status;
BEGIN
    SELECT organization_id, price_per_boleto, status
    INTO v_org_id, v_price, v_sorteo_status
    FROM sorteos WHERE id = p_sorteo_id;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;
    IF v_sorteo_status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_active');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM vendedor_assignments
        WHERE vendedor_id = p_vendedor_id AND sorteo_id = p_sorteo_id AND status = 'active'
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RETURN jsonb_build_object('success', false, 'reason', 'vendedor_not_assigned');
    END IF;

    UPDATE boletos SET status = 'sold'
    WHERE sorteo_id = p_sorteo_id AND numero = p_numero AND status = 'available'
    RETURNING id INTO v_boleto_id;

    IF v_boleto_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'boleto_unavailable');
    END IF;

    v_pay_status := CASE WHEN v_price = 0 THEN 'confirmed'::payment_status ELSE 'pending'::payment_status END;

    v_sale_id := gen_random_uuid();
    INSERT INTO sales (
        id, sorteo_id, organization_id, boleto_id,
        boleto_numero, buyer_name, buyer_phone, buyer_email,
        vendedor_id, participante_id, sale_channel,
        amount_mxn, payment_status, marketing_consent
    ) VALUES (
        v_sale_id, p_sorteo_id, v_org_id, v_boleto_id,
        p_numero, p_buyer_name, p_buyer_phone, p_buyer_email,
        p_vendedor_id, NULL, 'vendedor',
        v_price, v_pay_status, p_marketing_consent
    );

    INSERT INTO audit_log (organization_id, event_type, actor_id, detail)
    VALUES (v_org_id, 'sale.created', p_vendedor_id,
        jsonb_build_object(
            'sale_id', v_sale_id, 'sorteo_id', p_sorteo_id,
            'boleto_numero', p_numero, 'channel', 'vendedor',
            'amount_mxn', v_price, 'payment_status', v_pay_status
        )
    );

    RETURN jsonb_build_object(
        'success', true, 'sale_id', v_sale_id,
        'boleto_numero', p_numero, 'amount_mxn', v_price,
        'payment_status', v_pay_status
    );
END;
$$;

COMMENT ON FUNCTION claim_boleto(UUID, INTEGER, UUID, TEXT, TEXT, TEXT, BOOLEAN) IS
    'Atomic vendedor boleto sale. 7-arg version with marketing_consent + giveaway auto-confirm.';


-- SECTION 3: Update claim_boleto_online() — participante flow
-- =============================================================================
CREATE OR REPLACE FUNCTION claim_boleto_online(
    p_sorteo_id         UUID,
    p_numeros           INTEGER[],
    p_buyer_name        TEXT,
    p_buyer_phone       TEXT,
    p_buyer_email       TEXT DEFAULT NULL,
    p_participante_id   UUID DEFAULT NULL,
    p_marketing_consent BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sorteo        sorteos%ROWTYPE;
    v_sale_id       UUID;
    v_claimed       JSONB[]   := '{}';
    v_unavailable   INTEGER[] := '{}';
    v_numero        INTEGER;
    v_rows_updated  INTEGER;
    v_pay_status    payment_status;
BEGIN
    IF p_numeros IS NULL OR array_length(p_numeros, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_boletos_selected');
    END IF;

    IF array_length(p_numeros, 1) > 20 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'too_many_boletos',
            'detail', 'Maximum 20 boletos per transaction.');
    END IF;

    SELECT * INTO v_sorteo FROM sorteos WHERE id = p_sorteo_id;

    IF v_sorteo.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    IF v_sorteo.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_active',
            'status', v_sorteo.status::text);
    END IF;

    v_pay_status := CASE WHEN v_sorteo.price_per_boleto = 0 THEN 'confirmed'::payment_status ELSE 'pending'::payment_status END;

    FOREACH v_numero IN ARRAY p_numeros LOOP
        IF NOT EXISTS (
            SELECT 1 FROM boletos
            WHERE sorteo_id = p_sorteo_id AND numero = v_numero AND status = 'available'
        ) THEN
            v_unavailable := array_append(v_unavailable, v_numero);
        END IF;
    END LOOP;

    IF array_length(v_unavailable, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false, 'reason', 'boletos_unavailable',
            'unavailable', to_jsonb(v_unavailable)
        );
    END IF;

    FOREACH v_numero IN ARRAY p_numeros LOOP
        UPDATE boletos SET status = 'sold'
        WHERE sorteo_id = p_sorteo_id AND numero = v_numero AND status = 'available';

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

        IF v_rows_updated = 0 THEN
            RAISE EXCEPTION 'race_condition:% ', v_numero;
        END IF;

        v_sale_id := gen_random_uuid();

        INSERT INTO sales (
            id, sorteo_id, organization_id, boleto_id,
            boleto_numero, buyer_name, buyer_phone, buyer_email,
            vendedor_id, participante_id, sale_channel,
            amount_mxn, payment_status, marketing_consent
        )
        SELECT
            v_sale_id, p_sorteo_id, v_sorteo.organization_id, b.id,
            v_numero, p_buyer_name, p_buyer_phone, p_buyer_email,
            NULL, p_participante_id, 'online',
            v_sorteo.price_per_boleto, v_pay_status, p_marketing_consent
        FROM boletos b
        WHERE b.sorteo_id = p_sorteo_id AND b.numero = v_numero;

        v_claimed := array_append(v_claimed, jsonb_build_object(
            'sale_id', v_sale_id, 'boleto_numero', v_numero,
            'amount_mxn', v_sorteo.price_per_boleto, 'payment_status', v_pay_status
        ));
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 'claimed', to_jsonb(v_claimed),
        'total_amount_mxn', v_sorteo.price_per_boleto * array_length(p_numeros, 1)
    );

EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM LIKE 'race_condition:%' THEN
            RETURN jsonb_build_object(
                'success', false, 'reason', 'boletos_unavailable',
                'unavailable', to_jsonb(ARRAY[SQLERRM::text])
            );
        END IF;
        RETURN jsonb_build_object(
            'success', false, 'reason', 'unexpected_error', 'detail', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION claim_boleto_online(UUID, INTEGER[], TEXT, TEXT, TEXT, UUID, BOOLEAN) IS
    'Atomic online multi-boleto purchase. 7-arg version with marketing_consent + giveaway auto-confirm.';


-- SECTION 4: Drop old 6-arg overloads (cleanup)
-- =============================================================================
DROP FUNCTION IF EXISTS claim_boleto(UUID, INTEGER, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS claim_boleto_online(UUID, INTEGER[], TEXT, TEXT, TEXT, UUID);


-- =============================================================================
-- Migration complete.
-- Changelog:
--   - sales.marketing_consent column added (BOOLEAN DEFAULT TRUE)
--   - claim_boleto() updated: 7 params, giveaway auto-confirm, marketing_consent
--   - claim_boleto_online() updated: 7 params, giveaway auto-confirm, marketing_consent
--   - Old 6-arg function overloads dropped
-- =============================================================================
