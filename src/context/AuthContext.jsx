// src/context/AuthContext.jsx
// Manages Supabase session + the current user's role and organization.
// Wrap the app in <AuthProvider> and use useAuth() anywhere you need session data.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]       = useState(null)
  const [user, setUser]             = useState(null)
  const [role, setRole]             = useState(null)
  const [orgId, setOrgId]           = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user) {
          loadUserRole(session.user.id)
        } else {
          setUser(null)
          setRole(null)
          setOrgId(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserRole(userId) {
    try {
      // Fetch profile + role in parallel
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('user_roles')
          .select('role, organization_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          // Priority order mirrors get_my_role() in the DB
          .order('role', { ascending: true })
          .limit(1)
          .single(),
      ])

      setUser(profileRes.data)
      setRole(roleRes.data?.role ?? null)
      setOrgId(roleRes.data?.organization_id ?? null)
    } catch (err) {
      console.error('[AuthContext] Failed to load user role:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    role,
    orgId,
    loading,
    signIn,
    signOut,
    isAdmin:       role === 'admin',
    isOrganizador: role === 'organizador',
    isVendedor:    role === 'vendedor',
    isParticipante: role === 'participante',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
