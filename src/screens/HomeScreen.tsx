import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { daysBetween, formatDay, toIso } from '../lib/calendar'
import { useAuth } from '../lib/auth'
import { discordGuildId } from '../lib/supabase'
import { STATUS_LABEL } from '../lib/types'
import { useCurrentSeason } from '../lib/useSeason'

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

function countdown(to: Date, now: Date): string {
  const diff = to.getTime() - now.getTime()
  if (diff <= 0) return 'cerrado'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  return d > 0 ? `${d} d ${h} h` : `${h} h ${Math.floor((diff % 3_600_000) / 60_000)} min`
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ flex: '1 1 140px' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
    </Box>
  )
}

export default function HomeScreen() {
  const { profile, profileError } = useAuth()
  const { season, rounds, players, loading, error } = useCurrentSeason()
  const now = useNow()
  const today = toIso(now)

  if (loading) return <CircularProgress />
  const current = rounds.find((r) => r.starts_on <= today && today <= r.ends_on)
  const next = rounds.find((r) => r.starts_on > today)
  const last = rounds[rounds.length - 1]

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Hola{profile ? `, ${profile.display_name}` : ''}</Typography>
      {discordGuildId && profile && !profile.guild_member && (
        <Alert severity="warning">No te encontramos en el servidor de Discord de la liga. Únete al servidor y vuelve a entrar.</Alert>
      )}
      {profileError && !profile && <Alert severity="error">No se pudo crear tu perfil de la liga: {profileError}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!season && !error && <Alert severity="info">Todavía no hay ninguna temporada publicada. El administrador la abrirá pronto.</Alert>}
      {season && (
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ flexGrow: 1 }}>
                {season.name}
              </Typography>
              <Chip color="primary" label={STATUS_LABEL[season.status]} />
            </Stack>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              <Stat label="Inscritos" value={players} />
              {season.status === 'registration' && (
                <Stat label="Cierre de inscripción" value={countdown(new Date(season.registration_closes_at), now)} />
              )}
              {current && <Stat label={`Límite ${current.label}`} value={countdown(new Date(current.deadline), now)} />}
              <Stat label="Jornadas suizas" value={season.swiss_rounds} />
              <Stat label="Top" value={season.playoff_size || '—'} />
              {last && <Stat label="Final" value={formatDay(last.ends_on, { day: 'numeric', month: 'short' })} />}
            </Stack>
            {next && (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Siguiente: {next.label}, empieza el {formatDay(next.starts_on, { weekday: 'long', day: 'numeric', month: 'long' })}
                {daysBetween(today, next.starts_on) <= 7 ? ' (esta semana)' : ''}.
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Puntos: victoria {season.points_win}, empate {season.points_draw}, derrota {season.points_loss}. Listas a {season.points_limit} puntos. Sin
              resultado antes del límite, doble derrota.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}
