// src/pages/VendedorDashboard.jsx
//
// Master page for vendedores. Owns all navigation state.
// Views: selector → quicksell → success → history
//
// No router — same pattern as OrgDashboard. React Router comes in Phase 4.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchAssignedSorteos,
  fetchMyVentasBySorteo,
  fetchMyVentasAllSorteos,
  getTodayStats,
} from '../lib/vendedorApi'
import { SorteoSelector } from '../components/vendedor/SorteoSelector'
import { QuickSell }      from '../components/vendedor/QuickSell'
import { SaleSuccess }    from '../components/vendedor/SaleSuccess'
import { SalesHistory }   from '../components/vendedor/SalesHistory'
import { LoadingSpinner, ErrorMessage } from '../components/shared/UI'

const VIEW = {
  SELECTOR: 'selector',
  SELL:     'sell',
  SUCCESS:  'success',
  HISTORY:  'history',
}

export function VendedorDashboard() {
  const { user, signOut } = useAuth()

  const [view, setView]               = useState(VIEW.SELECTOR)
  const [sorteos, setSorteos]         = useState([])
  const [activeSorteo, setActiveSorteo] = useState(null)
  const [lastSale, setLastSale]       = useState(null)
  const [mySales, setMySales]         = useState([]) // sales for active sorteo
  const [allSales, setAllSales]       = useState([]) // for today's stats across sorteos
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // ── Load assigned sorteos and all-time sales on mount ──
  const loadSorteos = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)

    const [sorteosRes, allSalesRes] = await Promise.all([
      fetchAssignedSorteos(user.id),
      fetchMyVentasAllSorteos(user.id),
    ])

    if (sorteosRes.error) setError(sorteosRes.error.message)
    else setSorteos(sorteosRes.data)

    setAllSales(allSalesRes.data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadSorteos() }, [loadSorteos])

  // ── Load sales for a specific sorteo (when entering sell/history view) ──
  async function loadSorteoSales(sorteoId) {
    if (!user?.id) return
    const { data } = await fetchMyVentasBySorteo(user.id, sorteoId)
    setMySales(data || [])
  }

  // ── Select sorteo → enter sell mode ──
  function handleSelectSorteo(sorteo) {
    setActiveSorteo(sorteo)
    loadSorteoSales(sorteo.id)
    setView(VIEW.SELL)
  }

  // ── Sale completed → show success screen ──
  function handleSaleComplete(result) {
    setLastSale(result)
    setView(VIEW.SUCCESS)

    // Optimistically update the allSales count for today's stats
    setAllSales(prev => [
      { id: result.sale_id, amount_mxn: result.amount_mxn, created_at: new Date().toISOString(), payment_status: 'pending' },
      ...prev,
    ])

    // Reload sorteo sales for history accuracy
    if (activeSorteo) loadSorteoSales(activeSorteo.id)
  }

  // ── After success: go back to sell same sorteo ──
  function handleNewSale() {
    setLastSale(null)
    setView(VIEW.SELL)
  }

  // ── After success: go to history ──
  function handleViewHistory() {
    setLastSale(null)
    setView(VIEW.HISTORY)
  }

  // ── Back to selector ──
  function handleBackToSelector() {
    setActiveSorteo(null)
    setMySales([])
    setView(VIEW.SELECTOR)
    // Refresh sorteo stats when returning to selector
    loadSorteos()
  }

  const todayStats = getTodayStats(allSales)

  return (
    <div className="min-vh-100 bg-light">

      {/* ── Navbar ── */}
      <nav
        className="navbar navbar-dark navbar-rafiki px-3 py-2"
        style={{ position: 'sticky', top: 0, zIndex: 100 }}
      >
        <div className="d-flex align-items-center gap-2 w-100">
          {/* Back button (shown in non-selector views) */}
          {view !== VIEW.SELECTOR && (
            <button
              className="btn btn-sm btn-link text-white p-0 me-1"
              onClick={
                view === VIEW.SELL || view === VIEW.SUCCESS
                  ? handleBackToSelector
                  : handleBackToSelector
              }
              style={{ fontSize: '1.3rem', lineHeight: 1, textDecoration: 'none' }}
            >
              ←
            </button>
          )}

          <span className="navbar-brand fw-bold mb-0 me-auto">Rafiki</span>

          {/* History button (shown on sell view) */}
          {view === VIEW.SELL && activeSorteo && (
            <button
              className="btn btn-sm btn-outline-light me-2"
              onClick={() => setView(VIEW.HISTORY)}
              title="Mis ventas"
            >
              📋 {mySales.length}
            </button>
          )}

          <button className="btn btn-sm btn-outline-light" onClick={signOut}>
            Salir
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="container-fluid px-3 py-3">

        {/* SELECTOR */}
        {view === VIEW.SELECTOR && (
          <>
            {loading && <LoadingSpinner message="Cargando sorteos..." />}
            {error   && <ErrorMessage message={error} onRetry={loadSorteos} />}
            {!loading && !error && (
              <SorteoSelector
                sorteos={sorteos}
                todayStats={todayStats}
                onSelectSorteo={handleSelectSorteo}
              />
            )}
          </>
        )}

        {/* QUICK SELL */}
        {view === VIEW.SELL && activeSorteo && (
          <QuickSell
            sorteo={activeSorteo}
            vendedorId={user.id}
            onSaleComplete={handleSaleComplete}
            onBack={handleBackToSelector}
          />
        )}

        {/* SALE SUCCESS */}
        {view === VIEW.SUCCESS && lastSale && (
          <SaleSuccess
            result={lastSale}
            onNewSale={handleNewSale}
            onDone={handleViewHistory}
          />
        )}

        {/* SALES HISTORY */}
        {view === VIEW.HISTORY && activeSorteo && (
          <SalesHistory
            sales={mySales}
            sorteo={activeSorteo}
            onBack={() => setView(VIEW.SELL)}
          />
        )}
      </div>
    </div>
  )
}
