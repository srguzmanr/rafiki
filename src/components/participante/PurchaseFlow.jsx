// src/components/participante/PurchaseFlow.jsx

import { useState } from 'react'
import { BoletoCart } from './BoletoCart'
import { claimBoletosOnline } from '../../lib/participanteApi'
import { formatMXN } from '../shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, CreditCard } from 'lucide-react'

const STEPS = { CART: 'cart', INFO: 'info', CONFIRM: 'confirm', SUCCESS: 'success' }

function hasMinTwoWords(str) { return str.trim().split(/\s+/).filter(Boolean).length >= 2 }
function hasMinDigits(str, min) { return (str.replace(/\D/g, '').length) >= min }
function isValidEmail(str) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim()) }

export function PurchaseFlow({ sorteo, participanteId, onComplete, onBack }) {
  const isGiveaway = Number(sorteo.price_per_boleto) === 0
  const [step, setStep] = useState(STEPS.CART)
  const [cart, setCart] = useState([])
  const [buyer, setBuyer] = useState({ name: '', phone: '', email: '' })
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [purchaseResult, setPurchaseResult] = useState(null)

  function handleCartNext() { if (cart.length === 0) return; setStep(STEPS.INFO); setSubmitError(null) }

  function validateBuyer() {
    const errs = {}
    if (!buyer.name.trim()) errs.name = 'El nombre es requerido.'
    else if (!hasMinTwoWords(buyer.name)) errs.name = 'Ingresa tu nombre completo (nombre y apellido).'
    if (!buyer.phone.trim()) errs.phone = 'El teléfono es requerido.'
    else if (!hasMinDigits(buyer.phone, 10)) errs.phone = 'El teléfono debe tener al menos 10 dígitos.'
    if (!buyer.email.trim()) errs.email = 'El correo es requerido para recibir tu confirmación.'
    else if (!isValidEmail(buyer.email)) errs.email = 'Ingresa un correo válido.'
    return errs
  }

  function handleInfoNext() {
    const errs = validateBuyer()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({}); setStep(STEPS.CONFIRM)
  }

  async function handlePurchase() {
    setSubmitting(true); setSubmitError(null)
    const { data, error, unavailable } = await claimBoletosOnline({
      sorteoId: sorteo.id, numeros: cart, buyerName: buyer.name.trim(),
      buyerPhone: buyer.phone.trim(), buyerEmail: buyer.email.trim(), participanteId, marketingConsent,
    })
    setSubmitting(false)
    if (error) {
      if (unavailable.length > 0) { setCart(prev => prev.filter(n => !unavailable.includes(n))); setStep(STEPS.CART) }
      setSubmitError(error.message); return
    }
    setPurchaseResult(data); setStep(STEPS.SUCCESS); onComplete?.()
  }

  const totalAmount = cart.length * Number(sorteo.price_per_boleto)

  // STEP 1: CART
  if (step === STEPS.CART) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Regresar</Button>
        <h5 className="font-bold">{isGiveaway ? 'Elige tus números' : 'Selecciona tus boletos'}</h5>
      </div>
      <BoletoCart sorteo={sorteo} cart={cart} onCartChange={setCart} />
      {submitError && <Alert className="bg-amber-50 border-amber-200"><AlertDescription className="text-amber-800">{submitError}</AlertDescription></Alert>}
      <Button
        className={`w-full h-[52px] text-base font-semibold ${isGiveaway ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        onClick={handleCartNext} disabled={cart.length === 0}
      >
        Continuar con {cart.length} boleto{cart.length !== 1 ? 's' : ''}
        {!isGiveaway && cart.length > 0 && ` · ${formatMXN(totalAmount)}`}
      </Button>
    </div>
  )

  // STEP 2: BUYER INFO
  if (step === STEPS.INFO) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep(STEPS.CART)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Cambiar {isGiveaway ? 'números' : 'boletos'}
        </Button>
        <h5 className="font-bold">Tus datos</h5>
      </div>

      {/* Cart summary chip */}
      <div className={`rounded-xl p-3 flex justify-between items-center ${isGiveaway ? 'bg-emerald-600' : 'bg-primary'} text-white`}>
        <div>
          <div className="font-bold">{cart.length} boleto{cart.length !== 1 ? 's' : ''} seleccionado{cart.length !== 1 ? 's' : ''}</div>
          <div className="text-sm opacity-85">#{[...cart].sort((a, b) => a - b).join(', #')}</div>
        </div>
        {isGiveaway
          ? <Badge variant="outline" className="bg-white text-emerald-600 border-0 font-bold">GRATIS</Badge>
          : <div className="text-xl font-bold">{formatMXN(totalAmount)}</div>}
      </div>

      <div className="space-y-2">
        <Label className="font-medium">Nombre completo <span className="text-red-500">*</span></Label>
        <Input className={`h-[52px] text-base ${fieldErrors.name ? 'border-red-500' : ''}`}
          value={buyer.name} onChange={e => { setBuyer(b => ({ ...b, name: e.target.value })); setFieldErrors(f => ({ ...f, name: null })) }}
          placeholder="Juan García López" autoComplete="name" />
        {fieldErrors.name && <p className="text-red-500 text-sm">{fieldErrors.name}</p>}
        <p className="text-xs text-muted-foreground">Nombre y apellido — requeridos para contactar al ganador.</p>
      </div>

      <div className="space-y-2">
        <Label className="font-medium">Teléfono <span className="text-red-500">*</span></Label>
        <Input type="tel" inputMode="tel" className={`h-[52px] text-base ${fieldErrors.phone ? 'border-red-500' : ''}`}
          value={buyer.phone} onChange={e => { setBuyer(b => ({ ...b, phone: e.target.value })); setFieldErrors(f => ({ ...f, phone: null })) }}
          placeholder="644 000 0000" autoComplete="tel" />
        {fieldErrors.phone && <p className="text-red-500 text-sm">{fieldErrors.phone}</p>}
      </div>

      <div className="space-y-2">
        <Label className="font-medium">Correo electrónico <span className="text-red-500">*</span></Label>
        <Input type="email" inputMode="email" className={`h-[52px] text-base ${fieldErrors.email ? 'border-red-500' : ''}`}
          value={buyer.email} onChange={e => { setBuyer(b => ({ ...b, email: e.target.value })); setFieldErrors(f => ({ ...f, email: null })) }}
          placeholder="tu@correo.com" autoComplete="email" />
        {fieldErrors.email && <p className="text-red-500 text-sm">{fieldErrors.email}</p>}
        <p className="text-xs text-muted-foreground">Te enviaremos la confirmación de tu participación.</p>
      </div>

      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
        <input type="checkbox" id="marketingConsent" checked={marketingConsent}
          onChange={e => setMarketingConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded accent-primary" />
        <label htmlFor="marketingConsent" className="text-sm">
          Acepto recibir información sobre futuros sorteos y promociones.
        </label>
      </div>

      <Button className={`w-full h-[52px] text-base font-semibold ${isGiveaway ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        onClick={handleInfoNext}>
        {isGiveaway ? 'Revisar mi participación' : 'Revisar mi compra'}
      </Button>
    </div>
  )

  // STEP 3: CONFIRM
  if (step === STEPS.CONFIRM) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep(STEPS.INFO)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Editar datos
        </Button>
        <h5 className="font-bold">{isGiveaway ? 'Confirma tu participación' : 'Confirmar compra'}</h5>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <h6 className="text-muted-foreground mb-2">Resumen</h6>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Sorteo</span><span className="font-medium">{sorteo.title}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{isGiveaway ? 'Números' : 'Boletos'}</span><span className="font-medium">{cart.length} × #{[...cart].sort((a, b) => a - b).join(', #')}</span></div>
            {!isGiveaway && <>
              <div className="flex justify-between"><span className="text-muted-foreground">Precio unitario</span><span>{formatMXN(sorteo.price_per_boleto)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-emerald-600">{formatMXN(totalAmount)}</span></div>
            </>}
            <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span>{buyer.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span>{buyer.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Correo</span><span>{buyer.email}</span></div>
          </div>
        </CardContent>
      </Card>

      {!isGiveaway && (
        <Alert className="bg-blue-50 border-blue-200">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Pago en proceso de integración</strong>
            <p className="text-sm mt-1">Tu reserva quedará registrada como pendiente. El coordinador del sorteo te contactará para confirmar el pago.</p>
          </AlertDescription>
        </Alert>
      )}

      {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

      <Button className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700"
        onClick={handlePurchase} disabled={submitting}>
        {submitting
          ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Registrando...</>
          : isGiveaway ? 'Confirmar participación' : `Confirmar — ${formatMXN(totalAmount)}`}
      </Button>
    </div>
  )

  // STEP 4: SUCCESS
  if (step === STEPS.SUCCESS && purchaseResult) return (
    <div className="text-center py-8">
      <div className="rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4 w-20 h-20">
        <span className="text-white text-4xl">✓</span>
      </div>
      <h3 className="text-2xl font-bold text-emerald-600 mb-1">{isGiveaway ? '¡Estás participando!' : '¡Boletos registrados!'}</h3>
      <p className="text-muted-foreground mb-4">{sorteo.title}</p>

      <Card className="mb-4 text-left">
        <CardContent className="pt-4 space-y-2">
          <div>
            <div className="text-muted-foreground text-sm">{isGiveaway ? 'Tus números' : 'Boletos'}</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {purchaseResult.claimed.map(c => (
                <Badge key={c.sale_id} className="text-base">{`#${c.boleto_numero}`}</Badge>
              ))}
            </div>
          </div>
          {!isGiveaway && (
            <div><div className="text-muted-foreground text-sm">Total</div><div className="font-bold text-emerald-600">{formatMXN(purchaseResult.total_amount_mxn)}</div></div>
          )}
          <div>
            <div className="text-muted-foreground text-sm">Estado</div>
            {isGiveaway
              ? <Badge className="bg-emerald-600 hover:bg-emerald-600">✓ Confirmado</Badge>
              : <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400">Pendiente de pago</Badge>}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm mb-4">
        Guarda tus números.
        {buyer.email && <> Te enviaremos información a <strong>{buyer.email}</strong>.</>}
      </p>
      <Button variant="outline" className="w-full" onClick={onBack}>Volver al sorteo</Button>
    </div>
  )

  return null
}
