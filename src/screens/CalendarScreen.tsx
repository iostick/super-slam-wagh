import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import RoundList from '../components/RoundList'
import { formatDay, toIso } from '../lib/calendar'
import { useCurrentSeason } from '../lib/useSeason'

export default function CalendarScreen() {
  const { season, rounds, loading, error } = useCurrentSeason()
  const today = toIso(new Date())
  if (loading) return <CircularProgress />
  if (error) return <Alert severity="error">{error}</Alert>
  if (!season) return <Alert severity="info">Todavía no hay ninguna temporada publicada.</Alert>
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Calendario</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">{season.name}</Typography>
          <Typography color="text.secondary" gutterBottom>
            Inscripción hasta el {formatDay(season.registration_closes_at.slice(0, 10), { day: 'numeric', month: 'long' })}.{' '}
            {season.breaks.length > 0 && `Pausas: ${season.breaks.map((b) => `${b.label ?? 'pausa'} (${formatDay(b.from)}–${formatDay(b.to)})`).join(', ')}.`}
          </Typography>
          <RoundList
            today={today}
            rounds={rounds.map((r) => ({ key: r.id, label: r.label, phase: r.phase, startsOn: r.starts_on, endsOn: r.ends_on }))}
          />
        </CardContent>
      </Card>
    </Stack>
  )
}
