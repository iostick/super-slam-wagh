import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Round, Season } from './types'

/** Temporada actual: la más reciente que no está en borrador (o la última creada, para el admin). */
export function useCurrentSeason(includeDrafts = false) {
  const [season, setSeason] = useState<Season | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [players, setPlayers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('seasons').select('*').order('created_at', { ascending: false }).limit(1)
    if (!includeDrafts) q = q.neq('status', 'draft')
    const { data, error } = await q
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const s = (data?.[0] as Season | undefined) ?? null
    setSeason(s)
    if (s) {
      const [{ data: r }, { count }] = await Promise.all([
        supabase.from('rounds').select('*').eq('season_id', s.id).order('starts_on'),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', s.id).eq('dropped', false),
      ])
      setRounds((r as Round[]) ?? [])
      setPlayers(count ?? 0)
    } else {
      setRounds([])
      setPlayers(0)
    }
    setLoading(false)
  }, [includeDrafts])

  useEffect(() => {
    reload()
  }, [reload])

  return { season, rounds, players, loading, error, reload }
}
