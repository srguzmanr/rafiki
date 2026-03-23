// src/pages/PublicOrgPage.jsx
//
// Public page listing all active sorteos for an organization.
// URL: /#/org/:orgSlug
// No auth required. Shareable link for the org to send to buyers.

import { useState, useEffect }       from 'react'
import { useParams, Link }           from 'react-router-dom'
import { fetchPublicSorteosByOrg }   from '../lib/participanteApi'
import { LoadingSpinner, ErrorMessage, StatusBadge, SalesProgressBar, formatMXN } from '../components/shared/UI'

export function PublicOrgPage() {
  const { orgSlug }             = useParams()
  const [sorteos, setSorteos]   = useState([])
  const [orgName, setOrgName]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchPublicSorteosByOrg(orgSlug)
    if (error) {
      setError('No se pudo cargar la información.')
    } else {
      setSorteos(data)
      if (data.length > 0) setOrgName(data[0].org_name)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [orgSlug])

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-light bg-white border-bottom px-4 py-3">
        <span className="navbar-brand fw-bold mb-0">Rafiki</span>
      </nav>

      <div className="container py-4" style={{ maxWidth: 700 }}>

        {orgName && (
          <div className="mb-4">
            <h3 className="fw-bold mb-0">{orgName}</h3>
            <p className="text-muted">Sorteos activos</p>
          </div>
        )}

        {loading && <LoadingSpinner message="Cargando sorteos..." />}
        {error   && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && sorteos.length === 0 && (
          <div className="text-center py-5">
            <div style={{ fontSize: '3rem' }}>🎟️</div>
            <p className="text-muted mt-2">No hay sorteos activos en este momento.</p>
          </div>
        )}

        <div className="d-flex flex-column gap-3">
          {sorteos.map(sorteo => (
            <Link
              key={sorteo.id}
              to={`/sorteo/${orgSlug}/${sorteo.id}`}
              className="text-decoration-none"
            >
              <div className="card shadow-sm border-0" style={{ borderRadius: 12 }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold mb-0 text-dark">{sorteo.title}</h5>
                    <StatusBadge status={sorteo.status} />
                  </div>

                  {sorteo.cause && (
                    <p className="text-muted small mb-2"><em>{sorteo.cause}</em></p>
                  )}

                  {/* Prize preview */}
                  {Array.isArray(sorteo.prizes) && sorteo.prizes.length > 0 && (
                    <div className="mb-2">
                      <span className="badge bg-light text-dark border me-1">
                        🏆 {sorteo.prizes[0]?.title}
                      </span>
                      {sorteo.prizes.length > 1 && (
                        <span className="text-muted small">
                          + {sorteo.prizes.length - 1} premios más
                        </span>
                      )}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    {Number(sorteo.price_per_boleto) === 0
                      ? <span className="badge bg-success fs-6 px-2 py-1">GRATIS</span>
                      : <span className="text-primary fw-bold">{formatMXN(sorteo.price_per_boleto)}</span>
                    }
                    {sorteo.drawing_date && (
                      <span className="text-muted small">
                        Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>

                  <SalesProgressBar
                    pctSold={sorteo.pct_sold}
                    boletosSold={sorteo.boletos_sold || 0}
                    totalBoletos={sorteo.total_boletos}
                  />

                  {sorteo.status === 'active' && (
                    <div className="text-end mt-2">
                      <span className="text-primary small fw-medium">
                        {Number(sorteo.price_per_boleto) === 0 ? 'Ver y participar →' : 'Ver y comprar →'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
