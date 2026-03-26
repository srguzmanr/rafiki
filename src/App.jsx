// src/App.jsx

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import { Login }                 from './pages/Login'
import { LandingPage }           from './pages/LandingPage'
import { OrgDashboard }          from './pages/OrgDashboard'
import { VendedorDashboard }     from './pages/VendedorDashboard'
import { ParticipanteDashboard } from './pages/ParticipanteDashboard'
import { AdminDashboard }        from './pages/AdminDashboard'
import { PublicOrgPage }         from './pages/PublicOrgPage'
import { PublicSorteoPage }      from './pages/PublicSorteoPage'
import { PrivacyPage }           from './pages/PrivacyPage'
import { TermsPage }             from './pages/TermsPage'
import { LoadingSpinner }        from './components/shared/UI'
import { Alert, AlertDescription } from '@/components/ui/alert'

function HomeRoute() {
  const { session, role, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner message="Iniciando Rafiki..." />
    </div>
  )

  // Unauthenticated users see the public landing page
  if (!session) return <LandingPage />

  // Authenticated users go to their dashboard
  switch (role) {
    case 'admin':        return <AdminDashboard />
    case 'organizador':  return <OrgDashboard />
    case 'vendedor':     return <VendedorDashboard />
    case 'participante': return <Navigate to="/mis-boletos" replace />
    default:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Alert className="max-w-md bg-amber-50 border-amber-200 text-center">
            <AlertDescription className="text-amber-800">
              Tu cuenta no tiene un rol asignado.<br />
              <span className="text-sm text-muted-foreground">Contacta al administrador de Rafiki.</span>
            </AlertDescription>
          </Alert>
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
          <Route path="/login"                     element={<Login />} />
          <Route path="/mis-boletos"               element={<ParticipanteDashboard />} />
          <Route path="/org/:orgSlug"              element={<PublicOrgPage />} />
          <Route path="/sorteo/:orgSlug/:sorteoId" element={<PublicSorteoPage />} />
          <Route path="/privacidad"                element={<PrivacyPage />} />
          <Route path="/terminos"                  element={<TermsPage />} />
          <Route path="*"                          element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
