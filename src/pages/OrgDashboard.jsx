// src/pages/OrgDashboard.jsx
// Master page for Organizadores.
// Views: LIST, CREATE, EDIT, DETAIL, REPORTING

import { useState, useEffect, useCallback } from 'react'
import { useAuth }                from '../context/AuthContext'
import { fetchSorteosWithStats }  from '../lib/sorteosApi'
import { SorteoList }             from '../components/organizador/SorteoList'
import { SorteoForm }             from '../components/organizador/SorteoForm'
import { SorteoDetail }           from '../components/organizador/SorteoDetail'
import { ReportingDashboard }     from '../components/organizador/ReportingDashboard'
import { LoadingSpinner, ErrorMessage } from '../components/shared/UI'

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

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-3 py-2">
        <div className="d-flex align-items-center gap-2 w-100">
          {view !== VIEW.LIST && (
            <button
              className="btn btn-sm btn-link text-white p-0 me-1"
              onClick={handleBackToList}
              style={{ fontSize: '1.3rem', lineHeight: 1, textDecoration: 'none' }}
            >←</button>
          )}
          <span className="navbar-brand fw-bold mb-0 me-auto">Rafiki</span>
          {view === VIEW.LIST && (
            <button
              className="btn btn-sm btn-outline-light me-2"
              onClick={() => setView(VIEW.CREATE)}
            >+ Nuevo sorteo</button>
          )}
          <button className="btn btn-sm btn-outline-light" onClick={signOut}>Salir</button>
        </div>
      </nav>

      <div className="container-fluid px-3 py-4" style={{ maxWidth: 900 }}>

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
    </div>
  )
}
