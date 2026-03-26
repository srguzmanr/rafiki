// src/lib/sorteosApi.js
// All Supabase calls related to sorteo management.
// Components import from here — never call supabase directly from a component.

import { supabase } from './supabase'

// ─── READ ──────────────────────────────────────────────────────────────────

export async function fetchSorteosWithStats() {
  const { data, error } = await supabase
    .from('sorteos_with_stats')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function fetchSorteoById(sorteoId) {
  const { data, error } = await supabase
    .from('sorteos_with_stats')
    .select('*')
    .eq('id', sorteoId)
    .single()
  return { data, error }
}

export async function fetchPrizes(sorteoId) {
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .eq('sorteo_id', sorteoId)
    .order('position', { ascending: true })
  return { data, error }
}

export async function fetchPublicSorteo(sorteoId) {
  const { data, error } = await supabase
    .from('public_sorteo_detail')
    .select('*')
    .eq('id', sorteoId)
    .single()
  return { data, error }
}

export async function fetchPublicSorteosByOrg(orgSlug) {
  const { data, error } = await supabase
    .from('public_sorteo_detail')
    .select('*')
    .eq('org_slug', orgSlug)
    .order('start_date', { ascending: false })
  return { data, error }
}

export async function fetchAllPublicSorteos() {
  const { data, error } = await supabase
    .from('public_sorteo_detail')
    .select('*')
    .order('start_date', { ascending: false })
  return { data: data || [], error }
}

// ─── WRITE ─────────────────────────────────────────────────────────────────

export async function createSorteo(orgId, userId, formData) {
  const { data, error } = await supabase
    .from('sorteos')
    .insert({
      organization_id:  orgId,
      created_by:       userId,
      title:            formData.title,
      description:      formData.description || null,
      cause:            formData.cause || null,
      total_boletos:    Number(formData.total_boletos),
      price_per_boleto: Number(formData.price_per_boleto),
      start_date:       formData.start_date || null,
      end_date:         formData.end_date || null,
      drawing_date:     formData.drawing_date || null,
      permit_number:    formData.permit_number || null,
      status:           'draft',
    })
    .select()
    .single()
  return { data, error }
}

export async function updateSorteo(sorteoId, updates) {
  const { status: _removed, ...safeUpdates } = updates
  const { data, error } = await supabase
    .from('sorteos')
    .update(safeUpdates)
    .eq('id', sorteoId)
    .select()
    .single()
  return { data, error }
}

export async function transitionSorteoStatus(sorteoId, newStatus) {
  const { data, error } = await supabase.rpc('transition_sorteo_status', {
    p_sorteo_id:  sorteoId,
    p_new_status: newStatus,
  })
  if (error) return { data: null, error }
  if (!data?.success) {
    return { data: null, error: new Error(data?.detail || data?.reason || 'Transition failed') }
  }
  return { data, error: null }
}

// ─── PRIZES ────────────────────────────────────────────────────────────────

export async function savePrizes(sorteoId, orgId, prizesArray) {
  const { error: deleteError } = await supabase
    .from('prizes').delete().eq('sorteo_id', sorteoId)
  if (deleteError) return { error: deleteError }
  if (prizesArray.length === 0) return { error: null }

  const rows = prizesArray.map((prize, index) => ({
    sorteo_id:       sorteoId,
    organization_id: orgId,
    position:        index + 1,
    title:           prize.title,
    description:     prize.description || null,
    value_mxn:       prize.value_mxn ? Number(prize.value_mxn) : null,
    image_url:       prize.image_url || null,
  }))
  const { data, error } = await supabase.from('prizes').insert(rows).select()
  return { data, error }
}

// ─── BOLETO GENERATION ─────────────────────────────────────────────────────

export async function generateBoletos(sorteoId) {
  const { data, error } = await supabase.functions.invoke('generate-boletos', {
    body: { sorteo_id: sorteoId },
  })
  if (error) return { data: null, error }
  if (!data?.success) {
    return { data: null, error: new Error(data?.detail || data?.reason || 'Boleto generation failed') }
  }
  return { data, error: null }
}

// ─── VENDEDOR MANAGEMENT ───────────────────────────────────────────────────

export async function fetchVendedorSummary(sorteoId) {
  const { data, error } = await supabase
    .from('vendedor_sales_summary')
    .select('*')
    .eq('sorteo_id', sorteoId)
    .order('total_sales', { ascending: false })
  return { data, error }
}

export async function fetchOrgVendedores(orgId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, profiles ( id, full_name, phone )')
    .eq('organization_id', orgId)
    .eq('role', 'vendedor')
    .eq('status', 'active')
  return { data, error }
}

export async function assignVendedor(vendedorId, sorteoId, orgId, assignedBy) {
  const { data, error } = await supabase
    .from('vendedor_assignments')
    .upsert({
      vendedor_id:     vendedorId,
      sorteo_id:       sorteoId,
      organization_id: orgId,
      assigned_by:     assignedBy,
      status:          'active',
    }, { onConflict: 'vendedor_id,sorteo_id' })
    .select()
    .single()
  return { data, error }
}

export async function removeVendedor(vendedorId, sorteoId) {
  const { data, error } = await supabase
    .from('vendedor_assignments')
    .update({ status: 'removed' })
    .eq('vendedor_id', vendedorId)
    .eq('sorteo_id', sorteoId)
    .select()
    .single()
  return { data, error }
}

// ─── REPORTING ─────────────────────────────────────────────────────────────

/**
 * Full sales list for a sorteo — used for reporting table and CSV export.
 * RLS ensures organizador only sees their own org's data.
 */
export async function fetchReportSales(sorteoId) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      boleto_numero,
      buyer_name,
      buyer_phone,
      buyer_email,
      amount_mxn,
      payment_status,
      sale_channel,
      marketing_consent,
      created_at,
      vendedor_id,
      profiles!sales_vendedor_id_fkey ( full_name )
    `)
    .eq('sorteo_id', sorteoId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

/**
 * Daily sales breakdown for a sorteo — powers the reporting timeline chart.
 */
export async function fetchDailySales(sorteoId) {
  const { data, error } = await supabase
    .from('daily_sales_by_sorteo')
    .select('*')
    .eq('sorteo_id', sorteoId)
    .order('sale_date', { ascending: true })
  return { data: data || [], error }
}

/**
 * Build a CSV from the full sales report and trigger a browser download.
 * \uFEFF BOM prefix ensures Excel (es-MX) opens accented characters correctly.
 */
export async function exportSalesCSV(sorteoId, sorteoTitle) {
  const { data, error } = await fetchReportSales(sorteoId)
  if (error || !data.length) return { error: error || new Error('No hay ventas para exportar.') }

  const headers = [
    'Boleto', 'Comprador', 'Telefono', 'Correo',
    'Monto MXN', 'Estado Pago', 'Canal', 'Vendedor', 'Acepta marketing', 'Fecha y Hora',
  ]

  const rows = data.map(s => [
    s.boleto_numero,
    s.buyer_name,
    s.buyer_phone,
    s.buyer_email || '',
    s.amount_mxn,
    s.payment_status,
    s.sale_channel,
    s.profiles?.full_name || '(online)',
    s.marketing_consent === false ? 'No' : 'Sí',
    new Date(s.created_at).toLocaleString('es-MX', {
      timeZone: 'America/Hermosillo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${sorteoTitle.replace(/[^a-z0-9]/gi, '_')}_ventas_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return { error: null }
}

// ─── DRAW WINNERS ──────────────────────────────────────────────────────────

/**
 * Execute the sorteo drawing. Selects random winners for each prize.
 * Sorteo must be in 'closed' status. One-shot — cannot be re-run.
 * Returns { drawing_result } on success.
 */
export async function drawWinners(sorteoId) {
  const { data, error } = await supabase.rpc('draw_winners', {
    p_sorteo_id: sorteoId,
  })

  if (error) return { data: null, error }

  if (!data?.success) {
    const messages = {
      not_authenticated:    'Debes iniciar sesión.',
      sorteo_not_found:     'Sorteo no encontrado.',
      permission_denied:    data?.detail || 'No tienes permiso para realizar este sorteo.',
      already_drawn:        'Este sorteo ya fue realizado.',
      sorteo_not_closed:    data?.detail || 'El sorteo debe estar cerrado primero.',
      no_eligible_boletos:  'No hay boletos vendidos para realizar el sorteo.',
      not_enough_boletos:   'No hay suficientes boletos vendidos para cubrir todos los premios.',
    }
    return {
      data: null,
      error: new Error(messages[data?.reason] || data?.detail || 'Error al realizar el sorteo.'),
    }
  }

  return { data, error: null }
}

// ─── ADMIN ─────────────────────────────────────────────────────────────────

/**
 * All organizations with aggregate stats — admin only.
 * Uses all_orgs_with_stats view (RLS blocks non-admins automatically).
 */
export async function fetchAllOrgsWithStats() {
  const { data, error } = await supabase
    .from('all_orgs_with_stats')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

/**
 * Create a new organizador tenant (org record only).
 * The admin then manually creates the user account in Supabase Auth UI,
 * or sends an invite link. Full user-creation via service role key is Phase 6+.
 */
export async function createOrganizadorTenant({ orgName, orgSlug, contactEmail }) {
  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug: orgSlug, contact_email: contactEmail, status: 'active' })
    .select()
    .single()
  return { org: org || null, error }
}

/**
 * Activate or deactivate an organization.
 */
export async function setOrgStatus(orgId, status) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', orgId)
    .select()
    .single()
  return { data, error }
}
