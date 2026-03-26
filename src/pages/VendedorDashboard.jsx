// src/pages/VendedorDashboard.jsx

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchAssignedSorteos, fetchMyVentasBySorteo, fetchMyVentasAllSorteos, getTodayStats } from '../lib/vendedorApi'
import { SorteoSelector } from '../components/vendedor/SorteoSelector'
import { QuickSell }      from '../components/vendedor/QuickSell'
import { SaleSuccess }    from '../components/vendedor/SaleSuccess'
import { SalesHistory }   from '../components/vendedor/SalesHistory'
import { LoadingSpinner, ErrorMessage } from '../components/shared/UI'
import { Layout }          from '../components/shared/Layout'
import { Button }          from '@/components/ui/button'
import { ArrowLeft, ClipboardList } from 'lucide-react'

const VIEW = { SELECTOR: 'selector', SELL: 'sell', SUCCESS: 'success', HISTORY: 'history' }

export function VendedorDashboard() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState(VIEW.SELECTOR)
  const [sorteos, setSorteos] = useState([])
  const [activeSorteo, setActiveSorteo] = useState(null)
  const [lastSale, setLastSale] = useState(null)
  const [mySales, setMySales] = useState([])
  const [allSales, setAllSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSorteos = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setError(null)
    const [sorteosRes, allSalesRes] = await Promise.all([
      fetchAssignedSorteos(user.id), fetchMyVentasAllSorteos(user.id),
    ])
    if (sorteosRes.error) setError(sorteosRes.error.message)
    else setSorteos(sorteosRes.data)
    setAllSales(allSalesRes.data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadSorteos() }, [loadSorteos])

  async function loadSorteoSales(sorteoId) {
    if (!user?.id) return
    const { data } = await fetchMyVentasBySorteo(user.id, sorteoId)
    setMySales(data || [])
  }

  function handleSelectSorteo(sorteo) {
    setActiveSorteo(sorteo); loadSorteoSales(sorteo.id); setView(VIEW.SELL)
  }

  function handleSaleComplete(result) {
    setLastSale(result); setView(VIEW.SUCCESS)
    setAllSales(prev => [
      { id: result.sale_id, amount_mxn: result.amount_mxn, created_at: new Date().toISOString(), payment_status: 'pending' },
      ...prev,
    ])
    if (activeSorteo) loadSorteoSales(activeSorteo.id)
  }

  function handleNewSale() { setLastSale(null); setView(VIEW.SELL) }
  function handleViewHistory() { setLastSale(null); setView(VIEW.HISTORY) }

  function handleBackToSelector() {
    setActiveSorteo(null); setMySales([]); setView(VIEW.SELECTOR); loadSorteos()
  }

  const todayStats = getTodayStats(allSales)

  const navActions = (
    <div className="flex items-center gap-2">
      {view !== VIEW.SELECTOR && (
        <Button size="sm" variant="ghost" onClick={handleBackToSelector}
          className="text-white hover:bg-white/10">
          <ArrowLeft className="mr-1 h-4 w-4" /> Sorteos
        </Button>
      )}
      {view === VIEW.SELL && activeSorteo && (
        <Button size="sm" variant="outline" onClick={() => setView(VIEW.HISTORY)}
          className="text-white border-white/30 hover:bg-white/10">
          <ClipboardList className="mr-1 h-4 w-4" /> {mySales.length}
        </Button>
      )}
    </div>
  )

  return (
    <Layout title="Vendedor" actions={navActions}>
      <div className="w-full px-3 py-3">
        {view === VIEW.SELECTOR && (
          <>
            {loading && <LoadingSpinner message="Cargando sorteos..." />}
            {error && <ErrorMessage message={error} onRetry={loadSorteos} />}
            {!loading && !error && (
              <SorteoSelector sorteos={sorteos} todayStats={todayStats} onSelectSorteo={handleSelectSorteo} />
            )}
          </>
        )}
        {view === VIEW.SELL && activeSorteo && (
          <QuickSell sorteo={activeSorteo} vendedorId={user.id} onSaleComplete={handleSaleComplete} onBack={handleBackToSelector} />
        )}
        {view === VIEW.SUCCESS && lastSale && (
          <SaleSuccess result={lastSale} onNewSale={handleNewSale} onDone={handleViewHistory} />
        )}
        {view === VIEW.HISTORY && activeSorteo && (
          <SalesHistory sales={mySales} sorteo={activeSorteo} onBack={() => setView(VIEW.SELL)} />
        )}
      </div>
    </Layout>
  )
}
