-- =============================================================================
-- Migration 006: Draw Winners
-- =============================================================================
-- Adds draw_winners() function + immutability trigger on drawing_result.
--
-- draw_winners(p_sorteo_id UUID):
--   - Validates sorteo is 'closed' and caller is admin or owning organizador
--   - Selects random winner from sold boletos for each prize (ORDER BY random())
--   - Updates prizes.winning_boleto_id
--   - Stores result in sorteos.drawing_result (JSONB)
--   - Transitions status to 'drawn'
--   - Logs to audit_log
--   - One-shot: rejects if already drawn
--
-- Immutability trigger: prevents modification of drawing_result once set.
-- =============================================================================

-- SECTION 1: draw_winners() function
-- =============================================================================
CREATE OR REPLACE FUNCTION draw_winners(p_sorteo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sorteo          sorteos%ROWTYPE;
    v_caller_role     TEXT;
    v_caller_org      UUID;
    v_prize           RECORD;
    v_winner_boleto   RECORD;
    v_selected_ids    UUID[] := '{}';
    v_winners         JSONB[] := '{}';
    v_pool_size       INTEGER;
    v_result          JSONB;
    v_transition      JSONB;
BEGIN
    -- 1. Auth check
    v_caller_role := get_my_role();
    v_caller_org  := get_my_organization_id();

    IF v_caller_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
    END IF;

    SELECT * INTO v_sorteo FROM sorteos WHERE id = p_sorteo_id;

    IF v_sorteo.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_found');
    END IF;

    IF v_caller_role = 'admin' THEN
        NULL;
    ELSIF v_caller_role = 'organizador' AND v_caller_org = v_sorteo.organization_id THEN
        NULL;
    ELSE
        RETURN jsonb_build_object('success', false, 'reason', 'permission_denied',
            'detail', 'Solo el organizador del sorteo o un admin pueden ejecutar el sorteo.');
    END IF;

    -- 2. Validate status
    IF v_sorteo.status != 'closed' THEN
        IF v_sorteo.status = 'drawn' THEN
            RETURN jsonb_build_object('success', false, 'reason', 'already_drawn',
                'detail', 'Este sorteo ya fue realizado.',
                'drawing_result', v_sorteo.drawing_result);
        END IF;
        RETURN jsonb_build_object('success', false, 'reason', 'sorteo_not_closed',
            'detail', 'El sorteo debe estar cerrado antes de realizar el sorteo. Status actual: ' || v_sorteo.status::text);
    END IF;

    -- 3. Count eligible pool
    SELECT count(*) INTO v_pool_size
    FROM boletos WHERE sorteo_id = p_sorteo_id AND status = 'sold';

    IF v_pool_size = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_eligible_boletos',
            'detail', 'No hay boletos vendidos para realizar el sorteo.');
    END IF;

    -- 4. For each prize, pick a random winner
    FOR v_prize IN
        SELECT id, position, title FROM prizes
        WHERE sorteo_id = p_sorteo_id ORDER BY position
    LOOP
        SELECT b.id AS boleto_id, b.numero, s.buyer_name
        INTO v_winner_boleto
        FROM boletos b
        JOIN sales s ON s.sorteo_id = b.sorteo_id AND s.boleto_numero = b.numero
        WHERE b.sorteo_id = p_sorteo_id
          AND b.status = 'sold'
          AND b.id != ALL(v_selected_ids)
        ORDER BY random()
        LIMIT 1;

        IF v_winner_boleto.boleto_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'reason', 'not_enough_boletos',
                'detail', 'No hay suficientes boletos vendidos para cubrir todos los premios.');
        END IF;

        v_selected_ids := array_append(v_selected_ids, v_winner_boleto.boleto_id);

        UPDATE prizes SET winning_boleto_id = v_winner_boleto.boleto_id
        WHERE id = v_prize.id;

        v_winners := array_append(v_winners, jsonb_build_object(
            'prize_id',         v_prize.id,
            'prize_position',   v_prize.position,
            'prize_name',       v_prize.title,
            'boleto_numero',    v_winner_boleto.numero,
            'participant_name', v_winner_boleto.buyer_name
        ));
    END LOOP;

    -- 5. Build result
    v_result := jsonb_build_object(
        'drawn_at',           now(),
        'method',             'postgresql_random',
        'eligible_pool_size', v_pool_size,
        'winners',            to_jsonb(v_winners)
    );

    -- 6. Store result
    UPDATE sorteos SET drawing_result = v_result WHERE id = p_sorteo_id;

    -- 7. Transition to drawn
    v_transition := transition_sorteo_status(p_sorteo_id, 'drawn'::sorteo_status);
    IF NOT (v_transition->>'success')::boolean THEN
        RAISE EXCEPTION 'Failed to transition sorteo status: %', v_transition->>'reason';
    END IF;

    -- 8. Audit log
    INSERT INTO audit_log (organization_id, event_type, actor_id, detail)
    VALUES (
        v_sorteo.organization_id, 'sorteo.drawn', auth.uid(),
        jsonb_build_object(
            'sorteo_id', p_sorteo_id, 'sorteo_title', v_sorteo.title,
            'pool_size', v_pool_size, 'winners_count', array_length(v_winners, 1),
            'result', v_result
        )
    );

    RETURN jsonb_build_object('success', true, 'drawing_result', v_result);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unexpected_error', 'detail', SQLERRM);
END;
$$;

COMMENT ON FUNCTION draw_winners(UUID) IS
    'Execute sorteo drawing. Selects random winners for each prize from sold boletos. '
    'One-shot: rejects if already drawn. Caller must be admin or owning organizador.';


-- SECTION 2: Immutability trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION prevent_drawing_result_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.drawing_result IS NOT NULL AND NEW.drawing_result IS DISTINCT FROM OLD.drawing_result THEN
        RAISE EXCEPTION 'drawing_result is immutable once set. Sorteo: %', OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_drawing_result ON sorteos;
CREATE TRIGGER trg_immutable_drawing_result
    BEFORE UPDATE ON sorteos
    FOR EACH ROW
    WHEN (OLD.drawing_result IS NOT NULL)
    EXECUTE FUNCTION prevent_drawing_result_change();

-- =============================================================================
-- Migration complete.
-- =============================================================================
