// src/components/shared/UI.jsx
// Small, reusable UI primitives used across all pages.

import { useState } from 'react'

// ─── STATUS BADGE ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:  { label: 'Borrador',   bg: 'bg-secondary' },
  active: { label: 'Activo',     bg: 'bg-success'   },
  closed: { label: 'Cerrado',    bg: 'bg-warning text-dark' },
  drawn:  { label: 'Sorteado',   bg: 'bg-primary'   },
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-secondary' }
  return (
    <span className={`badge ${cfg.bg}`}>{cfg.label}</span>
  )
}

// ─── LOADING SPINNER ───────────────────────────────────────────────────────

export function LoadingSpinner({ message = 'Cargando...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Cargando</span>
      </div>
      <p className="text-muted small">{message}</p>
    </div>
  )
}

// ─── ERROR MESSAGE ─────────────────────────────────────────────────────────

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between">
      <span>{message || 'Ocurrió un error. Intenta de nuevo.'}</span>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger ms-3" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

// ─── CONFIRM MODAL ─────────────────────────────────────────────────────────

/**
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *   setConfirm({ title: '¿Seguro?', message: '...', onConfirm: () => ... })
 *   <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
 */
export function ConfirmModal({ config, onClose }) {
  const [loading, setLoading] = useState(false)

  if (!config) return null

  async function handleConfirm() {
    setLoading(true)
    try {
      await config.onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{config.title || 'Confirmar acción'}</h5>
            <button className="btn-close" onClick={onClose} disabled={loading} />
          </div>
          <div className="modal-body">
            <p>{config.message}</p>
            {config.warning && (
              <div className="alert alert-warning small mb-0">
                {config.warning}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              className={`btn ${config.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm me-2" />
                : null
              }
              {config.confirmLabel || 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CURRENCY FORMAT ──────────────────────────────────────────────────────

export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

// ─── PROGRESS BAR ──────────────────────────────────────────────────────────

export function SalesProgressBar({ pctSold, boletosSold, totalBoletos }) {
  const pct = pctSold || 0
  const color = pct >= 90 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success'

  return (
    <div>
      <div className="d-flex justify-content-between small text-muted mb-1">
        <span>{Number(boletosSold).toLocaleString('es-MX')} vendidos</span>
        <span>{Number(totalBoletos - boletosSold).toLocaleString('es-MX')} disponibles</span>
      </div>
      <div className="progress" style={{ height: '8px' }}>
        <div
          className={`progress-bar ${color}`}
          role="progressbar"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
      <div className="text-end small text-muted mt-1">{pct}%</div>
    </div>
  )
}
