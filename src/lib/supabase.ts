import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

/** false hasta que se configuran VITE_SUPABASE_URL y VITE_SUPABASE_KEY */
export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  // La liga usa su propio esquema (league) dentro del proyecto de Supabase de War Army
  db: { schema: 'league' },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'slam-wagh-auth' },
})

export const discordGuildId = import.meta.env.VITE_DISCORD_GUILD_ID || ''
/** El botón "Entrar con Discord" solo aparece si VITE_DISCORD_LOGIN=true (hay que activar Discord en Supabase) */
export const discordLogin = import.meta.env.VITE_DISCORD_LOGIN === 'true'
