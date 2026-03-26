// src/components/organizador/ReportingDashboard.jsx

import { useState, useEffect } from 'react'
import { fetchVendedorSummary, fetchDailySales, exportSalesCSV } from '../../lib/sorteosApi'
import { formatMXN, LoadingSpinner, ErrorMessage } from '../shared/UI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Loader2, ArrowLeft, Download } from 'lucide-react'

export function ReportingDashboard({ sorteo, onBack }) {
  const isGiveaway = Number(sorteo.price_per_boleto) === 0
  const [vendedores, setVendedores] = useState([])
  const [dailySales, setDailySales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      const [vRes, dRes] = await Promise.all([fetchVendedorSummary(sorteo.id), fetchDailySales(sorteo.id)])
      if (vRes.error) setError(vRes.error.message)
      else { setVendedores(vRes.data || []); setDailySales(dRes.data || []) }
      setLoading(false)
    }
    load()
  }, [sorteo.id])

  async function handleExport() {
    setExporting(true); setExportMsg(null)
    const { error } = await exportSalesCSV(sorteo.id, sorteo.title)
    setExporting(false)
    setExportMsg(error ? `Error: ${error.message}` : '✓ Descarga iniciada')
    setTimeout(() => setExportMsg(null), 3000)
  }

  const maxDay = Math.max(...dailySales.map(d => Number(d.sales_count)), 1)
  const totalSold = Number(sorteo.boletos_sold || 0)

  if (loading) return <LoadingSpinner message="Cargando reportes..." />
  if (error) return <ErrorMessage message={error} />

  const kpiCards = isGiveaway
    ? [
        { label: 'Participantes', value: totalSold.toLocaleString('es-MX'), color: 'text-primary' },
        { label: 'Disponibles', value: Number(sorteo.boletos_available || 0).toLocaleString('es-MX'), color: 'text-muted-foreground' },
        { label: '% Registrado', value: `${Math.round(sorteo.pct_sold || 0)}%`, color: 'text-emerald-600' },
        { label: 'Total lugares', value: Number(sorteo.total_boletos || 0).toLocaleString('es-MX'), color: 'text-blue-600' },
      ]
    : [
        { label: 'Boletos vendidos', value: totalSold.toLocaleString('es-MX'), color: 'text-primary' },
        { label: 'Disponibles', value: Number(sorteo.boletos_available || 0).toLocaleString('es-MX'), color: 'text-muted-foreground' },
        { label: 'Recaudado', value: formatMXN(sorteo.revenue_mxn || 0), color: 'text-emerald-600' },
        { label: '% Vendido', value: `${Math.round(sorteo.pct_sold || 0)}%`, color: 'text-blue-600' },
      ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Regresar</Button>
          <div>
            <h5 className="font-bold flex items-center gap-2">
              {isGiveaway ? 'Reporte de participaciones' : 'Reporte de ventas'}
              {isGiveaway && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[0.7rem]">Giveaway</Badge>}
            </h5>
            <div className="text-muted-foreground text-sm">{sorteo.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exportMsg && <span className={`text-sm ${exportMsg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>{exportMsg}</span>}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || totalSold === 0}
            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
            {exporting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Exportando...</> : <><Download className="mr-1 h-4 w-4" /> Descargar CSV</>}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(card => (
          <Card key={card.label} className="border-0 bg-muted/50">
            <CardContent className="py-3 text-center">
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-muted-foreground text-sm">{card.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vendedor breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isGiveaway ? 'Registros por vendedor' : 'Rendimiento por vendedor'}</CardTitle>
        </CardHeader>
        {vendedores.length === 0 ? (
          <CardContent className="text-muted-foreground text-center py-8">Sin datos de vendedores aún.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">{isGiveaway ? 'Registros' : 'Boletos'}</TableHead>
                  {!isGiveaway && <><TableHead className="text-right">Confirmados</TableHead><TableHead className="text-right">Pendiente</TableHead><TableHead className="text-right">Total</TableHead></>}
                  <TableHead className="text-right text-xs">Última actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map(v => (
                  <TableRow key={v.vendedor_id}>
                    <TableCell className="font-medium">{v.vendedor_name || <span className="text-muted-foreground">(sin nombre)</span>}</TableCell>
                    <TableCell className="text-right">{v.total_sales}</TableCell>
                    {!isGiveaway && <>
                      <TableCell className="text-right text-emerald-600">{formatMXN(v.confirmed_revenue_mxn || 0)}</TableCell>
                      <TableCell className="text-right text-amber-600">{formatMXN(Number(v.total_revenue_mxn || 0) - Number(v.confirmed_revenue_mxn || 0))}</TableCell>
                      <TableCell className="text-right font-bold">{formatMXN(Number(v.total_revenue_mxn || 0))}</TableCell>
                    </>}
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {v.last_sale_at ? new Date(v.last_sale_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{vendedores.reduce((s, v) => s + Number(v.total_sales || 0), 0)}</TableCell>
                  {!isGiveaway && <>
                    <TableCell className="text-right font-bold text-emerald-600">{formatMXN(vendedores.reduce((s, v) => s + Number(v.confirmed_revenue_mxn || 0), 0))}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">{formatMXN(vendedores.reduce((s, v) => s + Number(v.total_revenue_mxn || 0) - Number(v.confirmed_revenue_mxn || 0), 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatMXN(vendedores.reduce((s, v) => s + Number(v.total_revenue_mxn || 0), 0))}</TableCell>
                  </>}
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </Card>

      {/* Daily timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{isGiveaway ? 'Registros por día' : 'Ventas por día'}</CardTitle>
          <span className="text-muted-foreground text-sm">{dailySales.length} días con actividad</span>
        </CardHeader>
        {dailySales.length === 0 ? (
          <CardContent className="text-muted-foreground text-center py-8">Sin {isGiveaway ? 'registros' : 'ventas'} registradas aún.</CardContent>
        ) : (
          <CardContent className="space-y-2">
            {[...dailySales].reverse().map(day => {
              const pct = Math.max(4, Math.round((Number(day.sales_count) / maxDay) * 100))
              return (
                <div key={day.sale_date} className="flex items-center gap-3">
                  <div className="text-muted-foreground text-xs min-w-[90px]">
                    {new Date(day.sale_date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex-1 bg-muted rounded h-[22px] relative">
                    <div
                      className={`rounded h-full flex items-center px-2 ${isGiveaway ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%`, transition: 'width 0.3s', minWidth: 28 }}
                    >
                      <span className="text-white text-[0.72rem] whitespace-nowrap">{day.sales_count}</span>
                    </div>
                  </div>
                  {!isGiveaway && (
                    <div className="text-emerald-600 font-medium text-right min-w-[80px] text-[0.82rem]">{formatMXN(day.revenue_mxn)}</div>
                  )}
                </div>
              )
            })}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
