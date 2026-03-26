// src/components/organizador/SorteoPreview.jsx
// Preview modal content showing what participants will see on the public page.

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SalesProgressBar, formatMXN } from '../shared/UI'
import { getImageUrl } from '@/lib/storage'

export function SorteoPreview({ sorteo }) {
  const isGiveaway = Number(sorteo.price_per_boleto) === 0
  const prizes = sorteo.prizes || []
  const images = sorteo.images || []

  function getThumbUrl(img) {
    if (img.preview) return img.preview
    if (img.storage_path) return getImageUrl(img.storage_path)
    return ''
  }

  return (
    <div className="space-y-4">
      {/* Images */}
      {images.length > 0 ? (
        <div className="rounded-lg overflow-hidden">
          <img
            src={getThumbUrl(images[0])}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
        </div>
      ) : (
        <div className="bg-[#1F4E29] h-32 rounded-lg flex items-center justify-center">
          <img src="/RafikiIcon01.png" alt="" className="h-16 opacity-30" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
      )}

      {/* Title + badges */}
      <div className="flex items-start gap-2 flex-wrap">
        <h3 className="text-xl font-bold flex-1">{sorteo.title}</h3>
        {isGiveaway && <Badge className="bg-emerald-600 hover:bg-emerald-600">Gratis</Badge>}
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">Activo</Badge>
      </div>

      {sorteo.cause && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-sm">
          🎯 {sorteo.cause}
        </p>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 text-center gap-0 mb-3">
            <div className="border-r">
              <div className="text-xl font-bold">0</div>
              <div className="text-muted-foreground text-xs">{isGiveaway ? 'participantes' : 'vendidos'}</div>
            </div>
            <div className="border-r">
              <div className="text-xl font-bold">{Number(sorteo.total_boletos).toLocaleString('es-MX')}</div>
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
          <SalesProgressBar pctSold={0} boletosSold={0} totalBoletos={sorteo.total_boletos} />
        </CardContent>
      </Card>

      {/* Dates */}
      {(sorteo.end_date || sorteo.drawing_date) && (
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              {sorteo.end_date && (
                <div>
                  <div className="text-muted-foreground">{isGiveaway ? 'Cierre participaciones' : 'Cierre ventas'}</div>
                  <div className="font-medium">{new Date(sorteo.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              )}
              {sorteo.drawing_date && (
                <div>
                  <div className="text-muted-foreground">Fecha del sorteo</div>
                  <div className="font-medium">{new Date(sorteo.drawing_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prizes */}
      {prizes.length > 0 && (
        <div>
          <h5 className="font-bold mb-2">Premios</h5>
          {prizes.map((prize, i) => (
            <div key={i} className="flex gap-3 items-start p-2 border-b last:border-b-0">
              <div className="rounded-full bg-primary text-white flex items-center justify-center shrink-0 font-bold w-8 h-8 text-sm">
                {i + 1}°
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{prize.title}</div>
                {prize.description && <div className="text-muted-foreground text-xs">{prize.description}</div>}
                {prize.value_mxn && <div className="text-emerald-600 text-xs font-medium">{formatMXN(prize.value_mxn)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {sorteo.description && (
        <div>
          <h5 className="font-bold mb-1">Acerca de este sorteo</h5>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{sorteo.description}</p>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Esta es una vista previa. Los datos reales se actualizarán al publicar.
      </p>
    </div>
  )
}
