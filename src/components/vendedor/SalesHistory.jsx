// src/components/vendedor/SalesHistory.jsx

import { useState, useMemo } from 'react'
import { formatMXN } from '../shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export function SalesHistory({ sales, sorteo, onBack }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return sales
    const q = search.toLowerCase()
    return sales.filter(s =>
      s.buyer_name.toLowerCase().includes(q) || String(s.boleto_numero).includes(q) || s.buyer_phone.includes(q)
    )
  }, [sales, search])

  const byDay = useMemo(() => {
    const groups = {}
    for (const sale of filtered) {
      const day = new Date(sale.created_at).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      if (!groups[day]) groups[day] = []
      groups[day].push(sale)
    }
    return Object.entries(groups)
  }, [filtered])

  const totalAmount = sales.filter(s => s.payment_status !== 'refunded').reduce((sum, s) => sum + Number(s.amount_mxn), 0)

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="font-bold">Mis ventas</div>
          <div className="text-muted-foreground text-sm">{sorteo.title}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-primary text-white rounded-xl p-3 text-center">
          <div className="text-3xl font-bold">{sales.length}</div>
          <div className="text-sm opacity-85">boletos vendidos</div>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{formatMXN(totalAmount)}</div>
          <div className="text-sm opacity-85">total recaudado</div>
        </div>
      </div>

      {sales.length > 0 && (
        <div className="mb-3">
          <Input
            type="search" placeholder="Buscar por nombre, boleto o teléfono..."
            value={search} onChange={e => setSearch(e.target.value)} className="h-11"
          />
        </div>
      )}

      {sales.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl">📋</div>
          <p className="text-muted-foreground mt-2">Aún no tienes ventas registradas.</p>
        </div>
      )}

      {sales.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Sin resultados para "{search}".</p>
        </div>
      )}

      {byDay.map(([day, daySales]) => (
        <div key={day} className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h6 className="text-muted-foreground capitalize text-xs">{day}</h6>
            <span className="text-muted-foreground text-sm">
              {daySales.length} venta{daySales.length !== 1 ? 's' : ''} · {formatMXN(daySales.reduce((s, v) => s + Number(v.amount_mxn), 0))}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {daySales.map(sale => (
              <Card key={sale.id} className="border-0 shadow-sm">
                <CardContent className="py-2 px-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{sale.buyer_name}</div>
                      <div className="text-muted-foreground text-sm">{sale.buyer_phone}</div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <div className="font-bold text-primary">#{sale.boleto_numero}</div>
                      <div className="text-emerald-600 text-sm font-medium">{formatMXN(sale.amount_mxn)}</div>
                    </div>
                  </div>
                  {sale.payment_status === 'refunded' && <Badge variant="destructive" className="mt-1">Reembolsado</Badge>}
                  {sale.payment_status === 'confirmed' && <Badge className="bg-emerald-600 hover:bg-emerald-600 mt-1">Confirmado</Badge>}
                  <div className="text-muted-foreground mt-1 text-[0.7rem]">
                    {new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
