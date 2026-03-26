// src/pages/Login.jsx
// Login page for all roles. After successful login, AuthContext determines the
// role and App.jsx routes to the correct dashboard.

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

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
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3">
      <div className="w-full max-w-[400px]">

        {/* Logo / wordmark */}
        <div className="text-center mb-6">
          <img src="/RafikiLogos03.png" alt="Rafiki" className="h-[60px] mx-auto mb-2" />
          <p className="text-muted-foreground">Tu Central de Rifas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
                  : 'Entrar'
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-sm mt-3">
          ¿Problemas para acceder? Contacta a tu administrador.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/privacidad" className="underline hover:text-foreground">Aviso de Privacidad</Link>
          {' | '}
          <Link to="/terminos" className="underline hover:text-foreground">Términos y Condiciones</Link>
        </p>
      </div>
    </div>
  )
}
