import { Alert, Avatar, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { discordGuildId, supabase } from '../lib/supabase'

export default function ProfileScreen() {
  const { profile, signOut, reloadProfile } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>()
  if (!profile) return <Alert severity="warning">No se encontró tu perfil. Prueba a cerrar sesión y volver a entrar.</Alert>

  async function save() {
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile!.id)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Guardado' })
    if (!error) reloadProfile()
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Mi perfil</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar src={profile.avatar_url ?? undefined} sx={{ width: 64, height: 64 }} />
              <Stack>
                <Typography variant="h6">{profile.display_name}</Typography>
                <Typography color="text.secondary">@{profile.username}</Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip label={profile.role === 'admin' ? 'Administrador' : 'Jugador'} color={profile.role === 'admin' ? 'secondary' : 'default'} />
              {discordGuildId && <Chip label={profile.guild_member ? 'En el servidor' : 'Fuera del servidor'} color={profile.guild_member ? 'success' : 'warning'} variant="outlined" />}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField label="Nombre en la liga" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
              <Button variant="contained" onClick={save} disabled={!name.trim() || name === profile.display_name}>
                Guardar
              </Button>
            </Stack>
            {msg && <Alert severity={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
            <Button color="inherit" variant="outlined" onClick={signOut} sx={{ alignSelf: 'flex-start' }}>
              Cerrar sesión
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
