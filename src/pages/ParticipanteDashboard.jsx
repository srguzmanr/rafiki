// src/pages/ParticipanteDashboard.jsx
//
// "Mis Boletos" — logged-in participante sees all their purchases across sorteos.
// Guest users (no account) see a registration prompt here.

import { useState, useEffect } from 'react'
import { Link }                from 'react-router-dom'
import { useAuth }             from '../context/AuthContext'
import { fetchMyBoletos, signUpParticipante, grantParticipanteRole } from '../lib/participanteApi'
import { supabase }            from '../lib/supabase'
import { LoadingSpinner, ErrorMessage, StatusBadge, formatMXN } from '../components/shared/UI'

// ─── MY BOLETOS LIST ───────────────────────────────────────────────────────

function MyBoletosList({ userId }) {
  const [boletos, setBoletos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchMyBoletos(userId).then(({ data, error }) => {
      if (error) setError(error.message)
      else setBoletos(data)
      setLoading(false)
    })
  }, [userId])

  // Group by sorteo
  const bySorteo = boletos.reduce((acc, b) => {
    const key = b.sorteo_id
    if (!acc[key]) acc[key] = { sorteo: b.sorteos, boletos: [] }
    acc[key].boletos.push(b)
    return acc
  }, {})

  if (loading) return <LoadingSpinner message="Cargando tus boletos..." />
  if (error)   return <ErrorMessage message={error} />

  if (boletos.length === 0) return (
    <div className="text-center py-5">
      <div style={{ fontSize: '3rem' }}>🎟️</div>
      <p className="text-muted mt-2 mb-4">Aún no tienes boletos.</p>
      <p className="text-muted small">
        Visita la página de un sorteo para participar.
      </p>
    </div>
  )

  return (
    <div className="d-flex flex-column gap-4">
      {Object.values(bySorteo).map(({ sorteo, boletos: sb }) => (
        <div key={sorteo?.id || sb[0].sorteo_id}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0">{sorteo?.title || 'Sorteo'}</h6>
            {sorteo?.status && <StatusBadge status={sorteo.status} />}
          </div>

          {sorteo?.drawing_date && (
            <p className="text-muted small mb-2">
              Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          )}

          {/* Winner announcement */}
          {sorteo?.status === 'drawn' && sorteo?.drawing_result && (
            <div className="alert alert-success py-2 small mb-2">
              🎉 Resultado disponible
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mb-2">
            {sb.map(b => (
              <div
                key={b.id}
                className="border rounded-3 px-3 py-2 text-center"
                style={{ minWidth: 72, background: 'white' }}
              >
                <div className="fw-bold text-primary">#{b.boleto_numero}</div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {formatMXN(b.amount_mxn)}
                </div>
                {b.payment_status === 'pending' && (
                  <span className="badge bg-warning text-dark mt-1" style={{ fontSize: '0.6rem' }}>
                    Pendiente
                  </span>
                )}
                {b.payment_status === 'confirmed' && (
                  <span className="badge bg-success mt-1" style={{ fontSize: '0.6rem' }}>
                    Pagado
                  </span>
                )}
              </div>
            ))}
          </div>
          <hr />
        </div>
      ))}
    </div>
  )
}

// ─── REGISTER / LOGIN FORM ─────────────────────────────────────────────────

function AuthPanel() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  const [form, setForm]       = useState({ email: '', password: '', name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)

  function handleField(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await signIn(form.email.trim(), form.password)
    if (error) setError('Correo o contraseña incorrectos.')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido.'); return }
    setLoading(true); setError(null)

    const { data, error } = await signUpParticipante(
      form.email.trim(), form.password, form.name.trim(), form.phone.trim()
    )
    if (error) { setError(error.message); setLoading(false); return }

    // Grant participante role
    if (data?.user?.id) {
      await grantParticipanteRole(data.user.id)
    }

    setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu registro, luego inicia sesión.')
    setLoading(false)
  }

  if (success) return (
    <div className="alert alert-success text-center">
      <div style={{ fontSize: '2rem' }}>✉️</div>
      <p className="mb-0 mt-2">{success}</p>
      <button className="btn btn-link" onClick={() => { setSuccess(null); setMode('login') }}>
        Iniciar sesión
      </button>
    </div>
  )

  return (
    <div className="card shadow-sm" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card-body p-4">
        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null) }}
            >Iniciar sesión</button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(null) }}
            >Registrarme</button>
          </li>
        </ul>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <input type="email" name="email" className="form-control" placeholder="Correo" value={form.email} onChange={handleField} required disabled={loading} />
            </div>
            <div className="mb-3">
              <input type="password" name="password" className="form-control" placeholder="Contraseña" value={form.password} onChange={handleField} required disabled={loading} />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm" /> : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <input type="text" name="name" className="form-control" placeholder="Nombre completo *" value={form.name} onChange={handleField} required disabled={loading} />
            </div>
            <div className="mb-3">
              <input type="tel" name="phone" className="form-control" placeholder="Teléfono" value={form.phone} onChange={handleField} disabled={loading} />
            </div>
            <div className="mb-3">
              <input type="email" name="email" className="form-control" placeholder="Correo *" value={form.email} onChange={handleField} required disabled={loading} />
            </div>
            <div className="mb-3">
              <input type="password" name="password" className="form-control" placeholder="Contraseña *" value={form.password} onChange={handleField} required minLength={6} disabled={loading} />
              <div className="form-text">Mínimo 6 caracteres.</div>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm" /> : 'Crear cuenta'}
            </button>
          </form>
        )}

        <p className="text-muted small text-center mt-3 mb-0">
          Crea una cuenta para ver tus boletos y recibir actualizaciones.
        </p>
      </div>
    </div>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────

export function ParticipanteDashboard() {
  const { session, user, role, loading, signOut } = useAuth()

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-light bg-white border-bottom px-4 py-2">
        <span className="navbar-brand fw-bold mb-0">Rafiki</span>
        {session && (
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={signOut}>
            Salir
          </button>
        )}
      </nav>

      <div className="container py-4" style={{ maxWidth: 600 }}>
        <h4 className="fw-bold mb-4">Mis Boletos</h4>

        {loading && <LoadingSpinner />}

        {!loading && !session && (
          <>
            <p className="text-muted mb-4">
              Inicia sesión o crea una cuenta para ver tus boletos.
            </p>
            <AuthPanel />
          </>
        )}

        {!loading && session && role === 'participante' && user?.id && (
          <MyBoletosList userId={user.id} />
        )}

        {!loading && session && role !== 'participante' && (
          <div className="alert alert-warning">
            Esta sección es solo para participantes. Tu cuenta tiene el rol: <strong>{role}</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
