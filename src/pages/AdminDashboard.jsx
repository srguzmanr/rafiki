// src/pages/AdminDashboard.jsx
//
// Platform admin panel for Servicios Comerciales Rafiki.
// Shows all tenant organizations with aggregate stats.
// Admin can create new org records and toggle org status.
//
// Note on user creation: Supabase requires the service role key to create
// users server-side. For MVP, admin creates the org record here, then
// manually creates the user in Supabase Auth UI and links them.
// Full invite flow (email magic link) is a Phase 6+ item.

import { useState, useEffect } from 'react'
import { useAuth }             from '../context/AuthContext'
import {
  fetchAllOrgsWithStats,
  createOrganizadorTenant,
  setOrgStatus,
} from '../lib/sorteosApi'
import { LoadingSpinner, ErrorMessage, formatMXN } from '../components/shared/UI'

// ─── CREATE ORG FORM ───────────────────────────────────────────────────────

function CreateOrgForm({ onCreated, onCancel }) {
  const [form, setForm]     = useState({ name: '', slug: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function slugify(name) {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 40)
  }

  function handleNameChange(e) {
    const name = e.target.value
    setForm(f => ({
      ...f,
      name,
      slug: f.slug || slugify(name),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim() || !form.email.trim()) {
      setError('Todos los campos son requeridos.')
      return
    }

    setSaving(true)
    setError(null)

    const { org, error } = await createOrganizadorTenant({
      orgName:      form.name.trim(),
      orgSlug:      form.slug.trim(),
      contactEmail: form.email.trim(),
    })

    setSaving(false)

    if (error) {
      setError(error.code === '23505'
        ? 'Ya existe una organización con ese slug. Elige otro.'
        : error.message)
      return
    }

    onCreated(org)
  }

  return (
    <div className="card shadow-sm mb-4" style={{ maxWidth: 520 }}>
      <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
        Nueva organización
        <button className="btn-close btn-sm" onClick={onCancel} />
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-medium">Nombre de la organización</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. ITSON, Universidad X"
              value={form.name}
              onChange={handleNameChange}
              disabled={saving}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">
              Slug <span className="text-muted fw-normal small">(URL pública)</span>
            </label>
            <div className="input-group">
              <span className="input-group-text text-muted" style={{ fontSize: '0.82rem' }}>
                rafiki.mx/org/
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="itson"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                disabled={saving}
                required
              />
            </div>
            <div className="form-text">Solo letras minúsculas, números y guiones.</div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium">Correo de contacto</label>
            <input
              type="email"
              className="form-control"
              placeholder="coordinador@org.edu.mx"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={saving}
              required
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
              Crear organización
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>

        <hr className="my-3" />
        <div className="alert alert-info py-2 small mb-0">
          <strong>Siguiente paso:</strong> Después de crear la organización, crea el usuario
          organizador en Supabase Auth (Authentication → Users → Invite user), luego asígnale
          el rol desde la tabla <code>user_roles</code>.
        </div>
      </div>
    </div>
  )
}

// ─── ORG TABLE ROW ─────────────────────────────────────────────────────────

function OrgRow({ org, onToggleStatus }) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    await onToggleStatus(org.id, org.status === 'active' ? 'inactive' : 'active')
    setToggling(false)
  }

  const isActive = org.status === 'active'

  return (
    <tr>
      <td>
        <div className="fw-medium">{org.name}</div>
        <div className="text-muted small">/{org.slug}</div>
      </td>
      <td>
        <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="text-end">{org.total_sorteos}</td>
      <td className="text-end">
        <span className={`badge ${Number(org.active_sorteos) > 0 ? 'bg-primary' : 'bg-light text-dark'}`}>
          {org.active_sorteos} activos
        </span>
      </td>
      <td className="text-end">{Number(org.total_sales || 0).toLocaleString('es-MX')}</td>
      <td className="text-end fw-medium text-success">{formatMXN(org.total_revenue_mxn || 0)}</td>
      <td className="text-end">{org.active_vendedores}</td>
      <td className="text-end">
        <div className="text-muted small">
          {org.last_sale_at
            ? new Date(org.last_sale_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        </div>
      </td>
      <td>
        <button
          className={`btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
          onClick={handleToggle}
          disabled={toggling}
          style={{ whiteSpace: 'nowrap' }}
        >
          {toggling
            ? <span className="spinner-border spinner-border-sm" />
            : isActive ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </tr>
  )
}

// ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────

export function AdminDashboard() {
  const { signOut }          = useAuth()
  const [orgs, setOrgs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [creating, setCreating] = useState(false)

  async function loadOrgs() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchAllOrgsWithStats()
    if (error) setError(error.message)
    else setOrgs(data)
    setLoading(false)
  }

  useEffect(() => { loadOrgs() }, [])

  async function handleToggleStatus(orgId, newStatus) {
    await setOrgStatus(orgId, newStatus)
    setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: newStatus } : o))
  }

  function handleOrgCreated(org) {
    setCreating(false)
    setOrgs(prev => [{ ...org, total_sorteos: 0, active_sorteos: 0, total_sales: 0, total_revenue_mxn: 0, active_vendedores: 0 }, ...prev])
  }

  // Platform totals
  const totalRevenue = orgs.reduce((s, o) => s + Number(o.total_revenue_mxn || 0), 0)
  const totalSales   = orgs.reduce((s, o) => s + Number(o.total_sales || 0), 0)
  const activeOrgs   = orgs.filter(o => o.status === 'active').length

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark navbar-rafiki px-4 py-2">
        <span className="navbar-brand fw-bold mb-0">Rafiki — Admin</span>
        <button className="btn btn-sm btn-outline-light ms-auto" onClick={signOut}>Salir</button>
      </nav>

      <div className="container-fluid px-4 py-4">

        {/* Platform summary */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Organizaciones activas', value: activeOrgs, color: 'primary' },
            { label: 'Boletos vendidos (total)', value: Number(totalSales).toLocaleString('es-MX'), color: 'info' },
            { label: 'Ingresos totales', value: formatMXN(totalRevenue), color: 'success' },
          ].map(c => (
            <div key={c.label} className="col-12 col-md-4">
              <div className={`card border-0 bg-${c.color} bg-opacity-10`}>
                <div className="card-body text-center py-3">
                  <div className={`fs-3 fw-bold text-${c.color}`}>{c.value}</div>
                  <div className="text-muted small">{c.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create org form */}
        {creating && (
          <CreateOrgForm
            onCreated={handleOrgCreated}
            onCancel={() => setCreating(false)}
          />
        )}

        {/* Orgs table */}
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-bold">Organizaciones ({orgs.length})</span>
            {!creating && (
              <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                + Nueva organización
              </button>
            )}
          </div>

          {loading && <div className="card-body"><LoadingSpinner /></div>}
          {error   && <div className="card-body"><ErrorMessage message={error} onRetry={loadOrgs} /></div>}

          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Organización</th>
                    <th>Estado</th>
                    <th className="text-end">Sorteos</th>
                    <th className="text-end">Activos</th>
                    <th className="text-end">Ventas</th>
                    <th className="text-end">Ingresos</th>
                    <th className="text-end">Vendedores</th>
                    <th className="text-end">Última venta</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-4">
                        Sin organizaciones. Crea la primera.
                      </td>
                    </tr>
                  ) : orgs.map(org => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
