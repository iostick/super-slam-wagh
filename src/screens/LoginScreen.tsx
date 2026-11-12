import { Alert, Box, Button, Card, CardContent, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { discordLogin } from '../lib/supabase'

function DiscordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 0 13.6.3 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4c-.7.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.8-3.6-13.7ZM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  )
}

type Mode = 'login' | 'signup' | 'forgot'

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email o contraseña incorrectos',
  'Email not confirmed': 'Todavía no has confirmado tu email: revisa tu correo',
  'User already registered': 'Ya existe una cuenta con ese email. Entra con tu contraseña.',
}

export default function LoginScreen() {
  const { signInWithPassword, signUp, resetPassword, signInWithDiscord } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(undefined)
    try {
      if (mode === 'login') await signInWithPassword(email.trim(), password)
      else if (mode === 'signup') {
        const note = await signUp(email.trim(), password, name.trim())
        if (note) setMsg({ ok: true, text: note })
      } else {
        await resetPassword(email.trim())
        setMsg({ ok: true, text: 'Si el email existe, te llegará un enlace para elegir una contraseña nueva.' })
      }
    } catch (err) {
      const m = (err as Error).message
      setMsg({ ok: false, text: ERRORS[m] ?? m })
    }
    setBusy(false)
  }

  const valid = email.includes('@') && (mode === 'forgot' || password.length >= 6) && (mode !== 'signup' || name.trim())

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 2, background: 'radial-gradient(circle at 50% 20%, #3a1212 0%, #121212 60%)' }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent>
          <Stack spacing={2.5} sx={{ alignItems: 'stretch', py: 1 }}>
            <Stack sx={{ alignItems: 'center', textAlign: 'center' }} spacing={1}>
              <Box component="img" src="./icon.svg" alt="" sx={{ width: 72, height: 72 }} />
              <Typography variant="h4">Super Slam Wagh</Typography>
              <Typography color="text.secondary">Liga de Warhammer 40.000 del servidor</Typography>
            </Stack>

            {mode !== 'forgot' ? (
              <Tabs value={mode} onChange={(_, v) => { setMode(v); setMsg(undefined) }} variant="fullWidth">
                <Tab value="login" label="Entrar" />
                <Tab value="signup" label="Crear cuenta" />
              </Tabs>
            ) : (
              <Typography variant="h6">Recuperar contraseña</Typography>
            )}

            <Stack component="form" spacing={2} onSubmit={submit}>
              {mode === 'signup' && <TextField label="Tu nombre en la liga" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />}
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              {mode !== 'forgot' && (
                <TextField
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  helperText={mode === 'signup' ? 'Mínimo 6 caracteres' : ' '}
                />
              )}
              {msg && <Alert severity={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={busy || !valid}>
                {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
              </Button>
              {mode === 'login' && (
                <Button size="small" color="inherit" onClick={() => { setMode('forgot'); setMsg(undefined) }}>
                  He olvidado mi contraseña
                </Button>
              )}
              {mode === 'forgot' && (
                <Button size="small" color="inherit" onClick={() => { setMode('login'); setMsg(undefined) }}>
                  Volver
                </Button>
              )}
            </Stack>

            {mode === 'login' && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                ¿Ya usas War Army? Entra con el mismo email y contraseña.
              </Typography>
            )}

            {discordLogin && (
              <>
                <Divider>o</Divider>
                <Button size="large" variant="contained" startIcon={<DiscordIcon />} onClick={() => signInWithDiscord()} sx={{ bgcolor: '#5865F2', '&:hover': { bgcolor: '#4752c4' } }}>
                  Entrar con Discord
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
