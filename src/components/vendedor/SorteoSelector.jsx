// src/components/vendedor/SorteoSelector.jsx

import { formatMXN, SalesProgressBar } from '../shared/UI'

export function SorteoSelector({ sorteos, todayStats, onSelectSorteo }) {
  const allGiveaways = sorteos.length > 0 && sorteos.every(s => Number(s.price_per_boleto) === 0)

  return (
    <div className="max-w-[480px] mx-auto">
      {/* Today's stats banner */}
      <div className="bg-primary text-white rounded-xl p-4 mb-4">
        <div className={`flex ${allGiveaways ? 'justify-center' : ''} text-center gap-4`}>
          <div className={allGiveaways ? '' : 'flex-1'}>
            <div className="text-4xl font-bold">{todayStats.count}</div>
            <div className="text-sm opacity-85">{allGiveaways ? 'registros hoy' : 'ventas hoy'}</div>
          </div>
          {!allGiveaways && (
            <div className="flex-1 border-l border-white/25 pl-4">
              <div className="text-4xl font-bold">{formatMXN(todayStats.amount_mxn)}</div>
              <div className="text-sm opacity-85">recaudado hoy</div>
            </div>
          )}
        </div>
      </div>

      <h6 className="text-muted-foreground uppercase mb-3 tracking-wider text-xs font-medium">
        Mis sorteos activos
      </h6>

      {sorteos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl">🎟️</div>
          <p className="text-muted-foreground mt-2">No tienes sorteos activos asignados.</p>
          <p className="text-muted-foreground text-sm">Pide a tu coordinador que te asigne a un sorteo.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorteos.map(sorteo => (
          <button
            key={sorteo.id}
            className="w-full text-left bg-card border rounded-xl p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => onSelectSorteo(sorteo)}
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="font-bold">{sorteo.title}</div>
                {sorteo.cause && <div className="text-muted-foreground text-sm"><em>{sorteo.cause}</em></div>}
              </div>
              <div className="text-right ml-2 shrink-0">
                {Number(sorteo.price_per_boleto) === 0 ? (
                  <div className="font-bold text-emerald-600 text-lg">GRATIS</div>
                ) : (
                  <>
                    <div className="font-bold text-primary text-lg">{formatMXN(sorteo.price_per_boleto)}</div>
                    <div className="text-muted-foreground text-[0.7rem]">por boleto</div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2">
              <SalesProgressBar pctSold={sorteo.pct_sold} boletosSold={sorteo.boletos_sold} totalBoletos={sorteo.total_boletos} />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground text-sm">{Number(sorteo.boletos_available).toLocaleString('es-MX')} disponibles</span>
              <span className="text-primary text-sm font-medium">{Number(sorteo.price_per_boleto) === 0 ? 'Registrar →' : 'Vender →'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
