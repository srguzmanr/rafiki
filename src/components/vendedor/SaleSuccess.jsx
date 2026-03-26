// src/components/vendedor/SaleSuccess.jsx

import { useEffect, useState } from 'react'
import { formatMXN } from '../shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'

const AUTO_RETURN_MS = 3000

export function SaleSuccess({ result, onNewSale, onDone }) {
  const [countdown, setCountdown] = useState(Math.ceil(AUTO_RETURN_MS / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); onNewSale(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onNewSale])

  return (
    <div className="max-w-[480px] mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center px-3">
      <div className="rounded-full bg-emerald-600 flex items-center justify-center mb-4 w-20 h-20">
        <span className="text-white text-4xl">✓</span>
      </div>

      <h3 className="text-2xl font-bold text-emerald-600 mb-1">¡Venta registrada!</h3>
      <p className="text-muted-foreground mb-4">{result.sorteoTitle}</p>

      <Card className="w-full mb-4">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-muted-foreground text-sm">Boleto</div>
              <div className="text-2xl font-bold text-primary">#{result.boleto_numero}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-sm">Monto</div>
              <div className="text-2xl font-bold text-emerald-600">{formatMXN(result.amount_mxn)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground text-sm">Comprador</div>
              <div className="font-medium">{result.buyerName}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full mb-2 h-14 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700"
        onClick={onNewSale}
      >
        <Zap className="mr-2 h-5 w-5" /> Nueva venta
        <Badge variant="outline" className="ml-2 bg-white text-emerald-600 border-0 text-xs">
          Auto en {countdown}s
        </Badge>
      </Button>

      <Button variant="outline" className="w-full h-11" onClick={onDone}>
        Ver mis ventas
      </Button>
    </div>
  )
}
