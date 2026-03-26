// src/pages/LandingPage.jsx
// Public marketplace landing page — the default for unauthenticated visitors.

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllPublicSorteos } from '../lib/sorteosApi'
import { fetchAllSorteoImages, getImageUrl } from '../lib/storage'
import { SorteoCard } from '../components/SorteoCard'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { LoadingSpinner } from '../components/shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Ticket, Gift, Trophy } from 'lucide-react'

const WA_CTA = 'https://wa.me/524421568386?text=Hola%2C%20quiero%20crear%20mi%20rifa%20en%20Rafiki.%20%F0%9F%8E%89'

export function LandingPage() {
  const [sorteos, setSorteos] = useState([])
  const [coverImages, setCoverImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [sort, setSort] = useState('recientes')

  useEffect(() => {
    Promise.all([fetchAllPublicSorteos(), fetchAllSorteoImages()]).then(
      ([sorteosRes, imagesRes]) => {
        if (sorteosRes.error) {
          console.error('[LandingPage] Failed to load sorteos:', sorteosRes.error)
          setError('No se pudieron cargar los sorteos.')
        }
        setSorteos(sorteosRes.data || [])

        // Build map: sorteo_id → first image URL
        const covers = {}
        for (const img of (imagesRes.data || [])) {
          if (!covers[img.sorteo_id]) {
            covers[img.sorteo_id] = getImageUrl(img.storage_path)
          }
        }
        setCoverImages(covers)
        setLoading(false)
      }
    )
  }, [])

  const activeSorteos = useMemo(() => {
    let list = sorteos.filter(s => s.status === 'active')

    if (filter === 'sorteos') list = list.filter(s => Number(s.price_per_boleto) > 0)
    if (filter === 'giveaways') list = list.filter(s => Number(s.price_per_boleto) === 0)

    if (sort === 'recientes') list.sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date))
    if (sort === 'termina') list.sort((a, b) => new Date(a.end_date || '9999') - new Date(b.end_date || '9999'))
    if (sort === 'precio') list.sort((a, b) => Number(a.price_per_boleto) - Number(b.price_per_boleto))

    return list
  }, [sorteos, filter, sort])

  const drawnSorteos = useMemo(() =>
    sorteos
      .filter(s => s.status === 'drawn')
      .sort((a, b) => {
        const da = a.drawing_result?.drawn_at || a.drawing_date || ''
        const db = b.drawing_result?.drawn_at || b.drawing_date || ''
        return new Date(db) - new Date(da)
      })
      .slice(0, 6),
    [sorteos]
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/">
            <img src="/RafikiLogos03.png" alt="Rafiki" className="h-10" />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#1F4E29] text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/RafikiLogos03.png" alt="Rafiki" className="h-20 md:h-24 mx-auto mb-6" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Tu Central de Rifas</h1>
          <p className="text-lg md:text-xl text-white/80 mb-8">
            Organiza, participa y gana en sorteos entre amigos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-[#1F4E29] hover:bg-white/90 font-bold"
              onClick={() => document.getElementById('sorteos')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explorar Sorteos
            </Button>
            <Button
              size="lg"
              className="bg-[#F2644E] hover:bg-[#F2644E]/90 text-white font-bold"
              asChild
            >
              <a href={WA_CTA} target="_blank" rel="noopener noreferrer">
                Crear mi Rifa
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#FBFBFB] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Ticket, title: 'Elige', desc: 'Explora sorteos activos y elige los boletos que quieras.' },
              { icon: Gift, title: 'Participa', desc: 'Compra tus boletos o entra gratis a un giveaway.' },
              { icon: Trophy, title: '¡Gana!', desc: 'El sorteo se realiza de forma transparente y verificable.' },
            ].map(step => (
              <Card key={step.title} className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sorteos Activos */}
      <section id="sorteos" className="py-16 px-4 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Sorteos Activos</h2>

          {/* Filters + Sort */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'sorteos', label: 'Sorteos' },
                { value: 'giveaways', label: 'Giveaways' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === tab.value
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recientes">Más recientes</SelectItem>
                  <SelectItem value="termina">Termina pronto</SelectItem>
                  <SelectItem value="precio">Precio: menor a mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Cargando sorteos..." />
          ) : activeSorteos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSorteos.map(s => <SorteoCard key={s.id} sorteo={s} coverImageUrl={coverImages[s.id]} />)}
            </div>
          ) : (
            <Card className="py-16 text-center">
              <CardContent>
                <img src="/RafikiIcon01.png" alt="" className="h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Próximamente: ¡nuevos sorteos y giveaways!
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Mientras tanto, ¿tienes algo que rifar?
                </p>
                <Button className="bg-[#F2644E] hover:bg-[#F2644E]/90 text-white" asChild>
                  <a href={WA_CTA} target="_blank" rel="noopener noreferrer">
                    Crear mi Rifa
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Resultados Recientes */}
      <section className="bg-[#FBFBFB] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Resultados Recientes</h2>

          {loading ? (
            <LoadingSpinner message="Cargando resultados..." />
          ) : drawnSorteos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {drawnSorteos.map(s => {
                const winners = s.drawing_result?.winners || []
                const topWinner = winners[0]
                const drawnDate = s.drawing_result?.drawn_at || s.drawing_date
                return (
                  <Link
                    key={s.id}
                    to={`/sorteo/${s.org_slug}/${s.id}`}
                    className="no-underline"
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="py-3 px-4 flex items-center gap-3 flex-wrap">
                        <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-foreground">{s.title}</span>
                          <span className="text-muted-foreground text-sm ml-2 hidden sm:inline">{s.org_name}</span>
                        </div>
                        {topWinner && (
                          <div className="text-sm text-muted-foreground">
                            {topWinner.participant_name
                              ? `Ganador: ${topWinner.participant_name}`
                              : `Boleto ganador: #${topWinner.boleto_numero}`
                            }
                          </div>
                        )}
                        {drawnDate && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(drawnDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Los resultados de los sorteos aparecerán aquí una vez que se realicen.
            </p>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#1F4E29] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">¿Tienes algo que rifar?</h2>
          <p className="text-white/80 mb-6">
            Crea tu sorteo en minutos. Para ti, tu negocio, o entre amigos.
          </p>
          <Button
            size="lg"
            className="bg-[#F2644E] hover:bg-[#F2644E]/90 text-white font-bold"
            asChild
          >
            <a href={WA_CTA} target="_blank" rel="noopener noreferrer">
              Crear mi Rifa
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F4E29] border-t border-white/10 text-white/70 py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="/RafikiLogos03.png" alt="Rafiki" className="h-8 mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <p className="text-sm">Tu Central de Rifas</p>
          </div>
          <div className="text-sm space-y-2">
            <Link to="/privacidad" className="block hover:text-white">Aviso de Privacidad</Link>
            <Link to="/terminos" className="block hover:text-white">Términos y Condiciones</Link>
            <Link to="/login" className="block hover:text-white">Iniciar sesión</Link>
          </div>
          <div className="text-sm space-y-2">
            <a href="mailto:rifalo@rafiki.mx" className="block hover:text-white">rifalo@rafiki.mx</a>
            <a
              href="https://wa.me/524421568386"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-white"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-white/10 text-center text-xs text-white/50">
          &copy; 2026 Servicios Comerciales Rafiki, S.A. de C.V.
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  )
}
