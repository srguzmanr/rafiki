// src/components/participante/PurchaseFlow.jsx
//
// Multi-step purchase flow for participantes.
// Step 1: Boleto selection (BoletoCart)
// Step 2: Buyer info (name, phone, email)
// Step 3: Purchase confirmation — shows total, payment note (Stripe coming Phase 6)
// Step 4: Success with boleto summary
//
// Props:
//   sorteo        — public sorteo detail object
//   participanteId — auth.uid() if logged in, null if guest
//   onComplete()  — called after successful purchase (to refresh parent)
//   onBack()      — back to sorteo detail

import { useState } from 'react'
import { BoletoCart }       from './BoletoCart'
import { claimBoletosOnline } from '../../lib/participanteApi'
import { formatMXN }        from '../shared/UI'

const STEPS = { CART: 'cart', INFO: 'info', CONFIRM: 'confirm', SUCCESS: 'success' }

export function PurchaseFlow({ sorteo, participanteId, onComplete, onBack }) {
  const [step, setStep]       = useState(STEPS.CART)
  const [cart, setCart]       = useState([])
  const [buyer, setBuyer]     = useState({ name: '', phone: '', email: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [purchaseResult, setPurchaseResult] = useState(null)

  // ── Step 1 → 2 ──
  function handleCartNext() {
    if (cart.length === 0) return
    setStep(STEPS.INFO)
    setSubmitError(null)
  }

  // ── Validate buyer info ──
  function validateBuyer() {
    const errs = {}
    if (!buyer.name.trim())  errs.name  = 'El nombre es requerido.'
    if (!buyer.phone.trim()) errs.phone = 'El teléfono es requerido.'
    if (!buyer.email.trim()) errs.email = 'El correo es requerido para recibir tu boleto.'
    return errs
  }

  // ── Step 2 → 3 ──
  function handleInfoNext() {
    const errs = validateBuyer()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setStep(STEPS.CONFIRM)
  }

  // ── Step 3: Submit purchase ──
  async function handlePurchase() {
    setSubmitting(true)
    setSubmitError(null)

    const { data, error, unavailable } = await claimBoletosOnline({
      sorteoId:       sorteo.id,
      numeros:        cart,
      buyerName:      buyer.name.trim(),
      buyerPhone:     buyer.phone.trim(),
      buyerEmail:     buyer.email.trim(),
      participanteId,
    })

    setSubmitting(false)

    if (error) {
      // If some boletos got taken since we loaded, go back to cart
      if (unavailable.length > 0) {
        setCart(prev => prev.filter(n => !unavailable.includes(n)))
        setStep(STEPS.CART)
      }
      setSubmitError(error.message)
      return
    }

    setPurchaseResult(data)
    setStep(STEPS.SUCCESS)
    onComplete?.()
  }

  const totalAmount = cart.length * Number(sorteo.price_per_boleto)

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: CART
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.CART) return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>← Regresar</button>
        <h5 className="mb-0">Selecciona tus boletos</h5>
      </div>

      <BoletoCart sorteo={sorteo} cart={cart} onCartChange={setCart} />

      {submitError && (
        <div className="alert alert-warning mt-3">{submitError}</div>
      )}

      <button
        className="btn btn-primary w-100 mt-4"
        onClick={handleCartNext}
        disabled={cart.length === 0}
        style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
      >
        Continuar con {cart.length} boleto{cart.length !== 1 ? 's' : ''}
        {cart.length > 0 && ` · ${formatMXN(totalAmount)}`}
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: BUYER INFO
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.INFO) return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(STEPS.CART)}>← Cambiar boletos</button>
        <h5 className="mb-0">Tus datos</h5>
      </div>

      {/* Cart summary chip */}
      <div className="bg-primary text-white rounded-3 p-3 mb-4 d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-bold">{cart.length} boleto{cart.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
            #{[...cart].sort((a,b) => a-b).join(', #')}
          </div>
        </div>
        <div className="fs-5 fw-bold">{formatMXN(totalAmount)}</div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-medium">Nombre completo <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control form-control-lg ${fieldErrors.name ? 'is-invalid' : ''}`}
          value={buyer.name}
          onChange={e => { setBuyer(b => ({...b, name: e.target.value})); setFieldErrors(f => ({...f, name: null})) }}
          placeholder="Tu nombre completo"
          autoComplete="name"
          style={{ minHeight: 52 }}
        />
        {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label fw-medium">Teléfono <span className="text-danger">*</span></label>
        <input
          type="tel"
          inputMode="tel"
          className={`form-control form-control-lg ${fieldErrors.phone ? 'is-invalid' : ''}`}
          value={buyer.phone}
          onChange={e => { setBuyer(b => ({...b, phone: e.target.value})); setFieldErrors(f => ({...f, phone: null})) }}
          placeholder="+52 644 000 0000"
          autoComplete="tel"
          style={{ minHeight: 52 }}
        />
        {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
      </div>

      <div className="mb-4">
        <label className="form-label fw-medium">Correo electrónico <span className="text-danger">*</span></label>
        <input
          type="email"
          inputMode="email"
          className={`form-control form-control-lg ${fieldErrors.email ? 'is-invalid' : ''}`}
          value={buyer.email}
          onChange={e => { setBuyer(b => ({...b, email: e.target.value})); setFieldErrors(f => ({...f, email: null})) }}
          placeholder="tu@correo.com"
          autoComplete="email"
          style={{ minHeight: 52 }}
        />
        {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
        <div className="form-text">Te enviaremos la confirmación de tu compra.</div>
      </div>

      <button
        className="btn btn-primary w-100"
        onClick={handleInfoNext}
        style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
      >
        Revisar mi compra
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: CONFIRM
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.CONFIRM) return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(STEPS.INFO)}>← Editar datos</button>
        <h5 className="mb-0">Confirmar compra</h5>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="text-muted mb-3">Resumen</h6>

          <table className="table table-sm table-borderless mb-0">
            <tbody>
              <tr>
                <td className="text-muted">Sorteo</td>
                <td className="fw-medium">{sorteo.title}</td>
              </tr>
              <tr>
                <td className="text-muted">Boletos</td>
                <td className="fw-medium">
                  {cart.length} × #{[...cart].sort((a,b) => a-b).join(', #')}
                </td>
              </tr>
              <tr>
                <td className="text-muted">Precio unitario</td>
                <td>{formatMXN(sorteo.price_per_boleto)}</td>
              </tr>
              <tr className="fw-bold">
                <td>Total</td>
                <td className="text-success">{formatMXN(totalAmount)}</td>
              </tr>
              <tr>
                <td className="text-muted">Nombre</td>
                <td>{buyer.name}</td>
              </tr>
              <tr>
                <td className="text-muted">Teléfono</td>
                <td>{buyer.phone}</td>
              </tr>
              <tr>
                <td className="text-muted">Correo</td>
                <td>{buyer.email}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment placeholder — Stripe Phase 6 */}
      <div className="alert alert-info d-flex gap-3 mb-4">
        <span style={{ fontSize: '1.5rem' }}>💳</span>
        <div>
          <strong>Pago en proceso de integración</strong>
          <div className="small mt-1">
            Tu reserva quedará registrada como pendiente.
            El coordinador del sorteo te contactará para confirmar el pago.
          </div>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-danger mb-3">{submitError}</div>
      )}

      <button
        className="btn btn-success w-100"
        onClick={handlePurchase}
        disabled={submitting}
        style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 700 }}
      >
        {submitting
          ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
          : `Confirmar — ${formatMXN(totalAmount)}`
        }
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: SUCCESS
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.SUCCESS && purchaseResult) return (
    <div className="text-center py-4">
      <div
        className="rounded-circle bg-success d-flex align-items-center justify-content-center mx-auto mb-4"
        style={{ width: 80, height: 80 }}
      >
        <span style={{ fontSize: '2.5rem' }}>✓</span>
      </div>

      <h3 className="fw-bold text-success mb-1">¡Boletos registrados!</h3>
      <p className="text-muted mb-4">{sorteo.title}</p>

      <div className="card mb-4 text-start">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12">
              <div className="text-muted small">Boletos</div>
              <div className="d-flex flex-wrap gap-2 mt-1">
                {purchaseResult.claimed.map(c => (
                  <span key={c.sale_id} className="badge bg-primary fs-6">
                    #{c.boleto_numero}
                  </span>
                ))}
              </div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Total</div>
              <div className="fw-bold text-success">{formatMXN(purchaseResult.total_amount_mxn)}</div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Estado</div>
              <span className="badge bg-warning text-dark">Pendiente de pago</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted small mb-4">
        Guarda tus números. Te enviaremos información a <strong>{buyer.email}</strong>.
      </p>

      <button className="btn btn-outline-primary w-100" onClick={onBack}>
        Volver al sorteo
      </button>
    </div>
  )

  return null
}
