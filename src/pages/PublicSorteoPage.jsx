// src/pages/PublicSorteoPage.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPublicSorteo } from '../lib/participanteApi'
import { PurchaseFlow } from '../components/participante/PurchaseFlow'
import { LoadingSpinner, ErrorMessage, StatusBadge, SalesProgressBar, formatMXN } from '../components/shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function PublicSorteoPage() {
  const { orgSlug, sorteoId } = useParams()
  const { user, session } = useAuth()
  const [sorteo, setSorteo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(false)

  async function loadSorteo() {
    setLoading(true); setError(null)
    const { data, error } = await fetchPublicSorteo(sorteoId)
    if (error) setError('Sorteo no encontrado o no disponible.')
    else setSorteo(data)
    setLoading(false)
  }

  useEffect(() => { loadSorteo() }, [sorteoId])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner message="Cargando sorteo..." />
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3">
      <ErrorMessage message={error} onRetry={loadSorteo} />
    </div>
  )
  if (!sorteo) return null

  const prizes = Array.isArray(sorteo.prizes) ? sorteo.prizes : []
  const canBuy = sorteo.status === 'active'
  const isGiveaway = Number(sorteo.price_per_boleto) === 0

  if (buying) return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[540px] mx-auto px-4 py-4">
        <PurchaseFlow
          sorteo={sorteo}
          participanteId={session ? user?.id : null}
          onComplete={() => {}}
          onBack={() => { setBuying(false); loadSorteo() }}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white border-b px-3 py-2 flex items-center">
        <Link to={`/org/${orgSlug}`} className="text-primary text-sm no-underline hover:underline">
          ← {sorteo.org_name}
        </Link>
        <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7 mx-auto" />
        <div className="w-20" />
      </nav>

      <div className="max-w-[640px] mx-auto px-4 py-4">
        {/* Title + status */}
        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{sorteo.title}</h2>
            {isGiveaway && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-base">Gratis</Badge>}
          </div>
          <StatusBadge status={sorteo.status} />
        </div>

        <p className="text-muted-foreground text-sm mb-1">{sorteo.org_name}</p>
        {sorteo.permit_number && (
          <p className="text-muted-foreground text-sm mb-3">Permiso: <strong>{sorteo.permit_number}</strong></p>
        )}

        {sorteo.cause && (
          <Alert className="bg-emerald-50 border-emerald-200 mb-4">
            <AlertDescription className="text-emerald-700 flex items-center gap-2">
              <span>🎯</span><span>{sorteo.cause}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 text-center gap-0 mb-3">
              <div className="border-r">
                <div className="text-xl font-bold">{Number(sorteo.boletos_sold || 0).toLocaleString('es-MX')}</div>
                <div className="text-muted-foreground text-xs">{isGiveaway ? 'participantes' : 'vendidos'}</div>
              </div>
              <div className="border-r">
                <div className="text-xl font-bold">{Number(sorteo.boletos_available || 0).toLocaleString('es-MX')}</div>
                <div className="text-muted-foreground text-xs">disponibles</div>
              </div>
              <div>
                {isGiveaway ? (
                  <><div className="text-xl font-bold text-emerald-600">GRATIS</div><div className="text-muted-foreground text-xs">entrada</div></>
                ) : (
                  <><div className="text-xl font-bold text-primary">{formatMXN(sorteo.price_per_boleto)}</div><div className="text-muted-foreground text-xs">por boleto</div></>
                )}
              </div>
            </div>
            <SalesProgressBar pctSold={sorteo.pct_sold} boletosSold={sorteo.boletos_sold || 0} totalBoletos={sorteo.total_boletos} />
          </CardContent>
        </Card>

        {/* Key dates */}
        {(sorteo.drawing_date || sorteo.end_date) && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                {sorteo.end_date && (
                  <div>
                    <div className="text-muted-foreground text-sm">{isGiveaway ? 'Cierre de participaciones' : 'Cierre de ventas'}</div>
                    <div className="font-medium">{new Date(sorteo.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                )}
                {sorteo.drawing_date && (
                  <div>
                    <div className="text-muted-foreground text-sm">Fecha del sorteo</div>
                    <div className="font-medium">{new Date(sorteo.drawing_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prizes */}
        {prizes.length > 0 && (
          <div className="mb-4">
            <h5 className="font-bold mb-3">Premios</h5>
            <div className="flex flex-col gap-3">
              {prizes.map((prize, i) => (
                <Card key={prize.id || i} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex gap-3 items-start">
                    <div className="rounded-full bg-primary text-white flex items-center justify-center shrink-0 font-bold w-10 h-10 text-lg">
                      {prize.position}°
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{prize.title}</div>
                      {prize.description && <div className="text-muted-foreground text-sm">{prize.description}</div>}
                      {prize.value_mxn && <div className="text-emerald-600 text-sm font-medium mt-1">{formatMXN(prize.value_mxn)}</div>}
                    </div>
                    {prize.image_url && (
                      <img src={prize.image_url} alt={prize.title} className="rounded-md w-16 h-16 object-cover shrink-0" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {sorteo.description && (
          <div className="mb-4">
            <h5 className="font-bold mb-2">Acerca de este sorteo</h5>
            <p className="text-muted-foreground">{sorteo.description}</p>
          </div>
        )}

        {/* Winners */}
        {sorteo.status === 'drawn' && sorteo.drawing_result && (
          <div className="mb-4">
            <h5 className="font-bold mb-3">🎉 Ganadores</h5>
            <div className="flex flex-col gap-3">
              {(sorteo.drawing_result.winners || []).map((w, i) => (
                <Card key={w.prize_id || i} className="border-emerald-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="rounded-full bg-amber-400 text-amber-900 flex items-center justify-center font-bold shrink-0 w-12 h-12 text-lg">
                      {w.prize_position}°
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{w.prize_name}</div>
                      <div className="text-muted-foreground text-sm">Boleto ganador</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 text-2xl">#{w.boleto_numero}</div>
                      <div className="font-medium">{w.participant_name}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-muted-foreground text-sm mt-2 text-center">
              Sorteo realizado el {new Date(sorteo.drawing_result.drawn_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 z-50 bg-white border-t px-3 py-3">
        <div className="max-w-[640px] mx-auto">
          {canBuy ? (
            <Button
              className={`w-full h-[52px] text-base font-bold ${isGiveaway ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setBuying(true)}
            >
              {isGiveaway ? 'Participar gratis' : `Comprar boletos — ${formatMXN(sorteo.price_per_boleto)} c/u`}
            </Button>
          ) : (
            <div className="text-center text-muted-foreground">
              {sorteo.status === 'closed' && (isGiveaway ? 'Participaciones cerradas' : 'Ventas cerradas')}
              {sorteo.status === 'drawn' && '✓ Sorteo realizado'}
              {sorteo.status === 'draft' && 'Próximamente'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
