// src/lib/vendedorApi.js
// All Supabase calls for the vendedor sales flow.
// claim_boleto() is the critical path — everything else supports it.

import { supabase } from './supabase'

// ─── ASSIGNED SORTEOS ──────────────────────────────────────────────────────

/**
 * Fetch sorteos assigned to this vendedor with live stats.
 * Joins vendedor_assignments → sorteos_with_stats.
 */
export async function fetchAssignedSorteos(vendedorId) {
  const { data, error } = await supabase
    .from('vendedor_assignments')
    .select(`
      sorteo_id,
      status,
      sorteos_with_stats (
        id,
        title,
        cause,
        total_boletos,
        price_per_boleto,
        status,
        drawing_date,
        boletos_sold,
        boletos_available,
        pct_sold,
        revenue_mxn
      )
    `)
    .eq('vendedor_id', vendedorId)
    .eq('status', 'active')
    // Only show sorteos that are actually open for sales
    .filter('sorteos_with_stats.status', 'eq', 'active')

  // Flatten the join result
  const sorteos = (data || [])
    .map(row => row.sorteos_with_stats)
    .filter(Boolean)

  return { data: sorteos, error }
}

// ─── BOLETO AVAILABILITY ───────────────────────────────────────────────────

/**
 * Check if a specific boleto number is available.
 * Returns: 'available' | 'sold' | 'not_found'
 * Uses the unique index on (sorteo_id, numero) — sub-5ms even on 40K rows.
 */
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

/**
 * Get the next available boleto number for quick-select.
 * Returns the numero (integer) or null if sorteo is fully sold.
 */
export async function fetchNextAvailable(sorteoId) {
  const { data, error } = await supabase
    .rpc('get_next_available_boleto', { p_sorteo_id: sorteoId })

  return { numero: data, error }
}

// ─── CLAIM BOLETO (THE CRITICAL PATH) ────────────────────────────────────

/**
 * Claim a boleto and record the sale atomically.
 * This is the core vendedor sales action. Everything else is UI.
 *
 * Returns:
 *   { data: { sale_id, boleto_numero, amount_mxn }, error: null } — success
 *   { data: null, error: Error } — boleto taken, sorteo closed, etc.
 */
export async function claimBoleto({
  sorteoId,
  numero,
  vendedorId,
  buyerName,
  buyerPhone,
  buyerEmail = null,
}) {
  const { data, error } = await supabase.rpc('claim_boleto', {
    p_sorteo_id:   sorteoId,
    p_numero:      numero,
    p_vendedor_id: vendedorId,
    p_buyer_name:  buyerName,
    p_buyer_phone: buyerPhone,
    p_buyer_email: buyerEmail || null,
  })

  if (error) return { data: null, error }

  if (!data?.success) {
    const messages = {
      boleto_unavailable:    'Este boleto ya fue vendido. Elige otro número.',
      sorteo_not_active:     'Este sorteo ya no está activo.',
      sorteo_not_found:      'Sorteo no encontrado.',
      vendedor_not_assigned: 'No estás asignado a este sorteo.',
    }
    return {
      data: null,
      error: new Error(messages[data?.reason] || 'Error al registrar la venta. Intenta de nuevo.'),
      reason: data?.reason,
    }
  }

  return { data, error: null }
}

// ─── VENDEDOR DASHBOARD DATA ──────────────────────────────────────────────

/**
 * Fetch this vendedor's sales for a specific sorteo.
 * Used in sales history and today's count.
 */
export async function fetchMyVentasBySorteo(vendedorId, sorteoId) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, boleto_numero, buyer_name, buyer_phone, buyer_email, amount_mxn, payment_status, created_at')
    .eq('vendedor_id', vendedorId)
    .eq('sorteo_id', sorteoId)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

/**
 * Fetch vendedor's sales across ALL their assigned sorteos — for the dashboard total.
 */
export async function fetchMyVentasAllSorteos(vendedorId) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, sorteo_id, boleto_numero, buyer_name, amount_mxn, payment_status, created_at')
    .eq('vendedor_id', vendedorId)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

/**
 * Today's sales count and revenue for a vendedor (client-side filter).
 * Avoids an extra DB call by filtering the already-fetched sales array.
 */
export function getTodayStats(sales) {
  const today = new Date().toDateString()
  const todaySales = sales.filter(
    s => new Date(s.created_at).toDateString() === today
      && s.payment_status !== 'refunded'
  )
  return {
    count:      todaySales.length,
    amount_mxn: todaySales.reduce((sum, s) => sum + Number(s.amount_mxn), 0),
  }
}
