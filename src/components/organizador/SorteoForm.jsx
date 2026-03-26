// src/components/organizador/SorteoForm.jsx
// Enhanced sorteo creation/editing form with image upload, pricing calculator,
// date validation, preview modal, and save draft vs publish actions.

import { useState, useEffect } from 'react'
import {
  createSorteo, updateSorteo, generateBoletos, savePrizes, fetchPrizes,
  fetchSorteoById, transitionSorteoStatus,
} from '../../lib/sorteosApi'
import { uploadSorteoImage, fetchSorteoImages, saveSorteoImages, getImageUrl } from '../../lib/storage'
import { ImageUploader } from '../ImageUploader'
import { SorteoPreview } from './SorteoPreview'
import { formatMXN, ConfirmModal } from '../shared/UI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Plus, X, Eye, Save, Rocket } from 'lucide-react'

const EMPTY_PRIZE = { title: '', description: '', value_mxn: '', image_url: '' }

const DEFAULT_FORM = {
  title: '', description: '', cause: '', total_boletos: '500',
  price_per_boleto: '50', start_date: '', end_date: '', drawing_date: '', permit_number: '',
}

function todayLocal() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function SorteoForm({ sorteo: sorteoFromProp, sorteoId: sorteoIdProp, orgId, userId, onSaved, onCancel }) {
  // Fix edit mode: if we got sorteoId but no sorteo, fetch it
  const [sorteo, setSorteo] = useState(sorteoFromProp || null)
  const [loadingSorteo, setLoadingSorteo] = useState(!sorteoFromProp && !!sorteoIdProp)

  useEffect(() => {
    if (sorteoFromProp || !sorteoIdProp) return
    fetchSorteoById(sorteoIdProp).then(({ data }) => {
      if (data) setSorteo(data)
      setLoadingSorteo(false)
    })
  }, [sorteoIdProp, sorteoFromProp])

  if (loadingSorteo) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <SorteoFormInner sorteo={sorteo} orgId={orgId} userId={userId} onSaved={onSaved} onCancel={onCancel} />
}

function SorteoFormInner({ sorteo, orgId, userId, onSaved, onCancel }) {
  const isEdit = !!sorteo
  const isActive = sorteo?.status === 'active'
  const isReadOnly = sorteo?.status === 'closed' || sorteo?.status === 'drawn'

  const [form, setForm] = useState(() => {
    if (!sorteo) return { ...DEFAULT_FORM, start_date: todayLocal() }
    return {
      title: sorteo.title || '', description: sorteo.description || '', cause: sorteo.cause || '',
      total_boletos: String(sorteo.total_boletos || 500),
      price_per_boleto: String(sorteo.price_per_boleto || 50),
      start_date: sorteo.start_date ? sorteo.start_date.slice(0, 10) : '',
      end_date: sorteo.end_date ? sorteo.end_date.slice(0, 10) : '',
      drawing_date: sorteo.drawing_date ? sorteo.drawing_date.slice(0, 10) : '',
      permit_number: sorteo.permit_number || '',
    }
  })

  const [isGiveaway, setIsGiveaway] = useState(() => isEdit ? Number(sorteo.price_per_boleto) === 0 : false)
  const [prizes, setPrizes] = useState([{ ...EMPTY_PRIZE }])
  const [loadingPrizes, setLoadingPrizes] = useState(isEdit)
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Load prizes and images for edit mode
  useEffect(() => {
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
    fetchSorteoImages(sorteo.id).then(({ data }) => {
      if (data && data.length > 0) {
        setImages(data.map(img => ({
          storage_path: img.storage_path,
          preview: null,
          file: null,
        })))
      }
      setLoadingImages(false)
    })
  }, [isEdit, sorteo?.id])

  function handleField(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  function handleGiveawayToggle(e) {
    const checked = e.target.checked
    setIsGiveaway(checked)
    setForm(f => ({ ...f, price_per_boleto: checked ? '0' : '50' }))
  }

  function handlePrizeField(index, field, value) {
    setPrizes(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u })
  }
  function addPrize() { setPrizes(prev => [...prev, { ...EMPTY_PRIZE }]) }
  function removePrize(index) { setPrizes(prev => prev.filter((_, i) => i !== index)) }

  function validate() {
    if (!form.title.trim()) return 'El título es requerido.'
    if (form.title.length > 100) return 'El título no debe superar 100 caracteres.'
    if (!form.description.trim()) return 'La descripción es requerida.'
    if (form.description.length > 2000) return 'La descripción no debe superar 2000 caracteres.'
    if (!form.total_boletos || Number(form.total_boletos) < 10) return 'El mínimo de boletos es 10.'
    if (Number(form.total_boletos) > 10000) return 'El máximo de boletos es 10,000.'
    if (!isGiveaway && (form.price_per_boleto === '' || Number(form.price_per_boleto) < 1))
      return 'El precio por boleto debe ser al menos $1 MXN.'
    if (!form.end_date) return 'La fecha de cierre es requerida.'
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date)
      const end = new Date(form.end_date)
      const diff = (end - start) / (1000 * 60 * 60)
      if (diff < 24) return 'La fecha de cierre debe ser al menos 24 horas después del inicio.'
    }
    if (form.drawing_date && form.end_date && new Date(form.drawing_date) < new Date(form.end_date))
      return 'La fecha del sorteo debe ser igual o posterior al cierre.'
    for (let i = 0; i < prizes.length; i++) {
      if (!prizes[i].title.trim()) return `Premio ${i + 1}: el título es requerido.`
    }
    return null
  }

  async function uploadImages(sorteoId) {
    const uploaded = []
    for (const img of images) {
      if (img.storage_path) {
        uploaded.push({ storage_path: img.storage_path })
      } else if (img.file) {
        setStep(`Subiendo imagen ${uploaded.length + 1}...`)
        const { path, error } = await uploadSorteoImage(orgId, sorteoId, img.file)
        if (error) console.warn('[SorteoForm] Image upload error:', error)
        if (path) uploaded.push({ storage_path: path })
      }
    }
    return uploaded
  }

  async function handleSave(publish = false) {
    setError(null)
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSaving(true); setStep('Guardando sorteo...')
    try {
      let sorteoId
      const formData = { ...form }
      if (isGiveaway) formData.price_per_boleto = '0'
      if (!formData.drawing_date && formData.end_date) formData.drawing_date = formData.end_date

      if (isEdit) {
        // Active sorteos: only update editable fields
        const updates = isActive
          ? { description: formData.description, cause: formData.cause, permit_number: formData.permit_number }
          : formData
        const { data, error } = await updateSorteo(sorteo.id, updates)
        if (error) throw error
        sorteoId = data.id
      } else {
        const { data, error } = await createSorteo(orgId, userId, formData)
        if (error) throw error
        sorteoId = data.id
      }

      // Upload images
      setStep('Subiendo imágenes...')
      const uploadedImages = await uploadImages(sorteoId)
      if (uploadedImages.length > 0 || (isEdit && images.length === 0)) {
        await saveSorteoImages(sorteoId, orgId, uploadedImages)
      }

      // Save prizes
      setStep('Guardando premios...')
      const validPrizes = prizes.filter(p => p.title.trim())
      if (validPrizes.length > 0) {
        const { error: prizeError } = await savePrizes(sorteoId, orgId, validPrizes)
        if (prizeError) console.warn('[SorteoForm] Prize save error:', prizeError)
      }

      // Publish flow: generate boletos + activate
      if (publish && !isEdit) {
        setStep(`Generando ${Number(form.total_boletos).toLocaleString('es-MX')} boletos...`)
        const { error: genError } = await generateBoletos(sorteoId)
        if (genError) throw new Error(`Sorteo creado pero error generando boletos: ${genError.message}`)

        setStep('Activando sorteo...')
        const { error: transError } = await transitionSorteoStatus(sorteoId, 'active')
        if (transError) console.warn('[SorteoForm] Activation error:', transError)
      }

      onSaved(sorteoId)
    } catch (err) {
      console.error('[SorteoForm] Save error:', err)
      setError(err.message || 'Error al guardar el sorteo.')
    } finally {
      setSaving(false); setStep(null)
    }
  }

  function handlePublish() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setConfirm({
      title: '¿Publicar este sorteo?',
      message: 'Una vez publicado, no podrás cambiar el precio, la cantidad de boletos, ni las fechas. Podrás editar la descripción e imágenes.',
      warning: 'Esta acción generará los boletos y activará el sorteo.',
      confirmLabel: 'Publicar',
      onConfirm: () => handleSave(true),
    })
  }

  const isBusy = saving
  const totalBoletos = Number(form.total_boletos) || 0
  const price = Number(form.price_per_boleto) || 0
  const totalRevenue = totalBoletos * price

  // Build preview data
  const previewData = {
    title: form.title || 'Sin título',
    description: form.description,
    cause: form.cause,
    total_boletos: totalBoletos,
    price_per_boleto: price,
    start_date: form.start_date,
    end_date: form.end_date,
    drawing_date: form.drawing_date || form.end_date,
    permit_number: form.permit_number,
    status: 'active',
    boletos_sold: 0,
    boletos_available: totalBoletos,
    pct_sold: 0,
    prizes: prizes.filter(p => p.title.trim()),
    images,
  }

  if (isReadOnly) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Este sorteo ya no se puede editar ({sorteo.status === 'closed' ? 'cerrado' : 'sorteado'}).</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Regresar</Button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={e => { e.preventDefault(); handleSave(false) }} noValidate className="space-y-4">
        <h2 className="text-xl font-bold">{isEdit ? 'Editar Sorteo' : 'Crear Nuevo Sorteo'}</h2>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {isBusy && step && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-800">{step}</AlertDescription>
          </Alert>
        )}

        {/* Información Básica */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Información básica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Título del sorteo <span className="text-red-500">*</span></Label>
              <Input name="title" value={form.title} onChange={handleField} placeholder="Sorteo Primavera 2026"
                disabled={isBusy || isActive} maxLength={100} />
              <div className="flex justify-between">
                {isActive && <p className="text-xs text-amber-600">No se puede modificar después de publicar.</p>}
                <p className="text-xs text-muted-foreground ml-auto">{form.title.length}/100</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Descripción <span className="text-red-500">*</span></Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                name="description" value={form.description} onChange={handleField} rows={5}
                placeholder="Describe tu sorteo: qué se rifa, para qué es, cómo funciona..."
                disabled={isBusy} maxLength={2000} />
              <p className="text-xs text-muted-foreground text-right">{form.description.length}/2000</p>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Causa / Propósito</Label>
              <Input name="cause" value={form.cause} onChange={handleField} placeholder="Fondos para becas estudiantiles" disabled={isBusy} />
              <p className="text-xs text-muted-foreground">Se muestra en la página pública para generar confianza.</p>
            </div>
          </CardContent>
        </Card>

        {/* Imágenes */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Imágenes del premio</CardTitle></CardHeader>
          <CardContent>
            {loadingImages ? (
              <p className="text-muted-foreground text-sm">Cargando imágenes...</p>
            ) : (
              <ImageUploader images={images} onChange={setImages} disabled={isBusy} />
            )}
          </CardContent>
        </Card>

        {/* Configuración */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Configuración del sorteo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-3 rounded-lg border flex items-start gap-3 ${isGiveaway ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-muted/50'}`}>
              <input type="checkbox" role="switch" id="giveawayToggle"
                checked={isGiveaway} onChange={handleGiveawayToggle}
                disabled={isBusy || isActive}
                className="mt-1 h-4 w-4 rounded accent-emerald-600" />
              <div>
                <label htmlFor="giveawayToggle" className="font-medium text-sm cursor-pointer">
                  {isGiveaway
                    ? <><Badge className="bg-emerald-600 hover:bg-emerald-600 mr-2">GRATIS</Badge>Este es un giveaway</>
                    : 'Este es un giveaway (gratuito)'}
                </label>
                {isGiveaway && (
                  <p className="text-emerald-700 text-sm mt-1">Los participantes se registran gratis. Ideal para promociones y giveaways.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Cantidad de boletos <span className="text-red-500">*</span></Label>
                <Input type="number" name="total_boletos" value={form.total_boletos} onChange={handleField}
                  min="10" max="10000" disabled={isBusy || isActive} />
                {isActive && <p className="text-xs text-amber-600">No se puede modificar después de publicar.</p>}
              </div>
              {!isGiveaway && (
                <div className="space-y-2">
                  <Label className="font-medium">Precio por boleto (MXN) <span className="text-red-500">*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">$</span>
                    <Input type="number" name="price_per_boleto" value={form.price_per_boleto} onChange={handleField}
                      min="1" step="1" disabled={isBusy || isActive} className="rounded-l-none rounded-r-none" />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">MXN</span>
                  </div>
                  {isActive && <p className="text-xs text-amber-600">No se puede modificar después de publicar.</p>}
                </div>
              )}
            </div>

            {/* Pricing calculator */}
            {!isGiveaway && totalBoletos > 0 && price > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                Con <strong>{totalBoletos.toLocaleString('es-MX')}</strong> boletos a <strong>{formatMXN(price)}</strong>, recaudarás <strong className="text-primary">{formatMXN(totalRevenue)}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-medium">
                Número de permiso (SEGOB u otro)
                {isGiveaway && <span className="text-muted-foreground font-normal ml-2">(opcional para giveaways)</span>}
              </Label>
              <Input name="permit_number" value={form.permit_number} onChange={handleField}
                placeholder="Ej: SEGOB-DGJ-001/2026" disabled={isBusy} />
            </div>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Fechas</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Fecha de inicio</Label>
                <Input type="date" name="start_date" value={form.start_date} onChange={handleField}
                  min={todayLocal()} disabled={isBusy || isActive} />
                {isActive && <p className="text-xs text-amber-600">No se puede modificar.</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Fecha de cierre <span className="text-red-500">*</span></Label>
                <Input type="date" name="end_date" value={form.end_date} onChange={handleField}
                  min={form.start_date || todayLocal()} disabled={isBusy || isActive} />
                {isActive && <p className="text-xs text-amber-600">No se puede modificar.</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Fecha del sorteo</Label>
                <Input type="date" name="drawing_date" value={form.drawing_date} onChange={handleField}
                  min={form.end_date || form.start_date || todayLocal()} disabled={isBusy || isActive} />
                <p className="text-xs text-muted-foreground">Si se deja vacío, se usa la fecha de cierre.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <Input placeholder="Nombre del premio *" value={prize.title}
                      onChange={e => handlePrizeField(index, 'title', e.target.value)} disabled={isBusy} required />
                  </div>
                  <div>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs">$</span>
                      <Input type="number" placeholder="Valor MXN" value={prize.value_mxn}
                        onChange={e => handlePrizeField(index, 'value_mxn', e.target.value)} disabled={isBusy} className="rounded-l-none" />
                    </div>
                  </div>
                  <div>
                    <Input placeholder="Descripción" value={prize.description}
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

        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(true)} disabled={isBusy}>
            <Eye className="mr-1 h-4 w-4" /> Vista Previa
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" variant="outline" disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {isEdit ? 'Guardar cambios' : 'Guardar Borrador'}
            </Button>
            {!isEdit && (
              <Button type="button" onClick={handlePublish} disabled={isBusy}
                className="bg-primary hover:bg-primary/90">
                <Rocket className="mr-1 h-4 w-4" /> Publicar Sorteo
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa</DialogTitle>
          </DialogHeader>
          <SorteoPreview sorteo={previewData} />
        </DialogContent>
      </Dialog>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
