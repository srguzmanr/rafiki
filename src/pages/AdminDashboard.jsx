// src/pages/AdminDashboard.jsx
// Platform admin panel for Servicios Comerciales Rafiki.

import { useState, useEffect } from 'react'
import { useAuth }             from '../context/AuthContext'
import {
  fetchAllOrgsWithStats,
  createOrganizadorTenant,
  setOrgStatus,
} from '../lib/sorteosApi'
import { LoadingSpinner, ErrorMessage, formatMXN } from '../components/shared/UI'
import { Layout }  from '../components/shared/Layout'
import { Button }  from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }   from '@/components/ui/badge'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, X, Info } from 'lucide-react'

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
    <Card className="mb-4 max-w-[520px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Nueva organización</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Nombre de la organización</Label>
            <Input
              type="text"
              placeholder="Ej. ITSON, Universidad X"
              value={form.name}
              onChange={handleNameChange}
              disabled={saving}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="font-medium">
              Slug <span className="text-muted-foreground font-normal text-sm">(URL pública)</span>
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs">
                rafiki.mx/org/
              </span>
              <Input
                type="text"
                placeholder="itson"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                disabled={saving}
                required
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones.</p>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Correo de contacto</Label>
            <Input
              type="email"
              placeholder="coordinador@org.edu.mx"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={saving}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear organización
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </form>

        <hr className="my-3" />
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Siguiente paso:</strong> Después de crear la organización, crea el usuario
            organizador en Supabase Auth (Authentication → Users → Invite user), luego asígnale
            el rol desde la tabla <code className="bg-blue-100 px-1 rounded">user_roles</code>.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
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
    <TableRow>
      <TableCell>
        <div className="font-medium">{org.name}</div>
        <div className="text-muted-foreground text-sm">/{org.slug}</div>
      </TableCell>
      <TableCell>
        <Badge className={isActive ? 'bg-emerald-600 hover:bg-emerald-600' : ''} variant={isActive ? undefined : 'secondary'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">{org.total_sorteos}</TableCell>
      <TableCell className="text-right">
        <Badge variant={Number(org.active_sorteos) > 0 ? 'default' : 'outline'}>
          {org.active_sorteos} activos
        </Badge>
      </TableCell>
      <TableCell className="text-right">{Number(org.total_sales || 0).toLocaleString('es-MX')}</TableCell>
      <TableCell className="text-right font-medium text-emerald-600">{formatMXN(org.total_revenue_mxn || 0)}</TableCell>
      <TableCell className="text-right">{org.active_vendedores}</TableCell>
      <TableCell className="text-right">
        <div className="text-muted-foreground text-sm">
          {org.last_sale_at
            ? new Date(org.last_sale_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={toggling}
          className={isActive ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'}
        >
          {toggling
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : isActive ? 'Desactivar' : 'Activar'}
        </Button>
      </TableCell>
    </TableRow>
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

  const totalRevenue = orgs.reduce((s, o) => s + Number(o.total_revenue_mxn || 0), 0)
  const totalSales   = orgs.reduce((s, o) => s + Number(o.total_sales || 0), 0)
  const activeOrgs   = orgs.filter(o => o.status === 'active').length

  return (
    <Layout title="Admin">
      <div className="w-full px-4 py-4">

        {/* Platform summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Organizaciones activas', value: activeOrgs, color: 'text-primary' },
            { label: 'Boletos vendidos (total)', value: Number(totalSales).toLocaleString('es-MX'), color: 'text-blue-600' },
            { label: 'Ingresos totales', value: formatMXN(totalRevenue), color: 'text-emerald-600' },
          ].map(c => (
            <Card key={c.label} className="border-0 bg-muted/50">
              <CardContent className="text-center py-3 px-4">
                <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-muted-foreground text-sm">{c.label}</div>
              </CardContent>
            </Card>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">Organizaciones ({orgs.length})</CardTitle>
            {!creating && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nueva organización
              </Button>
            )}
          </CardHeader>

          {loading && <CardContent><LoadingSpinner /></CardContent>}
          {error   && <CardContent><ErrorMessage message={error} onRetry={loadOrgs} /></CardContent>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Sorteos</TableHead>
                    <TableHead className="text-right">Activos</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Vendedores</TableHead>
                    <TableHead className="text-right">Última venta</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Sin organizaciones. Crea la primera.
                      </TableCell>
                    </TableRow>
                  ) : orgs.map(org => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
