// src/lib/participanteApi.js
// All Supabase calls for the participante experience.
// Public pages (browse/view sorteo) work without auth.
// Purchase and My Boletos require auth.

import { supabase } from './supabase'

// ─── PUBLIC BROWSING (no auth required) ────────────────────────────────────

export async function fetchPublicSorteosByOrg(orgSlug) {
  const { data, error } = await supabase
    .from('public_sorteo_detail')
    .select('*')
    .eq('org_slug', orgSlug)
    .order('start_date', { ascending: false })
  return { data: data || [], error }
}

export async function fetchPublicSorteo(sorteoId) {
  const { data, error } = await supabase
    .from('public_sorteo_detail')
    .select('*')
    .eq('id', sorteoId)
    .single()
  return { data, error }
}

// ─── BOLETO AVAILABILITY ────────────────────────────────────────────────────

export async function checkBoletoAvailability(sorteoId, numero) {
  const { data, error } = await supabase
    .from('boletos')
    .select('status')
    .eq('sorteo_id', sorteoId)
    .eq('numero', numero)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return { status: 'not_found', error: null }
    return { status: null, error }
  }
  return { status: data.status, error: null }
}

export async function fetchNextAvailableBoletos(sorteoId, count = 1) {
  const { data, error } = await supabase.rpc('get_next_available_boletos', {
    p_sorteo_id: sorteoId,
    p_count:     count,
  })
  return { numeros: data || [], error }
}

// ─── PURCHASE ──────────────────────────────────────────────────────────────

export async function claimBoletosOnline({
  sorteoId, numeros, buyerName, buyerPhone, buyerEmail,
  participanteId = null, marketingConsent = true,
}) {
  const { data, error } = await supabase.rpc('claim_boleto_online', {
    p_sorteo_id:          sorteoId,
    p_numeros:            numeros,
    p_buyer_name:         buyerName,
    p_buyer_phone:        buyerPhone,
    p_buyer_email:        buyerEmail || null,
    p_participante_id:    participanteId,
    p_marketing_consent:  marketingConsent,
  })

  if (error) return { data: null, error, unavailable: [] }

  if (!data?.success) {
    const messages = {
      boletos_unavailable: 'Uno o más boletos ya no están disponibles. Elige otros.',
      sorteo_not_active:   'Este sorteo ya no acepta compras.',
      sorteo_not_found:    'Sorteo no encontrado.',
      too_many_boletos:    'Máximo 20 boletos por transacción.',
      no_boletos_selected: 'Selecciona al menos un boleto.',
    }
    return {
      data: null,
      error: new Error(messages[data?.reason] || 'Error al procesar la compra. Intenta de nuevo.'),
      unavailable: data?.unavailable || [],
    }
  }

  return { data, error: null, unavailable: [] }
}

// ─── PARTICIPANTE AUTH ──────────────────────────────────────────────────────

export async function signUpParticipante(email, password, fullName, phone) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  })
  return { data, error }
}

/**
 * Grant participante role via SECURITY DEFINER function.
 *
 * FIXED in Phase 5: replaces the Phase 4 direct INSERT into user_roles,
 * which silently failed under Supabase RLS. There is no INSERT policy
 * that allows a new user to self-grant a role. The SECURITY DEFINER function
 * bypasses RLS while still validating auth.uid() = p_user_id.
 *
 * Confirmed: direct INSERT works in local postgres (superuser bypasses RLS)
 * but fails in Supabase (JWT-scoped RLS enforced). Silent failure = user
 * stuck at "sin rol asignado."
 */
export async function grantParticipanteRole(userId) {
  const { data, error } = await supabase.rpc('grant_participante_role', {
    p_user_id: userId,
  })
  if (error) return { error }
  if (!data?.success) {
    return { error: new Error(data?.detail || data?.reason || 'No se pudo asignar el rol.') }
  }
  return { error: null }
}

// ─── MY BOLETOS ─────────────────────────────────────────────────────────────

export async function fetchMyBoletos(participanteId) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      boleto_numero,
      amount_mxn,
      payment_status,
      created_at,
      sorteo_id,
      sorteos ( title, status, drawing_date, drawing_result )
    `)
    .eq('participante_id', participanteId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}
