// src/pages/PublicSorteoPage.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPublicSorteo } from '../lib/participanteApi'
import { PurchaseFlow } from '../components/participante/PurchaseFlow'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { LoadingSpinner, ErrorMessage, StatusBadge, SalesProgressBar, formatMXN } from '../components/shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Share2, Link2, Check, Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchSorteoImages, getImageUrl } from '../lib/storage'

function getCountdownLabel(endDate, status) {
  if (status === 'drawn') return 'Sorteado'
  if (status === 'closed') return 'Sorteo cerrado'
  if (!endDate) return null
  const end = new Date(endDate)
  const now = new Date()
  const diffMs = end - now
  if (diffMs < 0) return 'Plazo terminado'
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) return `Termina en ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return `Termina en ${diffDays} día${diffDays !== 1 ? 's' : ''}`
}

function ShareButtons({ sorteo }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.href
  const text = `${sorteo.title} — ${Number(sorteo.price_per_boleto) === 0 ? 'Participa gratis' : formatMXN(sorteo.price_per_boleto) + ' por boleto'} en Rafiki`

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-muted-foreground text-sm mr-1"><Share2 className="h-4 w-4 inline" /> Compartir:</span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#25D366] text-white text-sm font-medium hover:bg-[#25D366]/90 transition-colors"
      >
        WhatsApp
      </a>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
      >
        {copied ? <><Check className="h-3.5 w-3.5" /> ¡Copiado!</> : <><Link2 className="h-3.5 w-3.5" /> Copiar enlace</>}
      </button>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
      >
        Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
      >
        X
      </a>
    </div>
  )
}

export function PublicSorteoPage() {
  const { orgSlug, sorteoId } = useParams()
  const { user, session } = useAuth()
  const [sorteo, setSorteo] = useState(null)
  const [sorteoImages, setSorteoImages] = useState([])
  const [imageIndex, setImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(false)

  async function loadSorteo() {
    setLoading(true); setError(null)
    const [sorteoRes, imagesRes] = await Promise.all([
      fetchPublicSorteo(sorteoId),
      fetchSorteoImages(sorteoId),
    ])
    if (sorteoRes.error) setError('Sorteo no encontrado o no disponible.')
    else setSorteo(sorteoRes.data)
    setSorteoImages(imagesRes.data || [])
    setImageIndex(0)
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
  const sold = Number(sorteo.boletos_sold || 0)
  const countdownLabel = getCountdownLabel(sorteo.end_date, sorteo.status)

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
          &larr; {sorteo.org_name}
        </Link>
        <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7 mx-auto" />
        <div className="w-20" />
      </nav>

      {/* Image gallery */}
      {sorteoImages.length > 0 && (
        <div className="relative bg-black">
          <img
            src={getImageUrl(sorteoImages[imageIndex].storage_path)}
            alt={sorteo.title}
            className="w-full h-56 md:h-72 object-contain mx-auto"
          />
          {sorteoImages.length > 1 && (
            <>
              <button onClick={() => setImageIndex(i => (i - 1 + sorteoImages.length) % sorteoImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setImageIndex(i => (i + 1) % sorteoImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {sorteoImages.map((_, i) => (
                  <button key={i} onClick={() => setImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="max-w-[640px] mx-auto px-4 py-4">
        {/* Title + status */}
        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{sorteo.title}</h2>
            {isGiveaway && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-base">Gratis</Badge>}
          </div>
          <StatusBadge status={sorteo.status} />
        </div>

        {/* Organization info */}
        <p className="text-muted-foreground text-sm mb-1">{sorteo.org_name}</p>
        {sorteo.permit_number && (
          <p className="text-muted-foreground text-sm mb-3">Permiso: <strong>{sorteo.permit_number}</strong></p>
        )}

        {/* Countdown */}
        {countdownLabel && (
          <div className="mb-3">
            <Badge variant="outline" className="text-sm">
              {countdownLabel}
            </Badge>
          </div>
        )}

        {/* Share buttons */}
        <div className="mb-4">
          <ShareButtons sorteo={sorteo} />
        </div>

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

        {/* Social proof */}
        {sold > 0 && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            {sold === 1
              ? '1 persona ya está participando'
              : `${sold.toLocaleString('es-MX')} personas ya están participando`
            }
          </p>
        )}

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

        {/* Winners (drawn sorteos) */}
        {sorteo.status === 'drawn' && sorteo.drawing_result && (
          <div className="mb-4">
            <h5 className="font-bold mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Ganadores
            </h5>
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
                      {w.participant_name && <div className="font-medium">{w.participant_name}</div>}
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
      <div className="sticky bottom-0 z-40 bg-white border-t px-3 py-3">
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

      <WhatsAppButton />
    </div>
  )
}
