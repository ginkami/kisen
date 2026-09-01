import { computeTournamentStatus } from '../services/tournamentService.ts'
import type { Game, TournamentStatus } from '../domain/tournament.ts'

function makeGame(overrides: Partial<Game> & { round: number }): Game {
  return {
    id: `game-${Math.random().toString(36).slice(2)}`,
    player1: 1, player2: 2, sente: 'unknown', handicap: null,
    result: null, status: 'not_started',
    ...overrides,
  }
}

const base = {
  existingStatus: 'upcoming' as TournamentStatus,
  publishedRounds: 0,
  games: [] as Game[],
  scheduleRounds: [{ number: 1, scheduledAt: new Date('2099-01-01') }],
  editTime: new Date('2025-01-01'),
}

describe('computeTournamentStatus', () => {
  describe('publish', () => {
    it('publish without pairings → upcoming', () => {
      expect(computeTournamentStatus({ ...base, requested: 'upcoming' })).toBe('upcoming')
    })
    it('publish with round-1 pairings → ongoing', () => {
      const games = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
      expect(computeTournamentStatus({ ...base, requested: 'upcoming', games })).toBe('ongoing')
    })
  })

  describe('draw publication', () => {
    it('publishedRounds >= 1 → ongoing', () => {
      expect(computeTournamentStatus({ ...base, publishedRounds: 1 })).toBe('ongoing')
    })
    it('round-1 games exist → ongoing', () => {
      const games = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
      expect(computeTournamentStatus({ ...base, games })).toBe('ongoing')
    })
  })

  describe('finished', () => {
    it('last round all results fixed → finished', () => {
      const games = [
        makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
        makeGame({ round: 2, player1: 1, player2: 2, result: 'draw', status: 'completed' }),
      ]
      const scheduleRounds = [
        { number: 1, scheduledAt: new Date('2025-01-01') },
        { number: 2, scheduledAt: new Date('2025-01-02') },
      ]
      expect(computeTournamentStatus({ ...base, existingStatus: 'ongoing', publishedRounds: 2, games, scheduleRounds })).toBe('finished')
    })
    it('bye and forfeit count as fixed outcomes', () => {
      const games = [
        makeGame({ round: 1, player1: 1, player2: null, status: 'bye', result: 'player1_won' }),
        makeGame({ round: 1, player1: 2, player2: null, status: 'forfeit', result: 'player2_won' }),
      ]
      expect(computeTournamentStatus({ ...base, existingStatus: 'ongoing', publishedRounds: 1, games })).toBe('finished')
    })
    it('empty last round is not finished', () => {
      const scheduleRounds = [{ number: 1, scheduledAt: new Date('2025-01-01') }, { number: 2, scheduledAt: new Date('2025-01-02') }]
      const games = [makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' })]
      expect(computeTournamentStatus({ ...base, existingStatus: 'ongoing', publishedRounds: 1, games, scheduleRounds })).toBe('ongoing')
    })
    it('last round with undecided result → not finished', () => {
      const games = [
        makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
        makeGame({ round: 2, player1: 1, player2: 2, result: null, status: 'not_started' }),
      ]
      const scheduleRounds = [{ number: 1, scheduledAt: new Date('2025-01-01') }, { number: 2, scheduledAt: new Date('2025-01-02') }]
      expect(computeTournamentStatus({ ...base, existingStatus: 'ongoing', publishedRounds: 2, games, scheduleRounds })).toBe('ongoing')
    })
  })
  describe('symmetric rollback', () => {
    it('removing last result rolls finished → ongoing', () => {
      const games = [
        makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
        makeGame({ round: 2, player1: 1, player2: 2, result: null, status: 'not_started' }),
      ]
      const scheduleRounds = [{ number: 1, scheduledAt: new Date('2025-01-01') }, { number: 2, scheduledAt: new Date('2025-01-02') }]
      expect(computeTournamentStatus({ ...base, existingStatus: 'finished', publishedRounds: 2, games, scheduleRounds })).toBe('ongoing')
    })
    it('unpublish all draws + future start → upcoming', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'ongoing', publishedRounds: 0, games: [] })).toBe('upcoming')
    })
  })

  describe('time fallback', () => {
    it('upcoming + first round started → ongoing', () => {
      expect(computeTournamentStatus({ ...base, editTime: new Date('2025-06-01'), scheduleRounds: [{ number: 1, scheduledAt: new Date('2025-01-01') }] })).toBe('ongoing')
    })
  })

  describe('sticky manual statuses', () => {
    it('draft stays draft without explicit upcoming', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'draft', publishedRounds: 1 })).toBe('draft')
    })
    it('draft leaves via publish (requested upcoming)', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'draft', requested: 'upcoming' })).toBe('upcoming')
    })
    it('canceled is sticky', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'canceled', publishedRounds: 1 })).toBe('canceled')
    })
    it('proposed_for_removing is sticky', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'proposed_for_removing', publishedRounds: 1 })).toBe('proposed_for_removing')
    })
    it('canceled can be changed by explicit request', () => {
      expect(computeTournamentStatus({ ...base, existingStatus: 'canceled', requested: 'upcoming' })).toBe('upcoming')
    })
  })
})