import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { discordGuildId, isConfigured, supabase } from './supabase'
import type { Profile } from './types'

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  /** Error al crear el perfil de la liga (por ejemplo, si el esquema no está expuesto) */
  profileError?: string
  isAdmin: boolean
  /** true al abrir el enlace de "olvidé mi contraseña": hay que pedir una nueva */
  recovery: boolean
  clearRecovery: () => void
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<string>
  resetPassword: (email: string) => Promise<void>
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const here = () => window.location.origin + window.location.pathname

/** Comprueba con el token de Discord (solo disponible justo después del login) si el jugador está en el servidor. */
async function checkGuild(session: Session) {
  if (!discordGuildId || !session.provider_token) return
  try {
    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${session.provider_token}` },
    })
    if (!res.ok) return
    const guilds: { id: string }[] = await res.json()
    await supabase.rpc('set_guild_member', { member: guilds.some((g) => g.id === discordGuildId) })
  } catch {
    // Sin conexión con Discord: se volverá a comprobar en el próximo login
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string>()
  const [recovery, setRecovery] = useState(false)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      setProfileError(undefined)
      return
    }
    // Crea el perfil de la liga la primera vez (y actualiza el avatar)
    const { error: ensureError } = await supabase.rpc('ensure_profile')
    setProfileError(ensureError?.message)
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile(data as Profile | null)
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      // Esperar fuera del callback: Supabase desaconseja llamadas await dentro de él
      setTimeout(async () => {
        if (event === 'SIGNED_IN' && s) await checkGuild(s)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') await loadProfile(s)
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: here(), data: { display_name: name } },
    })
    if (error) throw error
    return data.session ? '' : 'Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí.'
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: here() })
    if (error) throw error
  }, [])

  const signInWithDiscord = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: here(), scopes: discordGuildId ? 'identify email guilds' : 'identify email' },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const reloadProfile = useCallback(() => loadProfile(session), [loadProfile, session])

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        profile,
        profileError,
        isAdmin: profile?.role === 'admin',
        recovery,
        clearRecovery: () => setRecovery(false),
        signInWithPassword,
        signUp,
        resetPassword,
        signInWithDiscord,
        signOut,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
