import Add from '@mui/icons-material/Add'
import Delete from '@mui/icons-material/Delete'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import RoundList from '../components/RoundList'
import { useAuth } from '../lib/auth'
import { addDays, deadlineOf, planSeason, recommendedPlayoffSize, recommendedSwissRounds, toIso, type Break } from '../lib/calendar'
import { supabase } from '../lib/supabase'
import { STATUS_LABEL, type Profile, type SeasonStatus } from '../lib/types'
import { useCurrentSeason } from '../lib/useSeason'

interface Form {
  id?: string
  name: string
  status: SeasonStatus
  registrationClosesOn: string
  leagueStartsOn: string
  expectedPlayers: number
  swissRounds: number
  roundDays: number
  playoffSize: number
  playoffRoundDays: number
  breaks: Break[]
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
  pointsLimit: number
  reminderHours: number
}

function defaultForm(): Form {
  const today = toIso(new Date())
  // Propuesta de la primera temporada: inscripción hasta el 30 de noviembre y pausa en Navidad
  const firstSeason = today <= '2026-11-30'
  return {
    name: 'Temporada 1',
    status: 'draft',
    registrationClosesOn: firstSeason ? '2026-11-30' : addDays(today, 14),
    leagueStartsOn: firstSeason ? '2026-12-01' : addDays(today, 15),
    expectedPlayers: 10,
    swissRounds: 4,
    roundDays: 14,
    playoffSize: 4,
    playoffRoundDays: 14,
    breaks: firstSeason ? [{ from: '2026-12-24', to: '2026-12-30', label: 'Navidad' }] : [],
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    pointsLimit: 2000,
    reminderHours: 48,
  }
}

function SeasonTab() {
  const { season, players, loading, reload } = useCurrentSeason(true)
  const [form, setForm] = useState<Form>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>()

  useEffect(() => {
    if (!season) return
    setForm({
      id: season.id,
      name: season.name,
      status: season.status,
      registrationClosesOn: season.registration_closes_at.slice(0, 10),
      leagueStartsOn: season.league_starts_on,
      expectedPlayers: Math.max(players, 6),
      swissRounds: season.swiss_rounds,
      roundDays: season.round_days,
      playoffSize: season.playoff_size,
      playoffRoundDays: season.playoff_round_days,
      breaks: season.breaks ?? [],
      pointsWin: season.points_win,
      pointsDraw: season.points_draw,
      pointsLoss: season.points_loss,
      pointsLimit: season.points_limit,
      reminderHours: season.reminder_hours,
    })
  }, [season, players])

  const plan = useMemo(
    () =>
      planSeason({
        leagueStartsOn: form.leagueStartsOn,
        swissRounds: form.swissRounds,
        roundDays: form.roundDays,
        playoffSize: form.playoffSize,
        playoffRoundDays: form.playoffRoundDays,
        breaks: form.breaks.filter((b) => b.from && b.to && b.from <= b.to),
      }),
    [form],
  )

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const num = (k: keyof Form) => ({
    type: 'number' as const,
    size: 'small' as const,
    value: form[k] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never),
  })

  const recRounds = recommendedSwissRounds(form.expectedPlayers)
  const recTop = recommendedPlayoffSize(form.expectedPlayers)
  const startsBeforeClose = form.leagueStartsOn <= form.registrationClosesOn

  async function save() {
    setSaving(true)
    setMsg(undefined)
    const { error } = await supabase.rpc('save_season', {
      season: {
        id: form.id ?? '',
        name: form.name,
        status: form.status,
        registration_closes_at: deadlineOf(form.registrationClosesOn).toISOString(),
        league_starts_on: form.leagueStartsOn,
        swiss_rounds: form.swissRounds,
        round_days: form.roundDays,
        playoff_size: form.playoffSize,
        playoff_round_days: form.playoffRoundDays,
        breaks: form.breaks.filter((b) => b.from && b.to),
        points_win: form.pointsWin,
        points_draw: form.pointsDraw,
        points_loss: form.pointsLoss,
        points_limit: form.pointsLimit,
        reminder_hours: form.reminderHours,
      },
      season_rounds: plan.map((r) => ({
        phase: r.phase,
        number: r.number,
        label: r.label,
        starts_on: r.startsOn,
        ends_on: r.endsOn,
        deadline: deadlineOf(r.endsOn).toISOString(),
      })),
    })
    setSaving(false)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Temporada guardada' })
    if (!error) reload()
  }

  if (loading) return <CircularProgress />

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{form.id ? 'Editar temporada' : 'Nueva temporada'}</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField size="small" label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} />
              <TextField select size="small" label="Estado" value={form.status} onChange={(e) => set('status', e.target.value as SeasonStatus)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField size="small" type="date" label="Cierre de inscripción (23:59)" value={form.registrationClosesOn} onChange={(e) => set('registrationClosesOn', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label="Empieza la liga" value={form.leagueStartsOn} onChange={(e) => set('leagueStartsOn', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} error={startsBeforeClose} helperText={startsBeforeClose ? 'Debe ser después del cierre de inscripción' : ' '} />
            </Box>

            <Divider />
            <Typography variant="subtitle1">Formato</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' } }}>
              <TextField {...num('expectedPlayers')} label="Jugadores previstos" helperText={form.id ? `Inscritos: ${players}` : ' '} />
              <TextField {...num('swissRounds')} label="Jornadas suizas" />
              <TextField {...num('roundDays')} label="Días por jornada" />
              <TextField select size="small" label="Eliminatorias" value={form.playoffSize} onChange={(e) => set('playoffSize', Number(e.target.value))}>
                <MenuItem value={0}>Sin eliminatorias</MenuItem>
                <MenuItem value={2}>Final (top 2)</MenuItem>
                <MenuItem value={4}>Top 4</MenuItem>
                <MenuItem value={8}>Top 8</MenuItem>
                <MenuItem value={16}>Top 16</MenuItem>
              </TextField>
              <TextField {...num('playoffRoundDays')} label="Días por eliminatoria" />
            </Box>
            {(recRounds !== form.swissRounds || recTop !== form.playoffSize) && (
              <Alert
                severity="info"
                action={
                  <Button color="inherit" size="small" onClick={() => setForm((f) => ({ ...f, swissRounds: recRounds, playoffSize: recTop }))}>
                    Aplicar
                  </Button>
                }
              >
                Para {form.expectedPlayers} jugadores se recomiendan {recRounds} jornadas suizas y {recTop ? `un top ${recTop}` : 'sin eliminatorias'}.
              </Alert>
            )}
            {form.playoffSize > form.expectedPlayers && <Alert severity="warning">El top es mayor que el número de jugadores previstos.</Alert>}

            <Divider />
            <Stack direction="row" sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Pausas (no cuentan como días de juego)
              </Typography>
              <Button startIcon={<Add />} size="small" onClick={() => set('breaks', [...form.breaks, { from: form.leagueStartsOn, to: form.leagueStartsOn, label: 'Pausa' }])}>
                Añadir
              </Button>
            </Stack>
            {form.breaks.map((b, i) => {
              const upd = (patch: Partial<Break>) => set('breaks', form.breaks.map((x, j) => (j === i ? { ...x, ...patch } : x)))
              return (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                  <TextField size="small" label="Motivo" value={b.label ?? ''} onChange={(e) => upd({ label: e.target.value })} />
                  <TextField size="small" type="date" label="Desde" value={b.from} onChange={(e) => upd({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField size="small" type="date" label="Hasta" value={b.to} onChange={(e) => upd({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                  <IconButton aria-label="Quitar pausa" onClick={() => set('breaks', form.breaks.filter((_, j) => j !== i))}>
                    <Delete />
                  </IconButton>
                </Stack>
              )
            })}

            <Divider />
            <Typography variant="subtitle1">Puntos y reglas</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' } }}>
              <TextField {...num('pointsWin')} label="Victoria" />
              <TextField {...num('pointsDraw')} label="Empate" />
              <TextField {...num('pointsLoss')} label="Derrota" />
              <TextField {...num('pointsLimit')} label="Puntos de lista" />
              <TextField {...num('reminderHours')} label="Aviso (horas antes)" />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Calendario resultante
          </Typography>
          <RoundList
            today={toIso(new Date())}
            rounds={plan.map((r) => ({ key: `${r.phase}${r.number}`, label: r.label, phase: r.phase, startsOn: r.startsOn, endsOn: r.endsOn }))}
          />
        </CardContent>
      </Card>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
      <Button variant="contained" size="large" onClick={save} disabled={saving || !form.name.trim() || startsBeforeClose} sx={{ alignSelf: 'flex-start' }}>
        {saving ? 'Guardando…' : 'Guardar temporada'}
      </Button>
    </Stack>
  )
}

function PlayersTab() {
  const { profile: me } = useAuth()
  const [list, setList] = useState<Profile[]>()
  const [error, setError] = useState<string>()

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('display_name')
    if (error) setError(error.message)
    else setList(data as Profile[])
  }
  useEffect(() => {
    load()
  }, [])

  async function toggle(p: Profile) {
    const { error } = await supabase.rpc('set_role', { target: p.id, new_role: p.role === 'admin' ? 'player' : 'admin' })
    if (error) setError(error.message)
    else load()
  }

  if (!list) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress />
  return (
    <Card>
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Typography color="text.secondary">{list.length} cuentas registradas. Activa el interruptor para dar permisos de administrador.</Typography>
        <List>
          {list.map((p) => (
            <ListItem key={p.id} secondaryAction={<Switch edge="end" checked={p.role === 'admin'} onChange={() => toggle(p)} disabled={p.id === me?.id} />}>
              <ListItemAvatar>
                <Avatar src={p.avatar_url ?? undefined}>{p.display_name[0]}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <span>{p.display_name}</span>
                    {p.role === 'admin' && <Chip size="small" color="secondary" label="Admin" />}
                  </Stack>
                }
                secondary={p.username ? `@${p.username}` : undefined}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

export default function AdminScreen() {
  const [tab, setTab] = useState(0)
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Administración</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Temporada" />
        <Tab label="Jugadores" />
      </Tabs>
      {tab === 0 ? <SeasonTab /> : <PlayersTab />}
    </Stack>
  )
}
