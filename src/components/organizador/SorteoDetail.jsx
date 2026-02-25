// src/components/sorteos/SorteoDetail.jsx
// Full detail view for a single sorteo.
// Used by Organizador to manage vendedores and monitor sales.
//
// Props:
//   sorteoId — the sorteo to display
//   orgId    — current user's org
//   userId   — current user's profile id
//   onBack   — callback to return to the list

import { useState, useEffect, useCallback } from 'react'
import {
  fetchSorteoById,
  fetchVendedorSummary,
  fetchOrgVendedores,
  assignVendedor,
  removeVendedor,
} from '../../lib/sorteosApi'
import { StatusBadge, LoadingSpinner, ErrorMessage, SalesProgressBar, formatMXN, ConfirmModal } from '../shared/UI'

export function SorteoDetail({ sorteoId, orgId, userId, onBack, onEdit, onOpenReporting }) {
  const [sorteo, setSorteo]             = useState(null)
  const [vendedores, setVendedores]     = useState([])
  const [allVendedores, setAllVendedores] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [confirm, setConfirm]           = useState(null)
  const [assigning, setAssigning]       = useState(false)
  const [selectedVendedor, setSelectedVendedor] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sorteoRes, vendedorRes, allVendedoresRes] = await Promise.all([
        fetchSorteoById(sorteoId),
        fetchVendedorSummary(sorteoId),
        fetchOrgVendedores(orgId),
      ])
      if (sorteoRes.error) throw sorteoRes.error
      setSorteo(sorteoRes.data)
      setVendedores(vendedorRes.data || [])
      setAllVendedores(allVendedoresRes.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sorteoId, orgId])

  useEffect(() => { loadData() }, [loadData])

  async function handleAssign() {
    if (!selectedVendedor) return
    setAssigning(true)
    try {
      const { error } = await assignVendedor(selectedVendedor, sorteoId, orgId, userId)
      if (error) throw error
      setSelectedVendedor('')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  function handleRemove(vendedorId, vendedorName) {
    setConfirm({
      title: 'Quitar vendedor',
      message: `¿Quitar a ${vendedorName} de este sorteo? Sus ventas ya registradas no se perderán.`,
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: async () => {
        const { error } = await removeVendedor(vendedorId, sorteoId)
        if (error) throw error
        await loadData()
      },
    })
  }

  if (loading) return <LoadingSpinner message="Cargando sorteo..." />
  if (error)   return <ErrorMessage message={error} onRetry={loadData} />
  if (!sorteo) return <ErrorMessage message="Sorteo no encontrado." />

  // Vendedores not yet assigned (for the picker)
  const assignedIds = new Set(vendedores.map(v => v.vendedor_id))
  const unassigned  = allVendedores.filter(v => !assignedIds.has(v.user_id))

  return (
    <>
      {/* ── Header ── */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          ← Regresar
        </button>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2">
            <h4 className="mb-0">{sorteo.title}</h4>
            <StatusBadge status={sorteo.status} />
          </div>
          {sorteo.cause && <p className="text-muted small mb-0 mt-1"><em>{sorteo.cause}</em></p>}
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          {sorteo.status === 'draft' && (
            <button className="btn btn-outline-primary btn-sm" onClick={() => onEdit(sorteoId)}>
              Editar
            </button>
          )}
          {onOpenReporting && Number(sorteo.boletos_sold || 0) > 0 && (
            <button
              className="btn btn-outline-info btn-sm"
              onClick={() => onOpenReporting(sorteo)}
            >
              📊 Reporte
            </button>
          )}
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total boletos',    value: Number(sorteo.total_boletos).toLocaleString('es-MX') },
          { label: 'Vendidos',         value: Number(sorteo.boletos_sold || 0).toLocaleString('es-MX') },
          { label: 'Disponibles',      value: Number(sorteo.boletos_available || 0).toLocaleString('es-MX') },
          { label: 'Recaudado',        value: formatMXN(sorteo.revenue_mxn || 0), highlight: true },
        ].map(stat => (
          <div key={stat.label} className="col-6 col-md-3">
            <div className="card text-center h-100">
              <div className="card-body py-3">
                <div className={`fs-5 fw-bold ${stat.highlight ? 'text-success' : ''}`}>
                  {stat.value}
                </div>
                <div className="text-muted small">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card mb-4">
        <div className="card-body">
          <SalesProgressBar
            pctSold={sorteo.pct_sold}
            boletosSold={sorteo.boletos_sold || 0}
            totalBoletos={sorteo.total_boletos}
          />
        </div>
      </div>

      {/* ── Info row ── */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header"><h6 className="mb-0">Detalles</h6></div>
            <div className="card-body small">
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted">Precio por boleto</td>
                    <td className="fw-medium">{formatMXN(sorteo.price_per_boleto)}</td>
                  </tr>
                  {sorteo.permit_number && (
                    <tr>
                      <td className="text-muted">Permiso</td>
                      <td className="fw-medium">{sorteo.permit_number}</td>
                    </tr>
                  )}
                  {sorteo.start_date && (
                    <tr>
                      <td className="text-muted">Inicio ventas</td>
                      <td>{new Date(sorteo.start_date).toLocaleDateString('es-MX')}</td>
                    </tr>
                  )}
                  {sorteo.end_date && (
                    <tr>
                      <td className="text-muted">Cierre ventas</td>
                      <td>{new Date(sorteo.end_date).toLocaleDateString('es-MX')}</td>
                    </tr>
                  )}
                  {sorteo.drawing_date && (
                    <tr>
                      <td className="text-muted">Fecha sorteo</td>
                      <td>{new Date(sorteo.drawing_date).toLocaleDateString('es-MX')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">Estado del sorteo</h6>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-2">
                {['draft', 'active', 'closed', 'drawn'].map((s, i) => (
                  <div key={s} className="d-flex align-items-center gap-2">
                    <div className={`rounded-circle ${sorteo.status === s ? 'bg-primary' : sorteo.status === 'drawn' || (['active','closed','drawn'].indexOf(s) < ['active','closed','drawn'].indexOf(sorteo.status)) ? 'bg-success' : 'bg-light border'}`}
                      style={{ width: 12, height: 12, flexShrink: 0 }}
                    />
                    <span className={sorteo.status === s ? 'fw-bold' : 'text-muted'}>
                      { {draft:'1. Borrador', active:'2. Activo (ventas abiertas)', closed:'3. Cerrado (ventas cerradas)', drawn:'4. Sorteado'}[s] }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vendedores ── */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Vendedores asignados</h6>
          <span className="badge bg-secondary">{vendedores.length}</span>
        </div>
        <div className="card-body">
          {/* Assign picker */}
          {sorteo.status !== 'drawn' && (
            <div className="d-flex gap-2 mb-3">
              <select
                className="form-select form-select-sm"
                value={selectedVendedor}
                onChange={e => setSelectedVendedor(e.target.value)}
                disabled={assigning}
              >
                <option value="">Asignar vendedor...</option>
                {unassigned.map(v => (
                  <option key={v.user_id} value={v.user_id}>
                    {v.profiles?.full_name || 'Sin nombre'}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleAssign}
                disabled={!selectedVendedor || assigning}
              >
                {assigning ? <span className="spinner-border spinner-border-sm" /> : 'Asignar'}
              </button>
            </div>
          )}

          {/* Vendedor table */}
          {vendedores.length === 0 ? (
            <p className="text-muted small mb-0">Sin vendedores asignados aún.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th className="text-end">Ventas</th>
                    <th className="text-end">Recaudado</th>
                    <th className="text-end">Pendiente</th>
                    <th className="text-end">Última venta</th>
                    {sorteo.status !== 'drawn' && <th />}
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map(v => (
                    <tr key={v.vendedor_id}>
                      <td>
                        <div className="fw-medium">{v.vendedor_name || '—'}</div>
                        <div className="text-muted small">{v.vendedor_email}</div>
                      </td>
                      <td className="text-end">{v.total_sales}</td>
                      <td className="text-end text-success">{formatMXN(v.confirmed_revenue_mxn)}</td>
                      <td className="text-end text-warning">{formatMXN(v.total_revenue_mxn - v.confirmed_revenue_mxn)}</td>
                      <td className="text-end text-muted small">
                        {v.last_sale_at
                          ? new Date(v.last_sale_at).toLocaleDateString('es-MX')
                          : '—'
                        }
                      </td>
                      {sorteo.status !== 'drawn' && (
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemove(v.vendedor_id, v.vendedor_name)}
                          >
                            Quitar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
