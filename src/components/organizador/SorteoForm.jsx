// src/components/sorteos/SorteoForm.jsx
// Create or edit a sorteo. Handles the full form including prizes.
// After creation, automatically triggers boleto generation.
//
// Props:
//   sorteo   — existing sorteo object (edit mode) or null (create mode)
//   orgId    — current user's organization_id
//   userId   — current user's profile id
//   onSaved  — callback(sorteoId) called after successful save
//   onCancel — callback to close/navigate away

import { useState } from 'react'
import { createSorteo, updateSorteo, generateBoletos, savePrizes, fetchPrizes } from '../../lib/sorteosApi'

const EMPTY_PRIZE = { title: '', description: '', value_mxn: '', image_url: '' }

const DEFAULT_FORM = {
  title:            '',
  description:      '',
  cause:            '',
  total_boletos:    '40000',
  price_per_boleto: '300',
  start_date:       '',
  end_date:         '',
  drawing_date:     '',
  permit_number:    '',
}

export function SorteoForm({ sorteo, orgId, userId, onSaved, onCancel }) {
  const isEdit = !!sorteo

  const [form, setForm] = useState(() => {
    if (!sorteo) return DEFAULT_FORM
    return {
      title:            sorteo.title || '',
      description:      sorteo.description || '',
      cause:            sorteo.cause || '',
      total_boletos:    String(sorteo.total_boletos || 40000),
      price_per_boleto: String(sorteo.price_per_boleto || 300),
      start_date:       sorteo.start_date ? sorteo.start_date.slice(0, 16) : '',
      end_date:         sorteo.end_date   ? sorteo.end_date.slice(0, 16)   : '',
      drawing_date:     sorteo.drawing_date ? sorteo.drawing_date.slice(0, 16) : '',
      permit_number:    sorteo.permit_number || '',
    }
  })

  const [prizes, setPrizes] = useState([{ ...EMPTY_PRIZE }])
  const [loadingPrizes, setLoadingPrizes] = useState(isEdit)

  // Load existing prizes in edit mode
  useState(() => {
    if (!isEdit) return
    fetchPrizes(sorteo.id).then(({ data }) => {
      if (data && data.length > 0) {
        setPrizes(data.map(p => ({
          title:       p.title,
          description: p.description || '',
          value_mxn:   p.value_mxn ? String(p.value_mxn) : '',
          image_url:   p.image_url || '',
        })))
      }
      setLoadingPrizes(false)
    })
  }, [])

  const [saving, setSaving]         = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)
  const [step, setStep]             = useState(null) // 'saving' | 'generating'

  function handleField(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handlePrizeField(index, field, value) {
    setPrizes(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function addPrize() {
    setPrizes(prev => [...prev, { ...EMPTY_PRIZE }])
  }

  function removePrize(index) {
    setPrizes(prev => prev.filter((_, i) => i !== index))
  }

  // Validation
  function validate() {
    if (!form.title.trim())               return 'El título es requerido.'
    if (!form.total_boletos || Number(form.total_boletos) < 1)
                                          return 'El número de boletos debe ser mayor a 0.'
    if (Number(form.total_boletos) > 500000)
                                          return 'El máximo de boletos es 500,000.'
    if (!form.price_per_boleto || Number(form.price_per_boleto) < 0)
                                          return 'El precio por boleto es requerido.'
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date))
                                          return 'La fecha de cierre debe ser posterior a la de apertura.'
    for (let i = 0; i < prizes.length; i++) {
      if (!prizes[i].title.trim())        return `Premio ${i + 1}: el título es requerido.`
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setStep('saving')

    try {
      let sorteoId

      if (isEdit) {
        // Update existing sorteo
        // Cannot change total_boletos if boletos already generated
        const { data, error } = await updateSorteo(sorteo.id, form)
        if (error) throw error
        sorteoId = data.id
      } else {
        // Create new sorteo
        const { data, error } = await createSorteo(orgId, userId, form)
        if (error) throw error
        sorteoId = data.id

        // Generate boletos immediately after creation
        setStep('generating')
        setGenerating(true)

        const { error: genError } = await generateBoletos(sorteoId)
        if (genError) throw new Error(`Sorteo creado pero ocurrió un error generando boletos: ${genError.message}`)
      }

      // Save prizes
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
      setSaving(false)
      setGenerating(false)
      setStep(null)
    }
  }

  const isBusy = saving || generating

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* ── Step indicator (create mode only) ── */}
      {!isEdit && isBusy && (
        <div className="alert alert-info d-flex align-items-center mb-4">
          <div className="spinner-border spinner-border-sm me-3" />
          {step === 'saving'
            ? 'Guardando sorteo...'
            : `Generando ${Number(form.total_boletos).toLocaleString('es-MX')} boletos... (esto toma unos segundos)`
          }
        </div>
      )}

      {/* ── Basic info ── */}
      <div className="card mb-4">
        <div className="card-header"><h6 className="mb-0">Información del sorteo</h6></div>
        <div className="card-body">

          <div className="mb-3">
            <label className="form-label fw-medium">Título <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              name="title"
              value={form.title}
              onChange={handleField}
              placeholder="Sorteo Primavera 2026"
              disabled={isBusy}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Descripción</label>
            <textarea
              className="form-control"
              name="description"
              value={form.description}
              onChange={handleField}
              rows={3}
              placeholder="Descripción del sorteo..."
              disabled={isBusy}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Causa / Propósito</label>
            <input
              type="text"
              className="form-control"
              name="cause"
              value={form.cause}
              onChange={handleField}
              placeholder="Fondos para becas estudiantiles"
              disabled={isBusy}
            />
            <div className="form-text">Se muestra en la página pública del sorteo para generar confianza.</div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Número de permiso (SEGOB u otro)</label>
            <input
              type="text"
              className="form-control"
              name="permit_number"
              value={form.permit_number}
              onChange={handleField}
              placeholder="20250250PS00"
              disabled={isBusy}
            />
            <div className="form-text">Se muestra públicamente para legitimidad regulatoria.</div>
          </div>
        </div>
      </div>

      {/* ── Boletos y precio ── */}
      <div className="card mb-4">
        <div className="card-header"><h6 className="mb-0">Boletos y precio</h6></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-medium">
                Total de boletos <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className="form-control"
                name="total_boletos"
                value={form.total_boletos}
                onChange={handleField}
                min="1"
                max="500000"
                // Disable changing total in edit mode if boletos already exist
                disabled={isBusy || (isEdit && sorteo?.boletos_sold > 0)}
              />
              {isEdit && sorteo?.boletos_sold > 0 && (
                <div className="form-text text-warning">
                  No se puede cambiar después de haber ventas.
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium">
                Precio por boleto (MXN) <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  name="price_per_boleto"
                  value={form.price_per_boleto}
                  onChange={handleField}
                  min="0"
                  step="0.01"
                  disabled={isBusy}
                />
                <span className="input-group-text">MXN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fechas ── */}
      <div className="card mb-4">
        <div className="card-header"><h6 className="mb-0">Fechas</h6></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-medium">Inicio de ventas</label>
              <input
                type="datetime-local"
                className="form-control"
                name="start_date"
                value={form.start_date}
                onChange={handleField}
                disabled={isBusy}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium">Cierre de ventas</label>
              <input
                type="datetime-local"
                className="form-control"
                name="end_date"
                value={form.end_date}
                onChange={handleField}
                disabled={isBusy}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium">Fecha del sorteo</label>
              <input
                type="datetime-local"
                className="form-control"
                name="drawing_date"
                value={form.drawing_date}
                onChange={handleField}
                disabled={isBusy}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Premios ── */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Premios</h6>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={addPrize}
            disabled={isBusy || loadingPrizes}
          >
            + Agregar premio
          </button>
        </div>
        <div className="card-body">
          {loadingPrizes && <p className="text-muted small">Cargando premios...</p>}

          {!loadingPrizes && prizes.map((prize, index) => (
            <div key={index} className="border rounded p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong className="text-muted small">
                  Premio {index + 1} {index === 0 ? '(1er lugar)' : ''}
                </strong>
                {prizes.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removePrize(index)}
                    disabled={isBusy}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Título del premio *"
                    value={prize.title}
                    onChange={e => handlePrizeField(index, 'title', e.target.value)}
                    disabled={isBusy}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Valor MXN"
                      value={prize.value_mxn}
                      onChange={e => handlePrizeField(index, 'value_mxn', e.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <input
                    type="url"
                    className="form-control"
                    placeholder="URL de imagen"
                    value={prize.image_url}
                    onChange={e => handlePrizeField(index, 'image_url', e.target.value)}
                    disabled={isBusy}
                  />
                </div>
                <div className="col-12">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Descripción del premio"
                    value={prize.description}
                    onChange={e => handlePrizeField(index, 'description', e.target.value)}
                    disabled={isBusy}
                  />
                </div>
              </div>
            </div>
          ))}

          {!loadingPrizes && prizes.length === 0 && (
            <p className="text-muted small mb-0">
              Sin premios aún. Agrega al menos uno.
            </p>
          )}
        </div>
      </div>

      {/* ── Acciones ── */}
      <div className="d-flex gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isBusy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isBusy}
        >
          {isBusy
            ? <><span className="spinner-border spinner-border-sm me-2" />{step === 'generating' ? 'Generando boletos...' : 'Guardando...'}</>
            : isEdit ? 'Guardar cambios' : 'Crear sorteo'
          }
        </button>
      </div>
    </form>
  )
}
