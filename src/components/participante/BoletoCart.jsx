// src/components/participante/BoletoCart.jsx
//
// Participante boleto selection. Differs from QuickSell in key ways:
// - Multi-boleto: buyer can add multiple números to a cart before checking out
// - Quantity quick-select: "Dame 3 boletos" — no specific numbers needed
// - No auto-advance: participante takes their time browsing
// - All boletos shown in a reviewable cart before submitting

import { useState, useRef, useCallback } from 'react'
import { checkBoletoAvailability, fetchNextAvailableBoletos } from '../../lib/participanteApi'
import { formatMXN } from '../shared/UI'

const DEBOUNCE_MS = 350
const MAX_BOLETOS = 10  // per transaction for participantes (lower than the 20 DB limit)

export function BoletoCart({ sorteo, cart, onCartChange }) {
  const [numInput, setNumInput]     = useState('')
  const [availability, setAvail]    = useState(null)  // null|checking|available|sold|not_found|in_cart
  const [qtyInput, setQtyInput]     = useState('1')
  const [loadingQty, setLoadingQty] = useState(false)
  const [qtyError, setQtyError]     = useState(null)

  const debounceRef = useRef(null)
  const numRef      = useRef(null)

  const totalAmount = cart.length * Number(sorteo.price_per_boleto)
  const spotsLeft   = MAX_BOLETOS - cart.length

  // ── Check a specific number while typing ──
  function handleNumChange(val) {
    const digits = val.replace(/\D/g, '')
    setNumInput(digits)
    setAvail(digits ? 'checking' : null)

    clearTimeout(debounceRef.current)
    if (!digits) return

    debounceRef.current = setTimeout(async () => {
      const n = Number(digits)
      if (n < 1 || n > sorteo.total_boletos) {
        setAvail('not_found')
        return
      }
      if (cart.includes(n)) {
        setAvail('in_cart')
        return
      }
      const { status } = await checkBoletoAvailability(sorteo.id, n)
      setAvail(status)
    }, DEBOUNCE_MS)
  }

  // ── Add the typed number to cart ──
  function handleAddToCart() {
    const n = Number(numInput)
    if (!n || availability !== 'available' || cart.includes(n)) return
    if (cart.length >= MAX_BOLETOS) return

    onCartChange([...cart, n])
    setNumInput('')
    setAvail(null)
    numRef.current?.focus()
  }

  // ── Quick-select: fetch N available números ──
  async function handleQuickSelect() {
    const qty = Math.min(Number(qtyInput) || 1, spotsLeft, 20)
    if (qty < 1) return

    setLoadingQty(true)
    setQtyError(null)

    const { numeros, error } = await fetchNextAvailableBoletos(sorteo.id, qty)

    if (error || numeros.length === 0) {
      setQtyError('No hay suficientes boletos disponibles.')
      setLoadingQty(false)
      return
    }

    // Merge with cart, deduplicate
    const merged = [...new Set([...cart, ...numeros])].slice(0, MAX_BOLETOS)
    onCartChange(merged)
    setLoadingQty(false)
  }

  // ── Remove from cart ──
  function handleRemove(n) {
    onCartChange(cart.filter(x => x !== n))
  }

  // ── Availability badge ──
  const AvailBadge = useCallback(() => {
    const map = {
      checking:  ['bg-secondary', '...'],
      available: ['bg-success',   '✓ Disponible'],
      sold:      ['bg-danger',    '✗ Vendido'],
      not_found: ['bg-warning text-dark', 'Número inválido'],
      in_cart:   ['bg-info text-dark', 'Ya en tu selección'],
    }
    if (!availability || !map[availability]) return null
    const [cls, label] = map[availability]
    return <span className={`badge ${cls} ms-2`}>{label}</span>
  }, [availability])

  return (
    <div>
      {/* ── Cart display ── */}
      {cart.length > 0 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold">Tus boletos ({cart.length})</span>
            <span className="text-success fw-bold">{formatMXN(totalAmount)}</span>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {[...cart].sort((a, b) => a - b).map(n => (
              <span
                key={n}
                className="badge bg-primary d-flex align-items-center gap-1"
                style={{ fontSize: '0.9rem', padding: '6px 10px', borderRadius: 8 }}
              >
                #{n}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.5rem', marginLeft: 2 }}
                  onClick={() => handleRemove(n)}
                  aria-label={`Quitar boleto ${n}`}
                />
              </span>
            ))}
          </div>
          {cart.length >= MAX_BOLETOS && (
            <div className="text-muted small mt-1">
              Máximo {MAX_BOLETOS} boletos por compra.
            </div>
          )}
        </div>
      )}

      {/* ── Add specific number ── */}
      <div className="card mb-3">
        <div className="card-body pb-3">
          <label className="fw-medium mb-2 d-flex align-items-center">
            Elige un número específico
            <AvailBadge />
          </label>
          <div className="d-flex gap-2">
            <div className="input-group">
              <span className="input-group-text">#</span>
              <input
                ref={numRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`form-control form-control-lg ${
                  availability === 'available' ? 'is-valid'
                  : (availability === 'sold' || availability === 'not_found') ? 'is-invalid'
                  : ''
                }`}
                placeholder={`1 – ${Number(sorteo.total_boletos).toLocaleString('es-MX')}`}
                value={numInput}
                onChange={e => handleNumChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddToCart()}
                disabled={cart.length >= MAX_BOLETOS}
                style={{ fontSize: '1.3rem' }}
              />
            </div>
            <button
              className="btn btn-primary flex-shrink-0"
              onClick={handleAddToCart}
              disabled={availability !== 'available' || cart.includes(Number(numInput)) || cart.length >= MAX_BOLETOS}
              style={{ minWidth: 60 }}
            >
              + Agregar
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick-select N boletos ── */}
      <div className="card">
        <div className="card-body">
          <label className="fw-medium mb-2 d-block">
            O selecciona cuántos quieres
          </label>
          <div className="d-flex gap-2 align-items-center">
            {[1, 2, 3, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`btn ${Number(qtyInput) === n ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setQtyInput(String(n))}
                disabled={n > spotsLeft || loadingQty}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {n}
              </button>
            ))}
            <button
              className="btn btn-outline-secondary ms-auto flex-shrink-0"
              onClick={handleQuickSelect}
              disabled={loadingQty || spotsLeft < 1}
              style={{ minHeight: 44 }}
            >
              {loadingQty
                ? <span className="spinner-border spinner-border-sm" />
                : `Agregar ${Math.min(Number(qtyInput) || 1, spotsLeft)}`}
            </button>
          </div>
          {qtyError && (
            <div className="text-danger small mt-2">{qtyError}</div>
          )}
          <div className="text-muted small mt-2">
            Números al azar — los más bajos disponibles.
          </div>
        </div>
      </div>
    </div>
  )
}
