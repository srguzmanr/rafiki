// src/components/organizador/SorteoForm.jsx

import { useState } from 'react'
import { createSorteo, updateSorteo, generateBoletos, savePrizes, fetchPrizes } from '../../lib/sorteosApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X, Info } from 'lucide-react'

const EMPTY_PRIZE = { title: '', description: '', value_mxn: '', image_url: '' }

const DEFAULT_FORM = {
  title: '', description: '', cause: '', total_boletos: '40000',
  price_per_boleto: '300', start_date: '', end_date: '', drawing_date: '', permit_number: '',
}

export function SorteoForm({ sorteo, orgId, userId, onSaved, onCancel }) {
  const isEdit = !!sorteo

  const [form, setForm] = useState(() => {
    if (!sorteo) return DEFAULT_FORM
    return {
      title: sorteo.title || '', description: sorteo.description || '', cause: sorteo.cause || '',
      total_boletos: String(sorteo.total_boletos || 40000),
      price_per_boleto: String(sorteo.price_per_boleto || 300),
      start_date: sorteo.start_date ? sorteo.start_date.slice(0, 16) : '',
      end_date: sorteo.end_date ? sorteo.end_date.slice(0, 16) : '',
      drawing_date: sorteo.drawing_date ? sorteo.drawing_date.slice(0, 16) : '',
      permit_number: sorteo.permit_number || '',
    }
  })

  const [isGiveaway, setIsGiveaway] = useState(() => isEdit ? Number(sorteo.price_per_boleto) === 0 : false)
  const [prizes, setPrizes] = useState([{ ...EMPTY_PRIZE }])
  const [loadingPrizes, setLoadingPrizes] = useState(isEdit)

  useState(() => {
    if (!isEdit) return
    fetchPrizes(sorteo.id).then(({ data }) => {
      if (data && data.length > 0) {
        setPrizes(data.map(p => ({
          title: p.title, description: p.description || '',
          value_mxn: p.value_mxn ? String(p.value_mxn) : '', image_url: p.image_url || '',
        })))
      }
      setLoadingPrizes(false)
    })
  }, [])

  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(null)

  function handleField(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  function handleGiveawayToggle(e) {
    const checked = e.target.checked
    setIsGiveaway(checked)
    setForm(f => ({ ...f, price_per_boleto: checked ? '0' : '300' }))
  }

  function handlePrizeField(index, field, value) {
    setPrizes(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u })
  }

  function addPrize() { setPrizes(prev => [...prev, { ...EMPTY_PRIZE }]) }
  function removePrize(index) { setPrizes(prev => prev.filter((_, i) => i !== index)) }

  function validate() {
    if (!form.title.trim()) return 'El título es requerido.'
    if (!form.total_boletos || Number(form.total_boletos) < 1) return 'El número de boletos debe ser mayor a 0.'
    if (Number(form.total_boletos) > 500000) return 'El máximo de boletos es 500,000.'
    if (form.price_per_boleto === '' || Number(form.price_per_boleto) < 0) return 'El precio por boleto es requerido.'
    if (!isGiveaway && Number(form.price_per_boleto) === 0)
      return 'El precio debe ser mayor a 0. Para sorteos gratuitos activa el modo giveaway.'
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date))
      return 'La fecha de cierre debe ser posterior a la de apertura.'
    for (let i = 0; i < prizes.length; i++) {
      if (!prizes[i].title.trim()) return `Premio ${i + 1}: el título es requerido.`
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSaving(true); setStep('saving')
    try {
      let sorteoId
      if (isEdit) {
        const { data, error } = await updateSorteo(sorteo.id, form)
        if (error) throw error
        sorteoId = data.id
      } else {
        const { data, error } = await createSorteo(orgId, userId, form)
        if (error) throw error
        sorteoId = data.id
        setStep('generating'); setGenerating(true)
        const { error: genError } = await generateBoletos(sorteoId)
        if (genError) throw new Error(`Sorteo creado pero error generando boletos: ${genError.message}`)
      }
      const validPrizes = prizes.filter(p => p.title.trim())
      if (validPrizes.length > 0) {
        const { error: prizeError } = await savePrizes(sorteoId, orgId, validPrizes)
        if (prizeError) console.warn('[SorteoForm] Prize save error (non-fatal):', prizeError)
      }
      onSaved(sorteoId)
    } catch (err) {
      console.error('[SorteoForm] Save error:', err)
      setError(err.message || 'Error al guardar el sorteo. Intenta de nuevo.')
    } finally {
      setSaving(false); setGenerating(false); setStep(null)
    }
  }

  const isBusy = saving || generating

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isEdit && isBusy && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-800">
            {step === 'saving'
              ? 'Guardando sorteo...'
              : `Generando ${Number(form.total_boletos).toLocaleString('es-MX')} boletos... (esto toma unos segundos)`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Información básica */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Información del sorteo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Título <span className="text-red-500">*</span></Label>
            <Input name="title" value={form.title} onChange={handleField} placeholder="Sorteo Primavera 2026" disabled={isBusy} required />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Descripción</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              name="description" value={form.description} onChange={handleField} rows={3} placeholder="Descripción del sorteo..." disabled={isBusy} />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Causa / Propósito</Label>
            <Input name="cause" value={form.cause} onChange={handleField} placeholder="Fondos para becas estudiantiles" disabled={isBusy} />
            <p className="text-xs text-muted-foreground">Se muestra en la página pública para generar confianza.</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">
              Número de permiso (SEGOB u otro)
              {isGiveaway && <span className="text-muted-foreground font-normal ml-2">(opcional para giveaways)</span>}
            </Label>
            <Input name="permit_number" value={form.permit_number} onChange={handleField} placeholder="20250250PS00" disabled={isBusy} />
            <p className="text-xs text-muted-foreground">Se muestra públicamente para legitimidad regulatoria.</p>
          </div>
        </CardContent>
      </Card>

      {/* Boletos y precio */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Boletos y precio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Giveaway toggle */}
          <div className={`p-3 rounded-lg border flex items-start gap-3 ${isGiveaway ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-muted/50'}`}>
            <input
              type="checkbox" role="switch" id="giveawayToggle"
              checked={isGiveaway} onChange={handleGiveawayToggle}
              disabled={isBusy || (isEdit && sorteo?.boletos_sold > 0)}
              className="mt-1 h-4 w-4 rounded accent-emerald-600"
            />
            <div>
              <label htmlFor="giveawayToggle" className="font-medium text-sm cursor-pointer">
                {isGiveaway
                  ? <><Badge className="bg-emerald-600 hover:bg-emerald-600 mr-2">GRATIS</Badge>Este es un giveaway (entrada gratuita)</>
                  : 'Este es un giveaway (gratuito)'}
              </label>
              {isGiveaway && (
                <p className="text-emerald-700 text-sm mt-1">Los participantes se confirman al instante. Sin procesamiento de pagos.</p>
              )}
              {isEdit && sorteo?.boletos_sold > 0 && (
                <p className="text-muted-foreground text-sm mt-1">No se puede cambiar después de tener registros.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Total de boletos <span className="text-red-500">*</span></Label>
              <Input type="number" name="total_boletos" value={form.total_boletos} onChange={handleField}
                min="1" max="500000" disabled={isBusy || (isEdit && sorteo?.boletos_sold > 0)} />
              {isEdit && sorteo?.boletos_sold > 0 && (
                <p className="text-xs text-amber-600">No se puede cambiar después de haber ventas.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-medium">
                {isGiveaway ? 'Entrada' : <>Precio por boleto (MXN) <span className="text-red-500">*</span></>}
              </Label>
              {isGiveaway ? (
                <div className="flex h-10 w-full items-center rounded-md border bg-muted px-3 text-sm text-emerald-600 font-bold">
                  Entrada gratuita
                </div>
              ) : (
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">$</span>
                  <Input type="number" name="price_per_boleto" value={form.price_per_boleto} onChange={handleField}
                    min="0.01" step="0.01" disabled={isBusy} className="rounded-l-none rounded-r-none" />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">MXN</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fechas */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Fechas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Inicio de ventas</Label>
              <Input type="datetime-local" name="start_date" value={form.start_date} onChange={handleField} disabled={isBusy} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Cierre de {isGiveaway ? 'participaciones' : 'ventas'}</Label>
              <Input type="datetime-local" name="end_date" value={form.end_date} onChange={handleField} disabled={isBusy} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Fecha del sorteo</Label>
              <Input type="datetime-local" name="drawing_date" value={form.drawing_date} onChange={handleField} disabled={isBusy} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Premios</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addPrize} disabled={isBusy || loadingPrizes}>
            <Plus className="mr-1 h-4 w-4" /> Agregar premio
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingPrizes && <p className="text-muted-foreground text-sm">Cargando premios...</p>}

          {!loadingPrizes && prizes.map((prize, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm font-medium">
                  Premio {index + 1} {index === 0 ? '(1er lugar)' : ''}
                </span>
                {prizes.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                    onClick={() => removePrize(index)} disabled={isBusy}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="md:col-span-3">
                  <Input placeholder="Título del premio *" value={prize.title}
                    onChange={e => handlePrizeField(index, 'title', e.target.value)} disabled={isBusy} required />
                </div>
                <div className="md:col-span-1">
                  <div className="flex">
                    <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs">$</span>
                    <Input type="number" placeholder="Valor" value={prize.value_mxn}
                      onChange={e => handlePrizeField(index, 'value_mxn', e.target.value)} disabled={isBusy} className="rounded-l-none" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Input type="url" placeholder="URL de imagen" value={prize.image_url}
                    onChange={e => handlePrizeField(index, 'image_url', e.target.value)} disabled={isBusy} />
                </div>
                <div className="md:col-span-6">
                  <Input placeholder="Descripción del premio" value={prize.description}
                    onChange={e => handlePrizeField(index, 'description', e.target.value)} disabled={isBusy} />
                </div>
              </div>
            </div>
          ))}

          {!loadingPrizes && prizes.length === 0 && (
            <p className="text-muted-foreground text-sm">Sin premios aún. Agrega al menos uno.</p>
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isBusy
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step === 'generating' ? 'Generando boletos...' : 'Guardando...'}</>
            : isEdit ? 'Guardar cambios' : 'Crear sorteo'
          }
        </Button>
      </div>
    </form>
  )
}
