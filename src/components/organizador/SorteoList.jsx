// src/components/sorteos/SorteoList.jsx
// Displays the list of sorteos on the Organizador dashboard.
// Each card shows stats and quick-action buttons.

import { StatusBadge, SalesProgressBar, formatMXN, ConfirmModal } from '../shared/UI'
import { transitionSorteoStatus } from '../../lib/sorteosApi'
import { useState } from 'react'

// ─── SORTEO CARD ──────────────────────────────────────────────────────────

export function SorteoCard({ sorteo, onEdit, onViewDetail, onStatusChanged }) {
  const [confirm, setConfirm]   = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError]       = useState(null)

  async function handleTransition(newStatus, config) {
    setConfirm({
      ...config,
      onConfirm: async () => {
        setTransitioning(true)
        setError(null)
        try {
          const { error } = await transitionSorteoStatus(sorteo.id, newStatus)
          if (error) throw error
          onStatusChanged?.(sorteo.id, newStatus)
        } catch (err) {
          setError(err.message)
        } finally {
          setTransitioning(false)
        }
      },
    })
  }

  const canActivate = sorteo.status === 'draft'
  const canClose    = sorteo.status === 'active'
  const canDraw     = sorteo.status === 'closed'

  return (
    <>
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="card-title mb-0 fw-bold">{sorteo.title}</h6>
            <StatusBadge status={sorteo.status} />
          </div>

          {/* Cause */}
          {sorteo.cause && (
            <p className="text-muted small mb-2">
              <em>{sorteo.cause}</em>
            </p>
          )}

          {/* Stats */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <div className="bg-light rounded p-2 text-center">
                <div className="fw-bold">
                  {Number(sorteo.boletos_sold || 0).toLocaleString('es-MX')}
                </div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>boletos vendidos</div>
              </div>
            </div>
            <div className="col-6">
              <div className="bg-light rounded p-2 text-center">
                <div className="fw-bold text-success">
                  {formatMXN(sorteo.revenue_mxn || 0)}
                </div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>recaudado</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <SalesProgressBar
            pctSold={sorteo.pct_sold}
            boletosSold={sorteo.boletos_sold || 0}
            totalBoletos={sorteo.total_boletos}
          />

          {/* Dates */}
          <div className="mt-2 small text-muted">
            {sorteo.drawing_date && (
              <div>
                Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </div>
            )}
            {sorteo.permit_number && (
              <div>Permiso: {sorteo.permit_number}</div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger small py-1 mt-2 mb-0">{error}</div>
          )}
        </div>

        {/* Actions */}
        <div className="card-footer bg-transparent">
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onViewDetail(sorteo.id)}
            >
              Ver detalle
            </button>
            {sorteo.status === 'draft' && (
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => onEdit(sorteo.id)}
              >
                Editar
              </button>
            )}
            {canActivate && (
              <button
                className="btn btn-sm btn-success"
                disabled={transitioning}
                onClick={() => handleTransition('active', {
                  title: 'Activar sorteo',
                  message: `¿Activar "${sorteo.title}"? Las ventas quedarán abiertas.`,
                  confirmLabel: 'Activar',
                })}
              >
                Activar
              </button>
            )}
            {canClose && (
              <button
                className="btn btn-sm btn-warning"
                disabled={transitioning}
                onClick={() => handleTransition('closed', {
                  title: 'Cerrar ventas',
                  message: `¿Cerrar ventas de "${sorteo.title}"? No se podrán registrar más boletos.`,
                  confirmLabel: 'Cerrar ventas',
                  warning: 'Esta acción no se puede deshacer si ya hay ventas registradas.',
                  danger: true,
                })}
              >
                Cerrar ventas
              </button>
            )}
            {canDraw && (
              <button
                className="btn btn-sm btn-primary"
                disabled={transitioning}
                onClick={() => handleTransition('drawn', {
                  title: 'Marcar como sorteado',
                  message: `¿Marcar "${sorteo.title}" como sorteado?`,
                  confirmLabel: 'Confirmar sorteo',
                  warning: 'El motor de aleatoriedad auditable (Phase 6) ejecutará el sorteo.',
                })}
              >
                Ejecutar sorteo
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}


// ─── SORTEO LIST ──────────────────────────────────────────────────────────

export function SorteoList({ sorteos, onEdit, onViewDetail, onStatusChanged }) {
  if (sorteos.length === 0) {
    return (
      <div className="text-center py-5">
        <div style={{ fontSize: '3rem' }}>🎟️</div>
        <p className="text-muted mt-2">
          Aún no hay sorteos. ¡Crea el primero!
        </p>
      </div>
    )
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      {sorteos.map(sorteo => (
        <div key={sorteo.id} className="col">
          <SorteoCard
            sorteo={sorteo}
            onEdit={onEdit}
            onViewDetail={onViewDetail}
            onStatusChanged={onStatusChanged}
          />
        </div>
      ))}
    </div>
  )
}
