// src/pages/PublicSorteoPage.jsx
//
// Public-facing page for a single sorteo.
// Accessible without auth: /sorteo/:orgSlug/:sorteoId
//
// Giveaway mode (price_per_boleto === 0):
//   - "GRATIS" badge next to title
//   - Stats: hides "$0.00 por boleto", shows "GRATIS" instead
//   - CTA: "Participar gratis" instead of "Comprar boletos — $X c/u"
//   - Dates: "Cierre de participaciones" instead of "Cierre de ventas"
//   - Closed/drawn labels updated accordingly

import { useState, useEffect }  from 'react'
import { useParams, Link }       from 'react-router-dom'
import { useAuth }               from '../context/AuthContext'
import { fetchPublicSorteo }     from '../lib/participanteApi'
import { PurchaseFlow }          from '../components/participante/PurchaseFlow'
import {
  LoadingSpinner, ErrorMessage, StatusBadge, SalesProgressBar, formatMXN,
} from '../components/shared/UI'

export function PublicSorteoPage() {
  const { orgSlug, sorteoId } = useParams()
  const { user, session }     = useAuth()

  const [sorteo, setSorteo]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [buying, setBuying]   = useState(false)

  async function loadSorteo() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchPublicSorteo(sorteoId)
    if (error) setError('Sorteo no encontrado o no disponible.')
    else setSorteo(data)
    setLoading(false)
  }

  useEffect(() => { loadSorteo() }, [sorteoId])

  if (loading) return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <LoadingSpinner message="Cargando sorteo..." />
    </div>
  )
  if (error) return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3">
      <ErrorMessage message={error} onRetry={loadSorteo} />
    </div>
  )
  if (!sorteo) return null

  const prizes      = Array.isArray(sorteo.prizes) ? sorteo.prizes : []
  const canBuy      = sorteo.status === 'active'
  const isGiveaway  = Number(sorteo.price_per_boleto) === 0

  // ── Purchase / entry flow ──
  if (buying) return (
    <div className="min-vh-100 bg-light">
      <div className="container py-4" style={{ maxWidth: 540 }}>
        <PurchaseFlow
          sorteo={sorteo}
          participanteId={session ? user?.id : null}
          onComplete={() => { loadSorteo() }}
          onBack={() => setBuying(false)}
        />
      </div>
    </div>
  )

  return (
    <div className="min-vh-100 bg-light">
      {/* ── Sticky nav ── */}
      <nav className="navbar navbar-light bg-white border-bottom px-3 py-2">
        <Link to={`/org/${orgSlug}`} className="text-decoration-none text-primary">
          ← {sorteo.org_name}
        </Link>
        <span className="navbar-brand fw-bold mb-0 mx-auto">Rafiki</span>
        <div style={{ width: 80 }} />
      </nav>

      <div className="container py-4" style={{ maxWidth: 640 }}>

        {/* ── Title + status ── */}
        <div className="d-flex justify-content-between align-items-start mb-2 gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h2 className="fw-bold mb-0">{sorteo.title}</h2>
            {isGiveaway && (
              <span className="badge bg-success fs-6">Gratis</span>
            )}
          </div>
          <StatusBadge status={sorteo.status} />
        </div>

        {/* ── Org + permit ── */}
        <p className="text-muted small mb-1">{sorteo.org_name}</p>
        {sorteo.permit_number && (
          <p className="text-muted small mb-3">
            Permiso: <strong>{sorteo.permit_number}</strong>
          </p>
        )}

        {/* ── Cause ── */}
        {sorteo.cause && (
          <div className="alert alert-success py-2 mb-4 d-flex align-items-center gap-2">
            <span>🎯</span>
            <span>{sorteo.cause}</span>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row text-center g-0 mb-3">
              <div className="col-4 border-end">
                <div className="fw-bold fs-5">
                  {Number(sorteo.boletos_sold || 0).toLocaleString('es-MX')}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {isGiveaway ? 'participantes' : 'vendidos'}
                </div>
              </div>
              <div className="col-4 border-end">
                <div className="fw-bold fs-5">
                  {Number(sorteo.boletos_available || 0).toLocaleString('es-MX')}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>disponibles</div>
              </div>
              <div className="col-4">
                {isGiveaway ? (
                  <>
                    <div className="fw-bold fs-5 text-success">GRATIS</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>entrada</div>
                  </>
                ) : (
                  <>
                    <div className="fw-bold fs-5 text-primary">
                      {formatMXN(sorteo.price_per_boleto)}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>por boleto</div>
                  </>
                )}
              </div>
            </div>
            <SalesProgressBar
              pctSold={sorteo.pct_sold}
              boletosSold={sorteo.boletos_sold || 0}
              totalBoletos={sorteo.total_boletos}
            />
          </div>
        </div>

        {/* ── Key dates ── */}
        {(sorteo.drawing_date || sorteo.end_date) && (
          <div className="card mb-4">
            <div className="card-body py-3">
              <div className="row g-2 text-center">
                {sorteo.end_date && (
                  <div className="col-6">
                    <div className="text-muted small">
                      {isGiveaway ? 'Cierre de participaciones' : 'Cierre de ventas'}
                    </div>
                    <div className="fw-medium">
                      {new Date(sorteo.end_date).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                )}
                {sorteo.drawing_date && (
                  <div className="col-6">
                    <div className="text-muted small">Fecha del sorteo</div>
                    <div className="fw-medium">
                      {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Prizes ── */}
        {prizes.length > 0 && (
          <div className="mb-4">
            <h5 className="fw-bold mb-3">Premios</h5>
            <div className="d-flex flex-column gap-3">
              {prizes.map((prize, i) => (
                <div key={prize.id || i} className="card border-0 shadow-sm">
                  <div className="card-body d-flex gap-3 align-items-start">
                    <div
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{ width: 40, height: 40, fontSize: '1.1rem' }}
                    >
                      {prize.position}°
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{prize.title}</div>
                      {prize.description && (
                        <div className="text-muted small">{prize.description}</div>
                      )}
                      {prize.value_mxn && (
                        <div className="text-success small fw-medium mt-1">
                          {formatMXN(prize.value_mxn)}
                        </div>
                      )}
                    </div>
                    {prize.image_url && (
                      <img
                        src={prize.image_url}
                        alt={prize.title}
                        className="rounded"
                        style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {sorteo.description && (
          <div className="mb-4">
            <h5 className="fw-bold mb-2">Acerca de este sorteo</h5>
            <p className="text-muted">{sorteo.description}</p>
          </div>
        )}

        {/* ── Winner (if drawn) ── */}
        {sorteo.status === 'drawn' && sorteo.drawing_result && (
          <div className="alert alert-primary mb-4">
            <h6 className="fw-bold">🎉 Resultado</h6>
            <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(sorteo.drawing_result, null, 2)}
            </pre>
          </div>
        )}

      </div>

      {/* ── Sticky CTA ── */}
      <div
        className="position-sticky bg-white border-top px-3 py-3"
        style={{ bottom: 0, zIndex: 50 }}
      >
        <div className="container" style={{ maxWidth: 640 }}>
          {canBuy ? (
            <button
              className={`btn w-100 ${isGiveaway ? 'btn-success' : 'btn-primary'}`}
              onClick={() => setBuying(true)}
              style={{ minHeight: 52, fontSize: '1rem', fontWeight: 700 }}
            >
              {isGiveaway
                ? 'Participar gratis'
                : `Comprar boletos — ${formatMXN(sorteo.price_per_boleto)} c/u`
              }
            </button>
          ) : (
            <div className="text-center text-muted">
              {sorteo.status === 'closed' && (isGiveaway ? 'Participaciones cerradas' : 'Ventas cerradas')}
              {sorteo.status === 'drawn'  && '✓ Sorteo realizado'}
              {sorteo.status === 'draft'  && 'Próximamente'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
