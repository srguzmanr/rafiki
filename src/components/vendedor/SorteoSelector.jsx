// src/components/vendedor/SorteoSelector.jsx
//
// The vendedor's home screen: their assigned active sorteos.
// One tap → opens QuickSell for that sorteo.
// Designed for glanceability on a phone screen.
//
// Props:
//   sorteos      — array of assigned active sorteos
//   todayStats   — { count, amount_mxn } for the header
//   onSelectSorteo(sorteo) — enter QuickSell mode

import { formatMXN, SalesProgressBar } from '../shared/UI'

export function SorteoSelector({ sorteos, todayStats, onSelectSorteo }) {
  const allGiveaways = sorteos.length > 0 && sorteos.every(s => Number(s.price_per_boleto) === 0)
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Today's stats banner */}
      <div className="bg-primary text-white rounded-3 p-3 mb-4">
        <div className="row text-center g-0">
          <div className={allGiveaways ? "col-12 text-center" : "col-6 border-end border-white border-opacity-25"}>
            <div className="fs-2 fw-bold">{todayStats.count}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              {allGiveaways ? 'registros hoy' : 'ventas hoy'}
            </div>
          </div>
          {!allGiveaways && (
            <div className="col-6">
              <div className="fs-2 fw-bold">{formatMXN(todayStats.amount_mxn)}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>recaudado hoy</div>
            </div>
          )}
        </div>
      </div>

      {/* Section header */}
      <h6 className="text-muted text-uppercase mb-3" style={{ letterSpacing: 1, fontSize: '0.75rem' }}>
        Mis sorteos activos
      </h6>

      {/* No sorteos state */}
      {sorteos.length === 0 && (
        <div className="text-center py-5">
          <div style={{ fontSize: '3rem' }}>🎟️</div>
          <p className="text-muted mt-2">
            No tienes sorteos activos asignados.
          </p>
          <p className="text-muted small">
            Pide a tu coordinador que te asigne a un sorteo.
          </p>
        </div>
      )}

      {/* Sorteo cards — tap to sell */}
      <div className="d-flex flex-column gap-3">
        {sorteos.map(sorteo => (
          <button
            key={sorteo.id}
            className="card border-0 shadow-sm text-start w-100 p-0"
            style={{
              background: 'white',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'transform 0.1s, box-shadow 0.1s',
              minHeight: 100,
            }}
            onClick={() => onSelectSorteo(sorteo)}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="card-body px-3 py-3">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <div>
                  <div className="fw-bold" style={{ fontSize: '1rem' }}>{sorteo.title}</div>
                  {sorteo.cause && (
                    <div className="text-muted small"><em>{sorteo.cause}</em></div>
                  )}
                </div>
                <div className="text-end ms-2 flex-shrink-0">
                  {Number(sorteo.price_per_boleto) === 0 ? (
                    <div className="fw-bold text-success" style={{ fontSize: '1.1rem' }}>GRATIS</div>
                  ) : (
                    <>
                      <div className="fw-bold text-primary" style={{ fontSize: '1.1rem' }}>
                        {formatMXN(sorteo.price_per_boleto)}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>por boleto</div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <SalesProgressBar
                  pctSold={sorteo.pct_sold}
                  boletosSold={sorteo.boletos_sold}
                  totalBoletos={sorteo.total_boletos}
                />
              </div>

              {/* CTA hint */}
              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className="text-muted small">
                  {Number(sorteo.boletos_available).toLocaleString('es-MX')} disponibles
                </span>
                <span className="text-primary small fw-medium">
                  {Number(sorteo.price_per_boleto) === 0 ? 'Registrar →' : 'Vender →'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
