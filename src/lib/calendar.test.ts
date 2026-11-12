import { describe, expect, it } from 'vitest'
import { planSeason, recommendedPlayoffSize, recommendedSwissRounds } from './calendar'

describe('planSeason', () => {
  it('reparte 4 jornadas de 14 días y un top 4, alargando la ronda que cae en Navidad', () => {
    const rounds = planSeason({
      leagueStartsOn: '2026-12-01',
      swissRounds: 4,
      roundDays: 14,
      playoffSize: 4,
      playoffRoundDays: 14,
      breaks: [{ from: '2026-12-24', to: '2026-12-30', label: 'Navidad' }],
    })
    expect(rounds.map((r) => [r.label, r.startsOn, r.endsOn])).toEqual([
      ['Jornada 1', '2026-12-01', '2026-12-14'],
      ['Jornada 2', '2026-12-15', '2027-01-04'],
      ['Jornada 3', '2027-01-05', '2027-01-18'],
      ['Jornada 4', '2027-01-19', '2027-02-01'],
      ['Semifinales', '2027-02-02', '2027-02-15'],
      ['Final', '2027-02-16', '2027-03-01'],
    ])
  })

  it('no empieza una ronda en plena pausa', () => {
    const rounds = planSeason({
      leagueStartsOn: '2026-12-24',
      swissRounds: 1,
      roundDays: 7,
      playoffSize: 0,
      playoffRoundDays: 7,
      breaks: [{ from: '2026-12-24', to: '2026-12-26' }],
    })
    expect(rounds).toEqual([{ phase: 'swiss', number: 1, label: 'Jornada 1', startsOn: '2026-12-27', endsOn: '2027-01-02' }])
  })

  it('genera cuartos, semifinales y final para un top 8', () => {
    const labels = planSeason({ leagueStartsOn: '2027-01-01', swissRounds: 5, roundDays: 7, playoffSize: 8, playoffRoundDays: 7, breaks: [] })
      .filter((r) => r.phase === 'playoff')
      .map((r) => r.label)
    expect(labels).toEqual(['Cuartos de final', 'Semifinales', 'Final'])
  })
})

describe('recomendaciones', () => {
  it('ajusta las rondas y el top al número de jugadores', () => {
    expect(recommendedSwissRounds(6)).toBe(3)
    expect(recommendedSwissRounds(10)).toBe(4)
    expect(recommendedSwissRounds(20)).toBe(5)
    expect(recommendedPlayoffSize(6)).toBe(4)
    expect(recommendedPlayoffSize(16)).toBe(8)
  })
})
