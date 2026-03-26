// src/components/participante/BoletoCart.jsx

import { useState, useRef, useCallback } from 'react'
import { checkBoletoAvailability, fetchNextAvailableBoletos } from '../../lib/participanteApi'
import { formatMXN } from '../shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 350
const MAX_BOLETOS = 10

export function BoletoCart({ sorteo, cart, onCartChange }) {
  const [numInput, setNumInput] = useState('')
  const [availability, setAvail] = useState(null)
  const [qtyInput, setQtyInput] = useState('1')
  const [loadingQty, setLoadingQty] = useState(false)
  const [qtyError, setQtyError] = useState(null)
  const debounceRef = useRef(null)
  const numRef = useRef(null)

  const totalAmount = cart.length * Number(sorteo.price_per_boleto)
  const spotsLeft = MAX_BOLETOS - cart.length
  const isGiveaway = Number(sorteo.price_per_boleto) === 0

  function handleNumChange(val) {
    const digits = val.replace(/\D/g, '')
    setNumInput(digits); setAvail(digits ? 'checking' : null)
    clearTimeout(debounceRef.current)
    if (!digits) return
    debounceRef.current = setTimeout(async () => {
      const n = Number(digits)
      if (n < 1 || n > sorteo.total_boletos) { setAvail('not_found'); return }
      if (cart.includes(n)) { setAvail('in_cart'); return }
      const { status } = await checkBoletoAvailability(sorteo.id, n)
      setAvail(status)
    }, DEBOUNCE_MS)
  }

  function handleAddToCart() {
    const n = Number(numInput)
    if (!n || availability !== 'available' || cart.includes(n) || cart.length >= MAX_BOLETOS) return
    onCartChange([...cart, n]); setNumInput(''); setAvail(null); numRef.current?.focus()
  }

  async function handleQuickSelect() {
    const qty = Math.min(Number(qtyInput) || 1, spotsLeft, 20)
    if (qty < 1) return
    setLoadingQty(true); setQtyError(null)
    const { numeros, error } = await fetchNextAvailableBoletos(sorteo.id, qty)
    if (error || numeros.length === 0) { setQtyError('No hay suficientes boletos disponibles.'); setLoadingQty(false); return }
    const merged = [...new Set([...cart, ...numeros])].slice(0, MAX_BOLETOS)
    onCartChange(merged); setLoadingQty(false)
  }

  function handleRemove(n) { onCartChange(cart.filter(x => x !== n)) }

  const AvailBadge = useCallback(() => {
    const map = {
      checking: ['bg-muted text-muted-foreground', '...'],
      available: ['bg-emerald-100 text-emerald-700', '✓ Disponible'],
      sold: ['bg-red-100 text-red-700', '✗ Vendido'],
      not_found: ['bg-amber-100 text-amber-700', 'Número inválido'],
      in_cart: ['bg-blue-100 text-blue-700', 'Ya en tu selección'],
    }
    if (!availability || !map[availability]) return null
    const [cls, label] = map[availability]
    return <Badge variant="outline" className={`${cls} ml-2`}>{label}</Badge>
  }, [availability])

  return (
    <div className="space-y-4">
      {/* Cart display */}
      {cart.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">Tus boletos ({cart.length})</span>
            {!isGiveaway && <span className="text-emerald-600 font-bold">{formatMXN(totalAmount)}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...cart].sort((a, b) => a - b).map(n => (
              <Badge key={n} className="text-sm px-2.5 py-1 rounded-lg gap-1">
                #{n}
                <button type="button" onClick={() => handleRemove(n)} className="ml-1 hover:text-red-200">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {cart.length >= MAX_BOLETOS && (
            <p className="text-muted-foreground text-sm mt-1">Máximo {MAX_BOLETOS} boletos por compra.</p>
          )}
        </div>
      )}

      {/* Add specific number */}
      <Card>
        <CardContent className="pt-4">
          <label className="font-medium mb-2 flex items-center">
            Elige un número específico
            <AvailBadge />
          </label>
          <div className="flex gap-2 mt-2">
            <div className="flex flex-1">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">#</span>
              <input
                ref={numRef} type="text" inputMode="numeric" pattern="[0-9]*"
                className={cn(
                  'flex h-12 w-full rounded-md rounded-l-none border border-input bg-background px-3 py-2 text-xl ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  availability === 'available' && 'border-emerald-500',
                  (availability === 'sold' || availability === 'not_found') && 'border-red-500',
                )}
                placeholder={`1 – ${Number(sorteo.total_boletos).toLocaleString('es-MX')}`}
                value={numInput} onChange={e => handleNumChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddToCart()}
                disabled={cart.length >= MAX_BOLETOS}
              />
            </div>
            <Button onClick={handleAddToCart} className="shrink-0"
              disabled={availability !== 'available' || cart.includes(Number(numInput)) || cart.length >= MAX_BOLETOS}>
              + Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick-select N boletos */}
      <Card>
        <CardContent className="pt-4">
          <label className="font-medium mb-2 block">O selecciona cuántos quieres</label>
          <div className="flex gap-2 items-center mt-2">
            {[1, 2, 3, 5].map(n => (
              <Button key={n} type="button" size="icon"
                variant={Number(qtyInput) === n ? 'default' : 'outline'}
                onClick={() => setQtyInput(String(n))}
                disabled={n > spotsLeft || loadingQty}
                className="h-11 w-11"
              >{n}</Button>
            ))}
            <Button variant="outline" className="ml-auto shrink-0 h-11"
              onClick={handleQuickSelect} disabled={loadingQty || spotsLeft < 1}>
              {loadingQty ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Agregar {Math.min(Number(qtyInput) || 1, spotsLeft)}
            </Button>
          </div>
          {qtyError && <p className="text-red-500 text-sm mt-2">{qtyError}</p>}
          <p className="text-muted-foreground text-sm mt-2">Números al azar — los más bajos disponibles.</p>
        </CardContent>
      </Card>
    </div>
  )
}
