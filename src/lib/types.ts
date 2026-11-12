import type { Break } from './calendar'

export type UserRole = 'player' | 'admin'
export type SeasonStatus = 'draft' | 'registration' | 'league' | 'playoffs' | 'finished'

export interface Profile {
  id: string
  discord_id: string | null
  username: string | null
  display_name: string
  avatar_url: string | null
  role: UserRole
  guild_member: boolean
  created_at: string
}

export interface Season {
  id: string
  name: string
  status: SeasonStatus
  registration_closes_at: string
  league_starts_on: string
  swiss_rounds: number
  round_days: number
  playoff_size: number
  playoff_round_days: number
  breaks: Break[]
  points_win: number
  points_draw: number
  points_loss: number
  points_limit: number
  reminder_hours: number
  created_at: string
}

export interface Round {
  id: string
  season_id: string
  phase: 'swiss' | 'playoff'
  number: number
  label: string
  starts_on: string
  ends_on: string
  deadline: string
  paired_at: string | null
  closed_at: string | null
}

export const STATUS_LABEL: Record<SeasonStatus, string> = {
  draft: 'Borrador',
  registration: 'Inscripción abierta',
  league: 'Liga en juego',
  playoffs: 'Eliminatorias',
  finished: 'Terminada',
}
