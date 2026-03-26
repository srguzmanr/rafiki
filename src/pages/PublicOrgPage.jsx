// src/pages/PublicOrgPage.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchPublicSorteosByOrg } from '../lib/participanteApi'
import { LoadingSpinner, ErrorMessage, StatusBadge, SalesProgressBar, formatMXN } from '../components/shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WhatsAppButton } from '../components/WhatsAppButton'

export function PublicOrgPage() {
  const { orgSlug } = useParams()
  const [sorteos, setSorteos] = useState([])
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true); setError(null)
    const { data, error } = await fetchPublicSorteosByOrg(orgSlug)
    if (error) setError('No se pudo cargar la información.')
    else { setSorteos(data); if (data.length > 0) setOrgName(data[0].org_name) }
    setLoading(false)
  }

  useEffect(() => { load() }, [orgSlug])

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white border-b px-4 py-3 flex items-center">
        <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7 mx-auto" />
      </nav>

      <div className="max-w-[700px] mx-auto px-4 py-4">
        {orgName && (
          <div className="mb-4">
            <h3 className="text-2xl font-bold">{orgName}</h3>
            <p className="text-muted-foreground">Sorteos activos</p>
          </div>
        )}

        {loading && <LoadingSpinner message="Cargando sorteos..." />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && sorteos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl">🎟️</div>
            <p className="text-muted-foreground mt-2">No hay sorteos activos en este momento.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {sorteos.map(sorteo => (
            <Link key={sorteo.id} to={`/sorteo/${orgSlug}/${sorteo.id}`} className="no-underline">
              <Card className="border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-bold text-foreground">{sorteo.title}</h5>
                    <StatusBadge status={sorteo.status} />
                  </div>

                  {sorteo.cause && <p className="text-muted-foreground text-sm mb-2"><em>{sorteo.cause}</em></p>}

                  {Array.isArray(sorteo.prizes) && sorteo.prizes.length > 0 && (
                    <div className="mb-2">
                      <Badge variant="outline" className="mr-1">🏆 {sorteo.prizes[0]?.title}</Badge>
                      {sorteo.prizes.length > 1 && (
                        <span className="text-muted-foreground text-sm">+ {sorteo.prizes.length - 1} premios más</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-2">
                    {Number(sorteo.price_per_boleto) === 0
                      ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-base px-2 py-1">GRATIS</Badge>
                      : <span className="text-primary font-bold">{formatMXN(sorteo.price_per_boleto)}</span>}
                    {sorteo.drawing_date && (
                      <span className="text-muted-foreground text-sm">
                        Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <SalesProgressBar pctSold={sorteo.pct_sold} boletosSold={sorteo.boletos_sold || 0} totalBoletos={sorteo.total_boletos} />

                  {sorteo.status === 'active' && (
                    <div className="text-right mt-2">
                      <span className="text-primary text-sm font-medium">
                        {Number(sorteo.price_per_boleto) === 0 ? 'Ver y participar →' : 'Ver y comprar →'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <WhatsAppButton />
    </div>
  )
}
