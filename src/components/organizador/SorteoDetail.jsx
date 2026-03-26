// src/components/organizador/SorteoDetail.jsx
// Organizador's sorteo detail view with management tools.

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import {
  fetchSorteoById, fetchVendedorSummary, fetchOrgVendedores,
  assignVendedor, removeVendedor, drawWinners, fetchReportSales,
} from '../../lib/sorteosApi'
import { StatusBadge, LoadingSpinner, ErrorMessage, SalesProgressBar, formatMXN, ConfirmModal } from '../shared/UI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Loader2, ArrowLeft, Pencil, BarChart3, Dice5,
  Link2, Check, Share2, Download, Search,
} from 'lucide-react'

function ShareTools({ sorteo }) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const sorteoUrl = `${window.location.origin}${window.location.pathname}#/sorteo/${sorteo.org_slug || 'org'}/${sorteo.id}`
  const text = `${sorteo.title} — Participa en Rafiki`

  useEffect(() => {
    QRCode.toDataURL(sorteoUrl, { width: 300, margin: 2 }).then(setQrDataUrl).catch(() => {})
  }, [sorteoUrl])

  function copyLink() {
    navigator.clipboard.writeText(sorteoUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadQR() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `sorteo-${sorteo.id.slice(0, 8)}-qr.png`
    a.click()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4" /> Compartir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <><Check className="mr-1 h-3.5 w-3.5" /> ¡Copiado!</> : <><Link2 className="mr-1 h-3.5 w-3.5" /> Copiar enlace</>}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(text + '\n' + sorteoUrl)}`} target="_blank" rel="noopener noreferrer"
              className="bg-[#25D366] text-white border-[#25D366] hover:bg-[#25D366]/90 hover:text-white">
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sorteoUrl)}`} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(sorteoUrl)}`} target="_blank" rel="noopener noreferrer">
              X
            </a>
          </Button>
        </div>
        {qrDataUrl && (
          <div className="flex items-center gap-4">
            <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 border rounded" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Código QR del sorteo</p>
              <Button variant="outline" size="sm" onClick={downloadQR}>
                <Download className="mr-1 h-3.5 w-3.5" /> Descargar QR
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ParticipantList({ sorteoId, isGiveaway }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchReportSales(sorteoId).then(({ data }) => {
      setSales(data || [])
      setLoading(false)
    })
  }, [sorteoId])

  const filtered = sales.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (s.buyer_name || '').toLowerCase().includes(q) || (s.buyer_email || '').toLowerCase().includes(q)
  })

  // Aggregate by buyer
  const buyerMap = new Map()
  for (const sale of filtered) {
    const key = sale.buyer_name || sale.buyer_phone || 'Anónimo'
    const existing = buyerMap.get(key)
    if (existing) {
      existing.count++
      if (new Date(sale.created_at) > new Date(existing.date)) existing.date = sale.created_at
    } else {
      buyerMap.set(key, {
        name: sale.buyer_name || 'Sin nombre',
        email: sale.buyer_email || '',
        phone: sale.buyer_phone || '',
        count: 1,
        date: sale.created_at,
      })
    }
  }
  const buyers = Array.from(buyerMap.values())

  if (loading) return <p className="text-sm text-muted-foreground">Cargando participantes...</p>

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{isGiveaway ? 'Participantes' : 'Compradores'} ({buyers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        {buyers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? 'Sin resultados.' : (isGiveaway ? 'Aún no hay participantes.' : 'Aún no hay compradores.')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Boletos</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.email && <div>{b.email}</div>}
                      {b.phone && <div>{b.phone}</div>}
                    </TableCell>
                    <TableCell className="text-right">{b.count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(b.date).toLocaleDateString('es-MX')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SorteoDetail({ sorteoId, orgId, userId, onBack, onEdit, onOpenReporting }) {
  const [sorteo, setSorteo] = useState(null)
  const [vendedores, setVendedores] = useState([])
  const [allVendedores, setAllVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [selectedVendedor, setSelectedVendedor] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [drawError, setDrawError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [sorteoRes, vendedorRes, allVendedoresRes] = await Promise.all([
        fetchSorteoById(sorteoId), fetchVendedorSummary(sorteoId), fetchOrgVendedores(orgId),
      ])
      if (sorteoRes.error) throw sorteoRes.error
      setSorteo(sorteoRes.data)
      setVendedores(vendedorRes.data || [])
      setAllVendedores(allVendedoresRes.data || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [sorteoId, orgId])

  useEffect(() => { loadData() }, [loadData])

  async function handleAssign() {
    if (!selectedVendedor) return
    setAssigning(true)
    try {
      const { error } = await assignVendedor(selectedVendedor, sorteoId, orgId, userId)
      if (error) throw error
      setSelectedVendedor(''); await loadData()
    } catch (err) { setError(err.message) }
    finally { setAssigning(false) }
  }

  function handleDraw() {
    setConfirm({
      title: 'Realizar Sorteo',
      message: `¿Estás seguro? Esta acción no se puede deshacer.\n\nSe seleccionarán ganador(es) de ${Number(sorteo.boletos_sold || 0).toLocaleString('es-MX')} boletos vendidos.`,
      confirmLabel: 'Realizar Sorteo',
      onConfirm: async () => {
        setDrawing(true); setDrawError(null)
        const { data, error } = await drawWinners(sorteoId)
        setDrawing(false)
        if (error) { setDrawError(error.message); throw error }
        await loadData()
      },
    })
  }

  function handleRemove(vendedorId, vendedorName) {
    setConfirm({
      title: 'Quitar vendedor',
      message: `¿Quitar a ${vendedorName} de este sorteo? Sus ventas ya registradas no se perderán.`,
      confirmLabel: 'Quitar', danger: true,
      onConfirm: async () => {
        const { error } = await removeVendedor(vendedorId, sorteoId)
        if (error) throw error
        await loadData()
      },
    })
  }

  if (loading) return <LoadingSpinner message="Cargando sorteo..." />
  if (error)   return <ErrorMessage message={error} onRetry={loadData} />
  if (!sorteo) return <ErrorMessage message="Sorteo no encontrado." />

  const assignedIds = new Set(vendedores.map(v => v.vendedor_id))
  const unassigned  = allVendedores.filter(v => !assignedIds.has(v.user_id))
  const isGiveaway = Number(sorteo.price_per_boleto) === 0

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Regresar
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xl font-bold">{sorteo.title}</h4>
            <StatusBadge status={sorteo.status} />
          </div>
          {sorteo.cause && <p className="text-muted-foreground text-sm mt-1"><em>{sorteo.cause}</em></p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {(sorteo.status === 'draft' || sorteo.status === 'active') && (
            <Button variant="outline" size="sm" onClick={() => onEdit(sorteoId)}>
              <Pencil className="mr-1 h-4 w-4" /> Editar
            </Button>
          )}
          {onOpenReporting && Number(sorteo.boletos_sold || 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => onOpenReporting(sorteo)}>
              <BarChart3 className="mr-1 h-4 w-4" /> Reporte
            </Button>
          )}
          {sorteo.status === 'closed' && Number(sorteo.boletos_sold || 0) > 0 && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={handleDraw} disabled={drawing}>
              {drawing ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Sorteando...</> : <><Dice5 className="mr-1 h-4 w-4" /> Realizar Sorteo</>}
            </Button>
          )}
        </div>
      </div>

      {drawError && <Alert variant="destructive" className="mb-4"><AlertDescription>{drawError}</AlertDescription></Alert>}

      {/* Drawing Result */}
      {sorteo.status === 'drawn' && sorteo.drawing_result && (
        <Card className="border-emerald-300 mb-4">
          <CardHeader className="bg-emerald-600 text-white rounded-t-lg py-3">
            <CardTitle className="text-base">Resultado del Sorteo</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(sorteo.drawing_result.winners || []).map((w, i) => (
              <div key={w.prize_id || i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="rounded-full bg-amber-400 text-amber-900 flex items-center justify-center font-bold shrink-0 w-12 h-12 text-lg">
                  {w.prize_position}°
                </div>
                <div className="flex-1">
                  <div className="font-bold">{w.prize_name}</div>
                  <div className="text-muted-foreground text-sm">Premio {w.prize_position}° lugar</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 text-xl">#{w.boleto_numero}</div>
                  <div className="text-muted-foreground text-sm">{w.participant_name}</div>
                </div>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t flex justify-between text-muted-foreground text-sm flex-wrap gap-2">
              <span>Método: {sorteo.drawing_result.method === 'postgresql_random' ? 'Aleatorio (PostgreSQL)' : sorteo.drawing_result.method}</span>
              <span>Pool: {sorteo.drawing_result.eligible_pool_size} boletos elegibles</span>
              <span>{new Date(sorteo.drawing_result.drawn_at).toLocaleString('es-MX', { timeZone: 'America/Hermosillo' })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total boletos', value: Number(sorteo.total_boletos).toLocaleString('es-MX') },
          { label: isGiveaway ? 'Participantes' : 'Vendidos', value: Number(sorteo.boletos_sold || 0).toLocaleString('es-MX') },
          { label: 'Disponibles', value: Number(sorteo.boletos_available || 0).toLocaleString('es-MX') },
          { label: isGiveaway ? 'Giveaway gratuito' : 'Recaudado', value: isGiveaway ? 'GRATIS' : formatMXN(sorteo.revenue_mxn || 0), highlight: !isGiveaway },
        ].map(stat => (
          <Card key={stat.label} className="text-center">
            <CardContent className="py-3">
              <div className={`text-xl font-bold ${stat.highlight ? 'text-emerald-600' : ''}`}>{stat.value}</div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <SalesProgressBar pctSold={sorteo.pct_sold} boletosSold={sorteo.boletos_sold || 0} totalBoletos={sorteo.total_boletos} />
        </CardContent>
      </Card>

      {/* Share Tools */}
      <div className="mb-4">
        <ShareTools sorteo={sorteo} />
      </div>

      {/* Info row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Precio por boleto</span><span className="font-medium">{isGiveaway ? 'Gratis' : formatMXN(sorteo.price_per_boleto)}</span></div>
            {sorteo.permit_number && <div className="flex justify-between"><span className="text-muted-foreground">Permiso</span><span className="font-medium">{sorteo.permit_number}</span></div>}
            {sorteo.start_date && <div className="flex justify-between"><span className="text-muted-foreground">Inicio ventas</span><span>{new Date(sorteo.start_date).toLocaleDateString('es-MX')}</span></div>}
            {sorteo.end_date && <div className="flex justify-between"><span className="text-muted-foreground">Cierre ventas</span><span>{new Date(sorteo.end_date).toLocaleDateString('es-MX')}</span></div>}
            {sorteo.drawing_date && <div className="flex justify-between"><span className="text-muted-foreground">Fecha sorteo</span><span>{new Date(sorteo.drawing_date).toLocaleDateString('es-MX')}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Estado del sorteo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {['draft', 'active', 'closed', 'drawn'].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`rounded-full w-3 h-3 shrink-0 ${
                  sorteo.status === s ? 'bg-primary'
                  : sorteo.status === 'drawn' || (['active','closed','drawn'].indexOf(s) < ['active','closed','drawn'].indexOf(sorteo.status)) ? 'bg-emerald-500'
                  : 'bg-muted border'
                }`} />
                <span className={sorteo.status === s ? 'font-bold' : 'text-muted-foreground'}>
                  {{draft:'1. Borrador', active:'2. Activo (ventas abiertas)', closed:'3. Cerrado (ventas cerradas)', drawn:'4. Sorteado'}[s]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Participant List */}
      {Number(sorteo.boletos_sold || 0) > 0 && (
        <div className="mb-4">
          <ParticipantList sorteoId={sorteoId} isGiveaway={isGiveaway} />
        </div>
      )}

      {/* Vendedores */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Vendedores asignados</CardTitle>
          <Badge variant="secondary">{vendedores.length}</Badge>
        </CardHeader>
        <CardContent>
          {sorteo.status !== 'drawn' && (
            <div className="flex gap-2 mb-3">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedVendedor}
                onChange={e => setSelectedVendedor(e.target.value)}
                disabled={assigning}
              >
                <option value="">Asignar vendedor...</option>
                {unassigned.map(v => (
                  <option key={v.user_id} value={v.user_id}>
                    {v.profiles?.full_name || 'Sin nombre'}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={handleAssign} disabled={!selectedVendedor || assigning}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Asignar'}
              </Button>
            </div>
          )}

          {vendedores.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin vendedores asignados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Recaudado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Última venta</TableHead>
                    {sorteo.status !== 'drawn' && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map(v => (
                    <TableRow key={v.vendedor_id}>
                      <TableCell>
                        <div className="font-medium">{v.vendedor_name || '—'}</div>
                        <div className="text-muted-foreground text-sm">{v.vendedor_email}</div>
                      </TableCell>
                      <TableCell className="text-right">{v.total_sales}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatMXN(v.confirmed_revenue_mxn)}</TableCell>
                      <TableCell className="text-right text-amber-600">{formatMXN(v.total_revenue_mxn - v.confirmed_revenue_mxn)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {v.last_sale_at ? new Date(v.last_sale_at).toLocaleDateString('es-MX') : '—'}
                      </TableCell>
                      {sorteo.status !== 'drawn' && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleRemove(v.vendedor_id, v.vendedor_name)}>
                            Quitar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
