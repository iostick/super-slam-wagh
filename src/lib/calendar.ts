// Calendario de la temporada: reparte las jornadas suizas y las eliminatorias a partir de
// la fecha de inicio, los días por ronda y las pausas (por ejemplo, Navidad).
// Las fechas se manejan como 'YYYY-MM-DD' para no depender de la zona horaria.

export interface Break {
  from: string
  to: string
  label?: string
}

export interface CalendarInput {
  leagueStartsOn: string
  swissRounds: number
  roundDays: number
  playoffSize: number // 0 = sin eliminatorias
  playoffRoundDays: number
  breaks: Break[]
}

export interface PlannedRound {
  phase: 'swiss' | 'playoff'
  number: number
  label: string
  startsOn: string
  endsOn: string
}

const DAY = 86_400_000

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY)
}

function inBreak(iso: string, breaks: Break[]): boolean {
  return breaks.some((b) => b.from <= iso && iso <= b.to)
}

/** Una ronda dura `days` días de juego; los días de pausa no cuentan y alargan la ronda. */
function planRound(start: string, days: number, breaks: Break[]): { startsOn: string; endsOn: string } {
  let cursor = start
  while (inBreak(cursor, breaks)) cursor = addDays(cursor, 1)
  const startsOn = cursor
  let playable = 0
  let endsOn = cursor
  for (;;) {
    if (!inBreak(cursor, breaks)) {
      playable++
      endsOn = cursor
      if (playable === days) break
    }
    cursor = addDays(cursor, 1)
  }
  // Si la ronda termina justo antes de una pausa, la pausa se queda dentro de la ronda
  let next = addDays(endsOn, 1)
  while (inBreak(next, breaks)) {
    endsOn = next
    next = addDays(next, 1)
  }
  return { startsOn, endsOn }
}

export function playoffLabel(playersLeft: number): string {
  if (playersLeft <= 2) return 'Final'
  if (playersLeft <= 4) return 'Semifinales'
  if (playersLeft <= 8) return 'Cuartos de final'
  return 'Octavos de final'
}

export function planSeason(input: CalendarInput): PlannedRound[] {
  const rounds: PlannedRound[] = []
  let next = input.leagueStartsOn
  for (let i = 1; i <= input.swissRounds; i++) {
    const r = planRound(next, input.roundDays, input.breaks)
    rounds.push({ phase: 'swiss', number: i, label: `Jornada ${i}`, ...r })
    next = addDays(r.endsOn, 1)
  }
  let left = input.playoffSize
  let n = 1
  while (left >= 2) {
    const r = planRound(next, input.playoffRoundDays, input.breaks)
    rounds.push({ phase: 'playoff', number: n++, label: playoffLabel(left), ...r })
    next = addDays(r.endsOn, 1)
    left /= 2
  }
  return rounds
}

/** Rondas suizas recomendadas para que salga un líder claro: log2(jugadores), mínimo 3. */
export function recommendedSwissRounds(players: number): number {
  return Math.max(3, Math.ceil(Math.log2(Math.max(players, 2))))
}

/** Tamaño de eliminatorias recomendado según los inscritos. */
export function recommendedPlayoffSize(players: number): number {
  if (players >= 16) return 8
  if (players >= 6) return 4
  if (players >= 4) return 2
  return 0
}

/** Hora límite de una ronda: el último día a las 23:59 en la zona horaria del navegador. */
export function deadlineOf(endsOn: string): Date {
  const [y, m, d] = endsOn.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 0)
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return toDate(iso).toLocaleDateString('es-ES', { ...opts, timeZone: 'UTC' })
}
