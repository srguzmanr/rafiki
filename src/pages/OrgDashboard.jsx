// src/pages/OrgDashboard.jsx
// Master page for Organizadores.

import { useState, useEffect, useCallback } from 'react'
import { useAuth }                from '../context/AuthContext'
import { fetchSorteosWithStats }  from '../lib/sorteosApi'
import { SorteoList }             from '../components/organizador/SorteoList'
import { SorteoForm }             from '../components/organizador/SorteoForm'
import { SorteoDetail }           from '../components/organizador/SorteoDetail'
import { ReportingDashboard }     from '../components/organizador/ReportingDashboard'
import { LoadingSpinner, ErrorMessage } from '../components/shared/UI'
import { Layout }                 from '../components/shared/Layout'
import { Button }                 from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'

const VIEW = {
  LIST:      'list',
  CREATE:    'create',
  EDIT:      'edit',
  DETAIL:    'detail',
  REPORTING: 'reporting',
}

export function OrgDashboard() {
  const { user, orgId, signOut }  = useAuth()

  const [view, setView]               = useState(VIEW.LIST)
  const [activeSorteoId, setActiveSorteoId] = useState(null)
  const [activeSorteo, setActiveSorteo]     = useState(null)
  const [sorteos, setSorteos]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const loadSorteos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchSorteosWithStats()
    if (error) setError(error.message)
    else setSorteos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (view === VIEW.LIST) loadSorteos()
  }, [view, loadSorteos])

  function handleViewDetail(sorteoId) {
    setActiveSorteoId(sorteoId)
    setActiveSorteo(sorteos.find(s => s.id === sorteoId) || null)
    setView(VIEW.DETAIL)
  }

  function handleEdit(sorteoId) {
    setActiveSorteoId(sorteoId)
    setView(VIEW.EDIT)
  }

  function handleSaved(sorteoId) {
    setActiveSorteoId(sorteoId)
    setView(VIEW.DETAIL)
  }

  function handleOpenReporting(sorteo) {
    setActiveSorteo(sorteo)
    setView(VIEW.REPORTING)
  }

  function handleBackToList() {
    setActiveSorteoId(null)
    setActiveSorteo(null)
    setView(VIEW.LIST)
  }

  function handleBackToDetail() {
    setView(VIEW.DETAIL)
  }

  const navActions = view === VIEW.LIST ? (
    <Button size="sm" variant="outline" onClick={() => setView(VIEW.CREATE)}
      className="text-white border-white/30 hover:bg-white/10">
      <Plus className="mr-1 h-4 w-4" /> Nuevo sorteo
    </Button>
  ) : (
    <Button size="sm" variant="ghost" onClick={handleBackToList}
      className="text-white hover:bg-white/10">
      <ArrowLeft className="mr-1 h-4 w-4" /> Sorteos
    </Button>
  )

  return (
    <Layout title="Organizador" actions={navActions}>
      <div className="w-full px-3 py-4 max-w-[900px] mx-auto">

        {view === VIEW.LIST && (
          <>
            {loading && <LoadingSpinner message="Cargando sorteos..." />}
            {error   && <ErrorMessage message={error} onRetry={loadSorteos} />}
            {!loading && !error && (
              <SorteoList
                sorteos={sorteos}
                onViewDetail={handleViewDetail}
                onEdit={handleEdit}
                onRefresh={loadSorteos}
              />
            )}
          </>
        )}

        {view === VIEW.CREATE && (
          <SorteoForm
            orgId={orgId}
            userId={user?.id}
            onSaved={handleSaved}
            onCancel={handleBackToList}
          />
        )}

        {view === VIEW.EDIT && activeSorteoId && (
          <SorteoForm
            orgId={orgId}
            userId={user?.id}
            sorteoId={activeSorteoId}
            onSaved={handleSaved}
            onCancel={() => setView(VIEW.DETAIL)}
          />
        )}

        {view === VIEW.DETAIL && activeSorteoId && (
          <SorteoDetail
            sorteoId={activeSorteoId}
            orgId={orgId}
            userId={user?.id}
            onEdit={handleEdit}
            onBack={handleBackToList}
            onOpenReporting={handleOpenReporting}
          />
        )}

        {view === VIEW.REPORTING && activeSorteo && (
          <ReportingDashboard
            sorteo={activeSorteo}
            onBack={handleBackToDetail}
          />
        )}
      </div>
    </Layout>
  )
}
