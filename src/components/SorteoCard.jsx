// src/components/SorteoCard.jsx
// Reusable sorteo card for the landing page grid.

import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMXN } from '@/components/shared/UI'

function formatEndDate(endDate) {
  if (!endDate) return null
  const end = new Date(endDate)
  const now = new Date()
  const diffMs = end - now
  if (diffMs < 0) return 'Finalizado'
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return `Termina en ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  return `Termina: ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function SorteoCard({ sorteo }) {
  const isGiveaway = Number(sorteo.price_per_boleto) === 0
  const pct = sorteo.pct_sold || 0
  const sold = Number(sorteo.boletos_sold || 0)
  const total = Number(sorteo.total_boletos || 0)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  const endLabel = formatEndDate(sorteo.end_date)

  return (
    <Link to={`/sorteo/${sorteo.org_slug}/${sorteo.id}`} className="no-underline">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        {/* Placeholder image */}
        <div className="bg-[#1F4E29] h-36 flex items-center justify-center">
          <img
            src="/RafikiIcon01.png"
            alt="Rafiki"
            className="h-14 opacity-40"
          />
        </div>

        <CardContent className="p-4">
          {/* Giveaway badge */}
          {isGiveaway && (
            <Badge className="bg-[#FCD12A] text-[#1F4E29] hover:bg-[#FCD12A] mb-2 font-semibold">
              GRATIS
            </Badge>
          )}

          {/* Title + org */}
          <h3 className="font-bold text-foreground line-clamp-2 leading-tight mb-1">
            {sorteo.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{sorteo.org_name}</p>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sold.toLocaleString('es-MX')} de {total.toLocaleString('es-MX')} boletos
              <span className="float-right">{pct}%</span>
            </p>
          </div>

          {/* Price + end date */}
          <div className="flex justify-between items-center text-sm">
            {!isGiveaway && (
              <span className="font-semibold text-primary">
                {formatMXN(sorteo.price_per_boleto)} / boleto
              </span>
            )}
            {isGiveaway && <span />}
            {endLabel && (
              <span className="text-muted-foreground text-xs">{endLabel}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
