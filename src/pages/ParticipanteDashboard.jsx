// src/pages/ParticipanteDashboard.jsx

import { useState, useEffect } from 'react'
import { Link }                from 'react-router-dom'
import { useAuth }             from '../context/AuthContext'
import { fetchMyBoletos, signUpParticipante, grantParticipanteRole } from '../lib/participanteApi'
import { supabase }            from '../lib/supabase'
import { LoadingSpinner, ErrorMessage, StatusBadge, formatMXN } from '../components/shared/UI'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, LogOut, AlertCircle } from 'lucide-react'

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

  const bySorteo = boletos.reduce((acc, b) => {
    const key = b.sorteo_id
    if (!acc[key]) acc[key] = { sorteo: b.sorteos, boletos: [] }
    acc[key].boletos.push(b)
    return acc
  }, {})

  if (loading) return <LoadingSpinner message="Cargando tus boletos..." />
  if (error)   return <ErrorMessage message={error} />

  if (boletos.length === 0) return (
    <div className="text-center py-12">
      <div className="text-5xl">🎟️</div>
      <p className="text-muted-foreground mt-2 mb-4">Aún no tienes boletos.</p>
      <p className="text-muted-foreground text-sm">Visita la página de un sorteo para participar.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {Object.values(bySorteo).map(({ sorteo, boletos: sb }) => (
        <div key={sorteo?.id || sb[0].sorteo_id}>
          <div className="flex justify-between items-center mb-2">
            <h6 className="font-bold">{sorteo?.title || 'Sorteo'}</h6>
            {sorteo?.status && <StatusBadge status={sorteo.status} />}
          </div>

          {sorteo?.drawing_date && (
            <p className="text-muted-foreground text-sm mb-2">
              Sorteo: {new Date(sorteo.drawing_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {sorteo?.status === 'drawn' && sorteo?.drawing_result && (
            <Alert className="bg-emerald-50 border-emerald-200 mb-2">
              <AlertDescription className="text-emerald-700 text-sm">🎉 Resultado disponible</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 mb-2">
            {sb.map(b => (
              <div key={b.id} className="border rounded-lg px-3 py-2 text-center bg-card min-w-[72px]">
                <div className="font-bold text-primary">#{b.boleto_numero}</div>
                <div className="text-muted-foreground text-[0.7rem]">{formatMXN(b.amount_mxn)}</div>
                {b.payment_status === 'pending' && (
                  <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400 mt-1 text-[0.6rem]">Pendiente</Badge>
                )}
                {b.payment_status === 'confirmed' && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 mt-1 text-[0.6rem]">Pagado</Badge>
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
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  function handleField(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError(null)
    const { error } = await signIn(form.email.trim(), form.password)
    if (error) setError('Correo o contraseña incorrectos.')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido.'); return }
    setLoading(true); setError(null)
    const { data, error } = await signUpParticipante(form.email.trim(), form.password, form.name.trim(), form.phone.trim())
    if (error) { setError(error.message); setLoading(false); return }
    if (data?.user?.id) await grantParticipanteRole(data.user.id)
    setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu registro, luego inicia sesión.')
    setLoading(false)
  }

  if (success) return (
    <Alert className="bg-emerald-50 border-emerald-200 text-center">
      <AlertDescription>
        <div className="text-3xl mb-2">✉️</div>
        <p className="mb-2 text-emerald-800">{success}</p>
        <Button variant="link" onClick={() => { setSuccess(null); setMode('login') }}>Iniciar sesión</Button>
      </AlertDescription>
    </Alert>
  )

  return (
    <Card className="max-w-[420px] mx-auto">
      <CardContent className="pt-4">
        <Tabs value={mode} onValueChange={(v) => { setMode(v); setError(null) }}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Registrarme</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" name="email" placeholder="Correo" value={form.email} onChange={handleField} required disabled={loading} />
              <Input type="password" name="password" placeholder="Contraseña" value={form.password} onChange={handleField} required disabled={loading} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Entrar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3">
              <Input type="text" name="name" placeholder="Nombre completo *" value={form.name} onChange={handleField} required disabled={loading} />
              <Input type="tel" name="phone" placeholder="Teléfono" value={form.phone} onChange={handleField} disabled={loading} />
              <Input type="email" name="email" placeholder="Correo *" value={form.email} onChange={handleField} required disabled={loading} />
              <Input type="password" name="password" placeholder="Contraseña *" value={form.password} onChange={handleField} required minLength={6} disabled={loading} />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Crear cuenta
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <p className="text-muted-foreground text-sm text-center mt-3">
          Crea una cuenta para ver tus boletos y recibir actualizaciones.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────

export function ParticipanteDashboard() {
  const { session, user, role, loading, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white border-b px-4 py-2 flex items-center">
        <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7" />
        {session && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Salir
          </Button>
        )}
      </nav>

      <div className="max-w-[600px] mx-auto px-4 py-4">
        <h4 className="text-xl font-bold mb-4">Mis Boletos</h4>

        {loading && <LoadingSpinner />}

        {!loading && !session && (
          <>
            <p className="text-muted-foreground mb-4">Inicia sesión o crea una cuenta para ver tus boletos.</p>
            <AuthPanel />
          </>
        )}

        {!loading && session && role === 'participante' && user?.id && (
          <MyBoletosList userId={user.id} />
        )}

        {!loading && session && role !== 'participante' && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              Esta sección es solo para participantes. Tu cuenta tiene el rol: <strong>{role}</strong>.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
