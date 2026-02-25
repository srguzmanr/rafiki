// src/components/organizador/ReportingDashboard.jsx
//
// Organizador analytics for a single sorteo.
// Three sections: summary cards, vendedor breakdown table, daily sales timeline.
// CSV export triggers a browser download — no server needed.
//
// Props:
//   sorteo  — sorteo object from sorteos_with_stats
//   onBack  — back to sorteo detail

import { useState, useEffect } from 'react'
import {
  fetchVendedorSummary,
  fetchDailySales,
  exportSalesCSV,
} from '../../lib/sorteosApi'
import { formatMXN, LoadingSpinner, ErrorMessage } from '../shared/UI'

export function ReportingDashboard({ sorteo, onBack }) {
  const [vendedores, setVendedores] = useState([])
  const [dailySales, setDailySales] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [exporting, setExporting]   = useState(false)
  const [exportMsg, setExportMsg]   = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const [vRes, dRes] = await Promise.all([
        fetchVendedorSummary(sorteo.id),
        fetchDailySales(sorteo.id),
      ])
      if (vRes.error) setError(vRes.error.message)
      else {
        setVendedores(vRes.data || [])
        setDailySales(dRes.data || [])
      }
      setLoading(false)
    }
    load()
  }, [sorteo.id])

  async function handleExport() {
    setExporting(true)
    setExportMsg(null)
    const { error } = await exportSalesCSV(sorteo.id, sorteo.title)
    setExporting(false)
    setExportMsg(error ? `Error: ${error.message}` : '✓ Descarga iniciada')
    setTimeout(() => setExportMsg(null), 3000)
  }

  // Daily chart: scale bars to the max daily count
  const maxDay = Math.max(...dailySales.map(d => Number(d.sales_count)), 1)

  if (loading) return <LoadingSpinner message="Cargando reportes..." />
  if (error)   return <ErrorMessage message={error} />

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>← Regresar</button>
          <div>
            <h5 className="mb-0 fw-bold">Reporte de ventas</h5>
            <div className="text-muted small">{sorteo.title}</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {exportMsg && (
            <span className={`small ${exportMsg.startsWith('Error') ? 'text-danger' : 'text-success'}`}>
              {exportMsg}
            </span>
          )}
          <button
            className="btn btn-outline-success btn-sm"
            onClick={handleExport}
            disabled={exporting || Number(sorteo.boletos_sold) === 0}
          >
            {exporting
              ? <><span className="spinner-border spinner-border-sm me-1" />Exportando...</>
              : '⬇ Descargar CSV'
            }
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Boletos vendidos',  value: Number(sorteo.boletos_sold || 0).toLocaleString('es-MX'), color: 'primary' },
          { label: 'Disponibles',       value: Number(sorteo.boletos_available || 0).toLocaleString('es-MX'), color: 'secondary' },
          { label: 'Recaudado',         value: formatMXN(sorteo.revenue_mxn || 0), color: 'success' },
          { label: '% Vendido',         value: `${Math.round(sorteo.pct_sold || 0)}%`, color: 'info' },
        ].map(card => (
          <div key={card.label} className="col-6 col-md-3">
            <div className={`card border-0 bg-${card.color} bg-opacity-10 h-100`}>
              <div className="card-body py-3 text-center">
                <div className={`fs-4 fw-bold text-${card.color}`}>{card.value}</div>
                <div className="text-muted small">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Vendedor breakdown ── */}
      <div className="card mb-4">
        <div className="card-header bg-white fw-bold">
          Rendimiento por vendedor
        </div>
        {vendedores.length === 0 ? (
          <div className="card-body text-muted text-center py-4">
            Sin datos de vendedores aún.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Vendedor</th>
                  <th className="text-end">Boletos</th>
                  <th className="text-end">Confirmados</th>
                  <th className="text-end">Pendiente</th>
                  <th className="text-end">Total</th>
                  <th className="text-muted text-end" style={{ fontSize: '0.75rem' }}>Última venta</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map(v => (
                  <tr key={v.vendedor_id}>
                    <td className="fw-medium">{v.vendedor_name || <span className="text-muted">(sin nombre)</span>}</td>
                    <td className="text-end">{v.total_sales}</td>
                    <td className="text-end text-success">{formatMXN(v.confirmed_revenue_mxn || 0)}</td>
                    <td className="text-end text-warning">{formatMXN(Number(v.total_revenue_mxn||0) - Number(v.confirmed_revenue_mxn||0))}</td>
                    <td className="text-end fw-bold">{formatMXN(Number(v.total_revenue_mxn||0))}</td>
                    <td className="text-end text-muted" style={{ fontSize: '0.75rem' }}>
                      {v.last_sale_at
                        ? new Date(v.last_sale_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <td className="fw-bold">Total</td>
                  <td className="text-end fw-bold">{vendedores.reduce((s, v) => s + Number(v.total_sales || 0), 0)}</td>
                  <td className="text-end fw-bold text-success">
                    {formatMXN(vendedores.reduce((s, v) => s + Number(v.confirmed_revenue_mxn || 0), 0))}
                  </td>
                  <td className="text-end fw-bold text-warning">
                    {formatMXN(vendedores.reduce((s, v) => s + Number(v.total_revenue_mxn||0) - Number(v.confirmed_revenue_mxn||0), 0))}
                  </td>
                  <td className="text-end fw-bold">
                    {formatMXN(vendedores.reduce((s, v) =>
                      s + Number(v.total_revenue_mxn||0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Daily sales timeline ── */}
      <div className="card">
        <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
          <span>Ventas por día</span>
          <span className="text-muted small fw-normal">{dailySales.length} días con ventas</span>
        </div>
        {dailySales.length === 0 ? (
          <div className="card-body text-muted text-center py-4">Sin ventas registradas aún.</div>
        ) : (
          <div className="card-body px-3 py-3">
            <div className="d-flex flex-column gap-2">
              {[...dailySales].reverse().map(day => {
                const pct = Math.max(4, Math.round((Number(day.sales_count) / maxDay) * 100))
                return (
                  <div key={day.sale_date} className="d-flex align-items-center gap-3">
                    {/* Date label */}
                    <div className="text-muted" style={{ minWidth: 90, fontSize: '0.78rem' }}>
                      {new Date(day.sale_date + 'T12:00:00').toLocaleDateString('es-MX', {
                        weekday: 'short', day: 'numeric', month: 'short'
                      })}
                    </div>
                    {/* Bar */}
                    <div className="flex-grow-1 bg-light rounded" style={{ height: 22, position: 'relative' }}>
                      <div
                        className="bg-primary rounded h-100 d-flex align-items-center px-2"
                        style={{ width: `${pct}%`, transition: 'width 0.3s', minWidth: 28 }}
                      >
                        <span className="text-white" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {day.sales_count}
                        </span>
                      </div>
                    </div>
                    {/* Revenue */}
                    <div className="text-success fw-medium text-end" style={{ minWidth: 80, fontSize: '0.82rem' }}>
                      {formatMXN(day.revenue_mxn)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
