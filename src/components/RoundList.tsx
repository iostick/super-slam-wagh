import { Box, Chip, Stack, Typography } from '@mui/material'
import { formatDay } from '../lib/calendar'

export interface RoundRow {
  key: string
  label: string
  phase: 'swiss' | 'playoff'
  startsOn: string
  endsOn: string
}

export function roundState(r: RoundRow, today: string): 'past' | 'current' | 'future' {
  if (r.endsOn < today) return 'past'
  if (r.startsOn <= today) return 'current'
  return 'future'
}

export default function RoundList({ rounds, today }: { rounds: RoundRow[]; today: string }) {
  return (
    <Stack spacing={1}>
      {rounds.map((r) => {
        const state = roundState(r, today)
        return (
          <Box
            key={r.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1.5,
              borderRadius: 2,
              border: 1,
              borderColor: state === 'current' ? 'primary.main' : 'divider',
              bgcolor: state === 'current' ? 'rgba(229,57,53,0.08)' : 'transparent',
              opacity: state === 'past' ? 0.6 : 1,
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500 }}>{r.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDay(r.startsOn)} – {formatDay(r.endsOn)} · límite {formatDay(r.endsOn, { weekday: 'short', day: 'numeric', month: 'short' })} 23:59
              </Typography>
            </Box>
            {r.phase === 'playoff' && <Chip size="small" color="secondary" variant="outlined" label="Eliminatoria" />}
            {state === 'current' && <Chip size="small" color="primary" label="En juego" />}
          </Box>
        )
      })}
    </Stack>
  )
}
