// src/App.jsx
// Root component with React Router (hash router for GitHub Pages static hosting).
//
// Route structure:
//   /                    → role-based: login | org dashboard | vendedor | participante redirect
//   /org/:orgSlug        → public org sorteo listing (no auth required)
//   /sorteo/:orgSlug/:id → public sorteo detail + buy (no auth required)
//   /mis-boletos         → participante "My Boletos" (shows login if not authed)

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import { Login }                 from './pages/Login'
import { OrgDashboard }          from './pages/OrgDashboard'
import { VendedorDashboard }     from './pages/VendedorDashboard'
import { ParticipanteDashboard } from './pages/ParticipanteDashboard'
import { AdminDashboard }        from './pages/AdminDashboard'
import { PublicOrgPage }         from './pages/PublicOrgPage'
import { PublicSorteoPage }      from './pages/PublicSorteoPage'
import { LoadingSpinner }        from './components/shared/UI'

function HomeRoute() {
  const { session, role, loading } = useAuth()

  if (loading) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <LoadingSpinner message="Iniciando Rafiki..." />
    </div>
  )

  if (!session) return <Login />

  switch (role) {
    case 'admin':        return <AdminDashboard />
    case 'organizador':  return <OrgDashboard />
    case 'vendedor':     return <VendedorDashboard />
    case 'participante': return <Navigate to="/mis-boletos" replace />
    default:
      return (
        <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
          <div className="alert alert-warning text-center">
            Tu cuenta no tiene un rol asignado.<br />
            <span className="small text-muted">Contacta al administrador de Rafiki.</span>
          </div>
        </div>
      )
  }
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/"                          element={<HomeRoute />} />
          <Route path="/mis-boletos"               element={<ParticipanteDashboard />} />
          <Route path="/org/:orgSlug"              element={<PublicOrgPage />} />
          <Route path="/sorteo/:orgSlug/:sorteoId" element={<PublicSorteoPage />} />
          <Route path="*"                          element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
