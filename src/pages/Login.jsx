// src/pages/Login.jsx
// Login page for all roles. After successful login, AuthContext determines the
// role and App.jsx routes to the correct dashboard.

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { signIn } = useAuth()

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email.trim(), password)

    if (error) {
      setError('Correo o contraseña incorrectos. Intenta de nuevo.')
      setLoading(false)
    }
    // On success, AuthContext updates and App.jsx re-renders to the correct dashboard
  }

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3">
      <div style={{ width: '100%', maxWidth: 400 }}>

       {/* Logo / wordmark */}
        <div className="text-center mb-4">
          <img src="/RafikiLogos03.png" alt="Rafiki" style={{ height: 60 }} className="mb-2" />
          <p className="text-muted">Tu Central de Rifas</p>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h5 className="card-title mb-4">Iniciar sesión</h5>

            {error && (
              <div className="alert alert-danger py-2 small">{error}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !email || !password}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Entrando...</>
                  : 'Entrar'
                }
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-muted small mt-3">
          ¿Problemas para acceder? Contacta a tu administrador.
        </p>
      </div>
    </div>
  )
}
