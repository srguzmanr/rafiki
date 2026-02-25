// src/components/vendedor/SalesHistory.jsx
//
// Vendedor's personal sales history for a sorteo.
// Shows who bought what, when. Grouped by day for easy cash reconciliation.
// Search by buyer name or boleto number — for when a buyer calls with a question.
//
// Props:
//   sales    — array of sale records for this vendedor + sorteo
//   sorteo   — the sorteo object
//   onBack() — return to QuickSell

import { useState, useMemo } from 'react'
import { formatMXN } from '../shared/UI'

export function SalesHistory({ sales, sorteo, onBack }) {
  const [search, setSearch] = useState('')

  // Filter by buyer name or boleto number
  const filtered = useMemo(() => {
    if (!search.trim()) return sales
    const q = search.toLowerCase()
    return sales.filter(
      s =>
        s.buyer_name.toLowerCase().includes(q) ||
        String(s.boleto_numero).includes(q) ||
        s.buyer_phone.includes(q)
    )
  }, [sales, search])

  // Group filtered sales by day (most recent first)
  const byDay = useMemo(() => {
    const groups = {}
    for (const sale of filtered) {
      const day = new Date(sale.created_at).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      if (!groups[day]) groups[day] = []
      groups[day].push(sale)
    }
    return Object.entries(groups)
  }, [filtered])

  const totalAmount = sales
    .filter(s => s.payment_status !== 'refunded')
    .reduce((sum, s) => sum + Number(s.amount_mxn), 0)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={onBack}
          style={{ minWidth: 36, minHeight: 36 }}
        >
          ←
        </button>
        <div>
          <div className="fw-bold">Mis ventas</div>
          <div className="text-muted small">{sorteo.title}</div>
        </div>
      </div>

      {/* Summary */}
      <div className="row g-2 mb-3">
        <div className="col-6">
          <div className="bg-primary text-white rounded-3 p-3 text-center">
            <div className="fs-3 fw-bold">{sales.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>boletos vendidos</div>
          </div>
        </div>
        <div className="col-6">
          <div className="bg-success text-white rounded-3 p-3 text-center">
            <div className="fs-4 fw-bold">{formatMXN(totalAmount)}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>total recaudado</div>
          </div>
        </div>
      </div>

      {/* Search */}
      {sales.length > 0 && (
        <div className="mb-3">
          <input
            type="search"
            className="form-control"
            placeholder="Buscar por nombre, boleto o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minHeight: 44 }}
          />
        </div>
      )}

      {/* Empty state */}
      {sales.length === 0 && (
        <div className="text-center py-5">
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <p className="text-muted mt-2">Aún no tienes ventas registradas.</p>
        </div>
      )}

      {/* No search results */}
      {sales.length > 0 && filtered.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted">Sin resultados para "{search}".</p>
        </div>
      )}

      {/* Sales grouped by day */}
      {byDay.map(([day, daySales]) => (
        <div key={day} className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="text-muted text-capitalize mb-0" style={{ fontSize: '0.8rem' }}>
              {day}
            </h6>
            <span className="text-muted small">
              {daySales.length} venta{daySales.length !== 1 ? 's' : ''} ·{' '}
              {formatMXN(daySales.reduce((s, v) => s + Number(v.amount_mxn), 0))}
            </span>
          </div>

          <div className="d-flex flex-column gap-2">
            {daySales.map(sale => (
              <div key={sale.id} className="card border-0 bg-white shadow-sm">
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-medium">{sale.buyer_name}</div>
                      <div className="text-muted small">{sale.buyer_phone}</div>
                    </div>
                    <div className="text-end ms-3 flex-shrink-0">
                      <div className="fw-bold text-primary">#{sale.boleto_numero}</div>
                      <div className="text-success small fw-medium">
                        {formatMXN(sale.amount_mxn)}
                      </div>
                    </div>
                  </div>

                  {/* Payment status badge */}
                  {sale.payment_status === 'refunded' && (
                    <span className="badge bg-danger mt-1">Reembolsado</span>
                  )}
                  {sale.payment_status === 'confirmed' && (
                    <span className="badge bg-success mt-1">Confirmado</span>
                  )}

                  {/* Time */}
                  <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                    {new Date(sale.created_at).toLocaleTimeString('es-MX', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
