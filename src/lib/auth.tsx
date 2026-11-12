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
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

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

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      return
    }
    // Crea el perfil de la liga la primera vez (y actualiza el avatar de Discord)
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
      // Esperar fuera del callback: Supabase desaconseja llamadas await dentro de él
      setTimeout(async () => {
        if (event === 'SIGNED_IN' && s) await checkGuild(s)
        await loadProfile(s)
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        scopes: discordGuildId ? 'identify email guilds' : 'identify email',
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const reloadProfile = useCallback(() => loadProfile(session), [loadProfile, session])

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, profileError, isAdmin: profile?.role === 'admin', signIn, signOut, reloadProfile }}
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
