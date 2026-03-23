// src/components/vendedor/QuickSell.jsx
//
// THE critical component. A vendedor at an event, phone in hand,
// buyer standing in front of them. This screen must complete a sale
// in under 30 seconds.
//
// Design principles applied here:
// 1. One screen — boleto selection + buyer info together. No pagination.
// 2. Large touch targets — every interactive element ≥ 48px tall.
// 3. Numeric keyboard — inputMode="numeric" on number fields.
// 4. Auto-focus — cursor goes to the right field automatically.
// 5. Immediate feedback — availability shows while typing, not on submit.
// 6. Single confirm tap — no secondary confirm dialog. Speed wins.
//
// Props:
//   sorteo     — the sorteo being sold
//   vendedorId — current user's id
//   onSaleComplete(result) — called after successful claim
//   onBack     — back to sorteo list

import { useState, useEffect, useRef, useCallback } from 'react'
import { checkBoletoAvailability, fetchNextAvailable, claimBoleto } from '../../lib/vendedorApi'
import { formatMXN } from '../shared/UI'

// Debounce delay for availability check while typing (ms)
const AVAILABILITY_DEBOUNCE = 350

export function QuickSell({ sorteo, vendedorId, onSaleComplete, onBack }) {
  // ── Boleto selection ──
  const [mode, setMode]             = useState(null) // null | 'quick' | 'specific'
  const [numInput, setNumInput]     = useState('')
  const [availability, setAvail]    = useState(null) // null | 'available' | 'sold' | 'not_found' | 'checking'
  const [selectedNum, setSelectedNum] = useState(null) // confirmed numero ready to sell

  // ── Buyer info ──
  const [buyerName, setBuyerName]   = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const numInputRef  = useRef(null)
  const nameInputRef = useRef(null)
  const debounceRef  = useRef(null)

  // ── Quick-select: fetch next available ──
  async function handleQuickSelect() {
    setMode('quick')
    setAvail('checking')
    setSelectedNum(null)
    setNumInput('')

    const { numero, error } = await fetchNextAvailable(sorteo.id)
    if (error || numero == null) {
      setAvail('not_found')
      return
    }

    setSelectedNum(numero)
    setNumInput(String(numero))
    setAvail('available')
    // Jump straight to name field
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  // ── Specific number: check availability while typing ──
  function handleNumChange(val) {
    // Only digits
    const digits = val.replace(/\D/g, '')
    setNumInput(digits)
    setSelectedNum(null)
    setAvail(digits ? 'checking' : null)

    clearTimeout(debounceRef.current)
    if (!digits) return

    debounceRef.current = setTimeout(async () => {
      const n = Number(digits)
      if (n < 1 || n > sorteo.total_boletos) {
        setAvail('not_found')
        return
      }

      const { status } = await checkBoletoAvailability(sorteo.id, n)
      setAvail(status)
      if (status === 'available') {
        setSelectedNum(n)
        // Jump to name field automatically
        setTimeout(() => nameInputRef.current?.focus(), 50)
      }
    }, AVAILABILITY_DEBOUNCE)
  }

  // Switch to specific mode and focus the input
  function switchToSpecific() {
    setMode('specific')
    setNumInput('')
    setAvail(null)
    setSelectedNum(null)
    setTimeout(() => numInputRef.current?.focus(), 50)
  }

  // Reset everything for next sale (called after success from parent, or manual)
  function resetSell() {
    setMode(null)
    setNumInput('')
    setAvail(null)
    setSelectedNum(null)
    setBuyerName('')
    setBuyerPhone('')
    setBuyerEmail('')
    setSubmitError(null)
  }

  const isGiveaway = Number(sorteo.price_per_boleto) === 0

  // ── Submit the sale ──
  async function handleSubmit() {
    if (!selectedNum) return
    if (!buyerName.trim() || buyerName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setSubmitError('Nombre completo (nombre y apellido).')
      nameInputRef.current?.focus()
      return
    }
    if (!buyerPhone.trim() || buyerPhone.trim().replace(/\D/g, '').length < 10) {
      setSubmitError('El teléfono debe tener al menos 10 dígitos.')
      return
    }

    setSubmitError(null)
    setSubmitting(true)

    const { data, error } = await claimBoleto({
      sorteoId:   sorteo.id,
      numero:     selectedNum,
      vendedorId,
      buyerName:  buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      setSubmitError(error.message)
      // If boleto was taken in a race, reset number selection so vendedor picks again
      if (error.message.includes('ya fue vendido')) {
        setSelectedNum(null)
        setAvail('sold')
      }
      return
    }

    onSaleComplete({ ...data, buyerName: buyerName.trim(), sorteoTitle: sorteo.title })
    resetSell()
  }

  // ── Can submit? ──
  const canSubmit = selectedNum
    && buyerName.trim().split(/\s+/).filter(Boolean).length >= 2
    && buyerPhone.trim().replace(/\D/g, '').length >= 10
    && !submitting

  // ── Availability indicator ──
  const AvailBadge = useCallback(() => {
    if (!mode || !numInput) return null
    if (availability === 'checking') return (
      <span className="badge bg-secondary ms-2">
        <span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />
        Verificando...
      </span>
    )
    if (availability === 'available') return (
      <span className="badge bg-success ms-2">✓ Disponible</span>
    )
    if (availability === 'sold') return (
      <span className="badge bg-danger ms-2">✗ Vendido</span>
    )
    if (availability === 'not_found') return (
      <span className="badge bg-warning text-dark ms-2">Número inválido</span>
    )
    return null
  }, [mode, numInput, availability])

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* ── Sorteo header ── */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={onBack}
          disabled={submitting}
          style={{ minWidth: 36, minHeight: 36 }}
        >
          ←
        </button>
        <div className="min-w-0">
          <div className="fw-bold text-truncate">{sorteo.title}</div>
          <div className="text-muted small">
            {formatMXN(sorteo.price_per_boleto)} / boleto ·{' '}
            {Number(sorteo.boletos_available).toLocaleString('es-MX')} disponibles
          </div>
        </div>
      </div>

      {/* ── STEP 1: Boleto selection ── */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <label className="fw-bold mb-0">1. Boleto</label>
            <AvailBadge />
          </div>

          {/* Quick-select button — prominent, top position */}
          <button
            className={`btn w-100 mb-2 ${mode === 'quick' && selectedNum ? 'btn-success' : 'btn-primary'}`}
            onClick={handleQuickSelect}
            disabled={submitting}
            style={{ minHeight: 52, fontSize: '1rem' }}
          >
            {mode === 'quick' && availability === 'checking'
              ? <><span className="spinner-border spinner-border-sm me-2" />Buscando siguiente...</>
              : mode === 'quick' && selectedNum
              ? `⚡ Siguiente disponible: #${selectedNum}`
              : '⚡ Siguiente disponible'
            }
          </button>

          {/* Divider */}
          <div className="d-flex align-items-center gap-2 my-2">
            <hr className="flex-grow-1 my-0" />
            <span className="text-muted small">o</span>
            <hr className="flex-grow-1 my-0" />
          </div>

          {/* Specific number input */}
          <div>
            <div className="input-group">
              <span className="input-group-text">#</span>
              <input
                ref={numInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`form-control form-control-lg ${
                  availability === 'available' ? 'is-valid'
                  : availability === 'sold' || availability === 'not_found' ? 'is-invalid'
                  : ''
                }`}
                placeholder={`1 – ${Number(sorteo.total_boletos).toLocaleString('es-MX')}`}
                value={numInput}
                onChange={e => {
                  setMode('specific')
                  handleNumChange(e.target.value)
                }}
                onFocus={() => setMode('specific')}
                disabled={submitting}
                style={{ fontSize: '1.4rem', letterSpacing: 2 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 2: Buyer info — always visible, enabled when boleto selected ── */}
      <div className={`card mb-3 ${!selectedNum ? 'opacity-50' : ''}`}>
        <div className="card-body">
          <label className="fw-bold mb-3 d-block">2. Datos del comprador</label>

          {/* Name */}
          <div className="mb-3">
            <input
              ref={nameInputRef}
              type="text"
              className="form-control form-control-lg"
              placeholder="Nombre completo *"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              disabled={!selectedNum || submitting}
              autoComplete="off"
              autoCorrect="off"
              style={{ minHeight: 52 }}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('phone-input')?.focus()}
            />
          </div>

          {/* Phone */}
          <div className="mb-3">
            <input
              id="phone-input"
              type="tel"
              inputMode="tel"
              className="form-control form-control-lg"
              placeholder="Teléfono *"
              value={buyerPhone}
              onChange={e => setBuyerPhone(e.target.value)}
              disabled={!selectedNum || submitting}
              autoComplete="off"
              style={{ minHeight: 52 }}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('email-input')?.focus()}
            />
          </div>

          {/* Email — optional, de-emphasized */}
          <div>
            <input
              id="email-input"
              type="email"
              inputMode="email"
              className="form-control"
              placeholder="Correo electrónico (opcional)"
              value={buyerEmail}
              onChange={e => setBuyerEmail(e.target.value)}
              disabled={!selectedNum || submitting}
              autoComplete="off"
              style={{ minHeight: 44 }}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <div className="alert alert-danger py-2 mb-3">{submitError}</div>
      )}

      {/* ── STEP 3: Confirm — sticky bottom on mobile ── */}
      <div
        className="position-sticky"
        style={{ bottom: 16, zIndex: 10 }}
      >
        <button
          className="btn btn-success w-100 shadow"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            minHeight: 60,
            fontSize: '1.1rem',
            fontWeight: 700,
            borderRadius: 12,
          }}
        >
          {submitting
            ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
            : canSubmit
            ? isGiveaway
              ? `✓ Registrar — Boleto #${selectedNum}`
              : `✓ Confirmar venta — Boleto #${selectedNum} · ${formatMXN(sorteo.price_per_boleto)}`
            : isGiveaway ? 'Registrar' : 'Confirmar venta'
          }
        </button>
      </div>

    </div>
  )
}
