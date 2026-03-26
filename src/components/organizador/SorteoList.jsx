// src/components/organizador/SorteoList.jsx

import { StatusBadge, SalesProgressBar, formatMXN, ConfirmModal } from '../shared/UI'
import { transitionSorteoStatus } from '../../lib/sorteosApi'
import { useState } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// ─── SORTEO CARD ──────────────────────────────────────────────────────────

export function SorteoCard({ sorteo, onEdit, onViewDetail, onStatusChanged }) {
  const [confirm, setConfirm]   = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError]       = useState(null)

  async function handleTransition(newStatus, config) {
    setConfirm({
      ...config,
      onConfirm: async () => {
        setTransitioning(true)
        setError(null)
        try {
          const { error } = await transitionSorteoStatus(sorteo.id, newStatus)
          if (error) throw error
          onStatusChanged?.(sorteo.id, newStatus)
        } catch (err) {
          setError(err.message)
        } finally {
          setTransitioning(false)
        }
      },
    })
  }

  const canActivate = sorteo.status === 'draft'
  const canClose    = sorteo.status === 'active'
  const canDraw     = sorteo.status === 'closed'

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardContent className="pt-4 flex-1">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <h6 className="font-bold text-sm">{sorteo.title}</h6>
            <StatusBadge status={sorteo.status} />
          </div>

          {sorteo.cause && (
            <p className="text-muted-foreground text-sm mb-2"><em>{sorteo.cause}</em></p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-muted rounded-md p-2 text-center">
              <div className="font-bold">{Number(sorteo.boletos_sold || 0).toLocaleString('es-MX')}</div>
              <div className="text-muted-foreground text-[0.7rem]">boletos vendidos</div>
            </div>
            <div className="bg-muted rounded-md p-2 text-center">
              <div className="font-bold text-emerald-600">{formatMXN(sorteo.revenue_mxn || 0)}</div>
              <div className="text-muted-foreground text-[0.7rem]">recaudado</div>
            </div>
          </div>

          <SalesProgressBar
            pctSold={sorteo.pct_sold}
            boletosSold={sorteo.boletos_sold || 0}
            totalBoletos={sorteo.total_boletos}
          />

          <div className="mt-2 text-sm text-muted-foreground">
            {sorteo.drawing_date && (
              <div>Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}</div>
            )}
            {sorteo.permit_number && <div>Permiso: {sorteo.permit_number}</div>}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-2 py-1">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 flex-wrap pt-0">
          <Button variant="outline" size="sm" onClick={() => onViewDetail(sorteo.id)}>
            Ver detalle
          </Button>
          {sorteo.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => onEdit(sorteo.id)}>
              Editar
            </Button>
          )}
          {canActivate && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={transitioning}
              onClick={() => handleTransition('active', {
                title: 'Activar sorteo',
                message: `¿Activar "${sorteo.title}"? Las ventas quedarán abiertas.`,
                confirmLabel: 'Activar',
              })}>
              Activar
            </Button>
          )}
          {canClose && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={transitioning}
              onClick={() => handleTransition('closed', {
                title: 'Cerrar ventas',
                message: `¿Cerrar ventas de "${sorteo.title}"? No se podrán registrar más boletos.`,
                confirmLabel: 'Cerrar ventas',
                warning: 'Esta acción no se puede deshacer si ya hay ventas registradas.',
                danger: true,
              })}>
              Cerrar ventas
            </Button>
          )}
          {canDraw && (
            <Button size="sm" disabled={transitioning}
              onClick={() => handleTransition('drawn', {
                title: 'Marcar como sorteado',
                message: `¿Marcar "${sorteo.title}" como sorteado?`,
                confirmLabel: 'Confirmar sorteo',
                warning: 'El motor de aleatoriedad auditable (Phase 6) ejecutará el sorteo.',
              })}>
              Ejecutar sorteo
            </Button>
          )}
        </CardFooter>
      </Card>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}


// ─── SORTEO LIST ──────────────────────────────────────────────────────────

export function SorteoList({ sorteos, onEdit, onViewDetail, onStatusChanged }) {
  if (sorteos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🎟️</div>
        <p className="text-muted-foreground mt-2">
          Aún no hay sorteos. ¡Crea el primero!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorteos.map(sorteo => (
        <SorteoCard
          key={sorteo.id}
          sorteo={sorteo}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
          onStatusChanged={onStatusChanged}
        />
      ))}
    </div>
  )
}
