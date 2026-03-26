// src/components/shared/UI.jsx
// Reusable UI primitives using shadcn + Tailwind.

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle } from 'lucide-react'

// ─── STATUS BADGE ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:  { label: 'Borrador',   variant: 'secondary' },
  active: { label: 'Activo',     className: 'bg-emerald-600 text-white hover:bg-emerald-600' },
  closed: { label: 'Cerrado',    className: 'bg-amber-400 text-amber-900 hover:bg-amber-400' },
  drawn:  { label: 'Sorteado',   variant: 'default' },
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: 'secondary' }
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ─── LOADING SPINNER ───────────────────────────────────────────────────────

export function LoadingSpinner({ message = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ─── ERROR MESSAGE ─────────────────────────────────────────────────────────

export function ErrorMessage({ message, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span>{message || 'Ocurrió un error. Intenta de nuevo.'}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-3 shrink-0">
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ─── CONFIRM MODAL ─────────────────────────────────────────────────────────

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
    <Dialog open={!!config} onOpenChange={() => !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title || 'Confirmar acción'}</DialogTitle>
          <DialogDescription>{config.message}</DialogDescription>
        </DialogHeader>
        {config.warning && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800 text-sm">
              {config.warning}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={config.danger ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.confirmLabel || 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div>
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>{Number(boletosSold).toLocaleString('es-MX')} vendidos</span>
        <span>{Number(totalBoletos - boletosSold).toLocaleString('es-MX')} disponibles</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-sm text-muted-foreground mt-1">{pct}%</div>
    </div>
  )
}
