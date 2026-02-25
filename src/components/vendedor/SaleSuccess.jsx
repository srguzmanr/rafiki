// src/components/vendedor/SaleSuccess.jsx
//
// Shown for ~2 seconds after a successful sale, then auto-returns to QuickSell.
// The vendedor sees the boleto number and buyer name confirmed.
// Big "Nueva venta" button to go again immediately — no waiting.
//
// Props:
//   result — { sale_id, boleto_numero, amount_mxn, buyerName, sorteoTitle }
//   onNewSale() — go back to QuickSell for the same sorteo
//   onDone()    — go back to sorteo selector

import { useEffect, useState } from 'react'
import { formatMXN } from '../shared/UI'

const AUTO_RETURN_MS = 3000

export function SaleSuccess({ result, onNewSale, onDone }) {
  const [countdown, setCountdown] = useState(Math.ceil(AUTO_RETURN_MS / 1000))

  // Auto-return to sell mode after AUTO_RETURN_MS
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          onNewSale()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onNewSale])

  return (
    <div
      style={{ maxWidth: 480, margin: '0 auto', minHeight: '60vh' }}
      className="d-flex flex-column align-items-center justify-content-center text-center px-3"
    >
      {/* Success icon */}
      <div
        className="rounded-circle bg-success d-flex align-items-center justify-content-center mb-4"
        style={{ width: 80, height: 80 }}
      >
        <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>✓</span>
      </div>

      <h3 className="fw-bold text-success mb-1">¡Venta registrada!</h3>
      <p className="text-muted mb-4">{result.sorteoTitle}</p>

      {/* Sale details */}
      <div className="card w-100 mb-4">
        <div className="card-body text-start">
          <div className="row g-2">
            <div className="col-6">
              <div className="text-muted small">Boleto</div>
              <div className="fs-4 fw-bold text-primary">#{result.boleto_numero}</div>
            </div>
            <div className="col-6 text-end">
              <div className="text-muted small">Monto</div>
              <div className="fs-4 fw-bold text-success">{formatMXN(result.amount_mxn)}</div>
            </div>
            <div className="col-12">
              <div className="text-muted small">Comprador</div>
              <div className="fw-medium">{result.buyerName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary action — go again */}
      <button
        className="btn btn-success w-100 mb-2"
        onClick={onNewSale}
        style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 700, borderRadius: 10 }}
      >
        ⚡ Nueva venta
        <span className="badge bg-white text-success ms-2 fw-normal" style={{ fontSize: '0.75rem' }}>
          Auto en {countdown}s
        </span>
      </button>

      <button
        className="btn btn-outline-secondary w-100"
        onClick={onDone}
        style={{ minHeight: 44 }}
      >
        Ver mis ventas
      </button>
    </div>
  )
}
