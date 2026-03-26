// src/components/vendedor/QuickSell.jsx

import { useState, useRef, useCallback } from 'react'
import { checkBoletoAvailability, fetchNextAvailable, claimBoleto } from '../../lib/vendedorApi'
import { formatMXN } from '../shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Zap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVAILABILITY_DEBOUNCE = 350

export function QuickSell({ sorteo, vendedorId, onSaleComplete, onBack }) {
  const [mode, setMode] = useState(null)
  const [numInput, setNumInput] = useState('')
  const [availability, setAvail] = useState(null)
  const [selectedNum, setSelectedNum] = useState(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const numInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const debounceRef = useRef(null)

  async function handleQuickSelect() {
    setMode('quick'); setAvail('checking'); setSelectedNum(null); setNumInput('')
    const { numero, error } = await fetchNextAvailable(sorteo.id)
    if (error || numero == null) { setAvail('not_found'); return }
    setSelectedNum(numero); setNumInput(String(numero)); setAvail('available')
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  function handleNumChange(val) {
    const digits = val.replace(/\D/g, '')
    setNumInput(digits); setSelectedNum(null); setAvail(digits ? 'checking' : null)
    clearTimeout(debounceRef.current)
    if (!digits) return
    debounceRef.current = setTimeout(async () => {
      const n = Number(digits)
      if (n < 1 || n > sorteo.total_boletos) { setAvail('not_found'); return }
      const { status } = await checkBoletoAvailability(sorteo.id, n)
      setAvail(status)
      if (status === 'available') { setSelectedNum(n); setTimeout(() => nameInputRef.current?.focus(), 50) }
    }, AVAILABILITY_DEBOUNCE)
  }

  function switchToSpecific() {
    setMode('specific'); setNumInput(''); setAvail(null); setSelectedNum(null)
    setTimeout(() => numInputRef.current?.focus(), 50)
  }

  function resetSell() {
    setMode(null); setNumInput(''); setAvail(null); setSelectedNum(null)
    setBuyerName(''); setBuyerPhone(''); setBuyerEmail(''); setSubmitError(null)
  }

  const isGiveaway = Number(sorteo.price_per_boleto) === 0

  async function handleSubmit() {
    if (!selectedNum) return
    if (!buyerName.trim() || buyerName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setSubmitError('Nombre completo (nombre y apellido).'); nameInputRef.current?.focus(); return
    }
    if (!buyerPhone.trim() || buyerPhone.trim().replace(/\D/g, '').length < 10) {
      setSubmitError('El teléfono debe tener al menos 10 dígitos.'); return
    }
    setSubmitError(null); setSubmitting(true)
    const { data, error } = await claimBoleto({
      sorteoId: sorteo.id, numero: selectedNum, vendedorId,
      buyerName: buyerName.trim(), buyerPhone: buyerPhone.trim(), buyerEmail: buyerEmail.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      if (error.message.includes('ya fue vendido')) { setSelectedNum(null); setAvail('sold') }
      return
    }
    onSaleComplete({ ...data, buyerName: buyerName.trim(), sorteoTitle: sorteo.title })
    resetSell()
  }

  const canSubmit = selectedNum
    && buyerName.trim().split(/\s+/).filter(Boolean).length >= 2
    && buyerPhone.trim().replace(/\D/g, '').length >= 10
    && !submitting

  const AvailBadge = useCallback(() => {
    if (!mode || !numInput) return null
    const map = {
      checking: ['bg-muted text-muted-foreground', 'Verificando...', true],
      available: ['bg-emerald-100 text-emerald-700', '✓ Disponible', false],
      sold: ['bg-red-100 text-red-700', '✗ Vendido', false],
      not_found: ['bg-amber-100 text-amber-700', 'Número inválido', false],
    }
    const cfg = map[availability]
    if (!cfg) return null
    return (
      <Badge variant="outline" className={`${cfg[0]} ml-2`}>
        {cfg[2] && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {cfg[1]}
      </Badge>
    )
  }, [mode, numInput, availability])

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Sorteo header */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="icon" onClick={onBack} disabled={submitting} className="shrink-0 h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="font-bold truncate">{sorteo.title}</div>
          <div className="text-muted-foreground text-sm">
            {formatMXN(sorteo.price_per_boleto)} / boleto · {Number(sorteo.boletos_available).toLocaleString('es-MX')} disponibles
          </div>
        </div>
      </div>

      {/* STEP 1: Boleto selection */}
      <Card className="mb-3">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold">1. Boleto</span>
            <AvailBadge />
          </div>
          <Button
            className={cn('w-full mb-2 h-[52px] text-base', mode === 'quick' && selectedNum && 'bg-emerald-600 hover:bg-emerald-700')}
            onClick={handleQuickSelect}
            disabled={submitting}
          >
            {mode === 'quick' && availability === 'checking'
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando siguiente...</>
              : mode === 'quick' && selectedNum
              ? <><Zap className="mr-2 h-4 w-4" /> Siguiente disponible: #{selectedNum}</>
              : <><Zap className="mr-2 h-4 w-4" /> Siguiente disponible</>}
          </Button>

          <div className="flex items-center gap-2 my-2">
            <hr className="flex-1" /><span className="text-muted-foreground text-sm">o</span><hr className="flex-1" />
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">#</span>
            <input
              ref={numInputRef}
              type="text" inputMode="numeric" pattern="[0-9]*"
              className={cn(
                'flex h-12 w-full rounded-md rounded-l-none border border-input bg-background px-3 py-2 text-2xl tracking-widest ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                availability === 'available' && 'border-emerald-500 ring-emerald-500',
                (availability === 'sold' || availability === 'not_found') && 'border-red-500 ring-red-500',
              )}
              placeholder={`1 – ${Number(sorteo.total_boletos).toLocaleString('es-MX')}`}
              value={numInput}
              onChange={e => { setMode('specific'); handleNumChange(e.target.value) }}
              onFocus={() => setMode('specific')}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: Buyer info */}
      <Card className={cn('mb-3', !selectedNum && 'opacity-50')}>
        <CardContent className="pt-4 space-y-3">
          <span className="font-bold block">2. Datos del comprador</span>
          <input
            ref={nameInputRef} type="text"
            className="flex h-[52px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            placeholder="Nombre completo *" value={buyerName} onChange={e => setBuyerName(e.target.value)}
            disabled={!selectedNum || submitting} autoComplete="off"
            onKeyDown={e => e.key === 'Enter' && document.getElementById('phone-input')?.focus()}
          />
          <input
            id="phone-input" type="tel" inputMode="tel"
            className="flex h-[52px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            placeholder="Teléfono *" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
            disabled={!selectedNum || submitting} autoComplete="off"
            onKeyDown={e => e.key === 'Enter' && document.getElementById('email-input')?.focus()}
          />
          <input
            id="email-input" type="email" inputMode="email"
            className="flex h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            placeholder="Correo electrónico (opcional)" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
            disabled={!selectedNum || submitting} autoComplete="off"
            onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
          />
        </CardContent>
      </Card>

      {submitError && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* STEP 3: Confirm */}
      <div className="sticky bottom-4 z-10">
        <Button
          className="w-full h-[60px] text-lg font-bold rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSubmit} disabled={!canSubmit}
        >
          {submitting
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Registrando...</>
            : canSubmit
            ? isGiveaway
              ? <><Check className="mr-2 h-5 w-5" /> Registrar — Boleto #{selectedNum}</>
              : <><Check className="mr-2 h-5 w-5" /> Confirmar venta — Boleto #{selectedNum} · {formatMXN(sorteo.price_per_boleto)}</>
            : isGiveaway ? 'Registrar' : 'Confirmar venta'}
        </Button>
      </div>
    </div>
  )
}
