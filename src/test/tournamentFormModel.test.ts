import { describe, expect, it } from 'vitest'
import type { Game } from '../domain/tournament.ts'
import {
  gamesWithoutParticipants,
  isEmptyParticipantRow,
  lateJoinerForfeitGames,
} from '../hooks/tournamentFormModel.ts'

function makeGame(overrides: Partial<Game> & { round: number }): Game {
  return {
    id: `game-${Math.random().toString(36).slice(2)}`,
    player1: 0,
    player2: null,
    sente: 'unknown',
    handicap: null,
    result: null,
    status: 'not_started',
    ...overrides,
  }
}

describe('gamesWithoutParticipants', () => {
  it('removes lone games (player2 = null) of the participant in all rounds', () => {
    const games = [
      makeGame({ round: 1, player1: 22, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 2, player1: 22, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 3, player1: 22, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 1, player1: 5, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 2, player1: 5, player2: 7 }),
    ]
    const result = gamesWithoutParticipants(games, [22], 3)
    expect(result).toHaveLength(2)
    expect(result.every((g) => g.player1 !== 22 && g.player2 !== 22)).toBe(true)
  })

  it('removes an unpublished paired game (round > publishedRounds), leaving the opponent unpaired', () => {
    const games = [makeGame({ round: 4, player1: 22, player2: 7 })]
    const result = gamesWithoutParticipants(games, [22], 3)
    expect(result).toHaveLength(0)
  })

  it('keeps published paired games (round <= publishedRounds) unchanged', () => {
    const games = [
      makeGame({ round: 1, player1: 22, player2: 7, status: 'completed', result: 'player1_won' }),
      makeGame({ round: 3, player1: 7, player2: 22, status: 'completed', result: 'draw' }),
    ]
    const result = gamesWithoutParticipants(games, [22], 3)
    expect(result).toEqual(games)
  })

  it('keeps paired games between other participants untouched', () => {
    const games = [
      makeGame({ round: 4, player1: 5, player2: 7 }),
      makeGame({ round: 5, player1: 8, player2: 9 }),
    ]
    const result = gamesWithoutParticipants(games, [22], 3)
    expect(result).toEqual(games)
  })

  it('is a no-op when no participant ids are removed', () => {
    const games = [makeGame({ round: 1, player1: 22, player2: null })]
    expect(gamesWithoutParticipants(games, [], 3)).toBe(games)
  })

  it('handles several removed participants at once', () => {
    const publishedPaired = makeGame({ round: 1, player1: 5, player2: 23 })
    const games = [
      makeGame({ round: 1, player1: 22, player2: null }),
      publishedPaired, // published paired game of removed id 23: kept by design
      makeGame({ round: 4, player1: 22, player2: 5 }),
    ]
    const result = gamesWithoutParticipants(games, [22, 23], 3)
    expect(result).toEqual([publishedPaired])
  })
})

describe('lateJoinerForfeitGames', () => {
  let idCounter = 0
  const nextId = () => `forfeit-${++idCounter}`

  it('creates forfeit games for rounds 1..publishedRounds without existing games', () => {
    const forfeits = lateJoinerForfeitGames([], 22, 3, false, nextId)
    expect(forfeits.map((g) => g.round)).toEqual([1, 2, 3])
    expect(forfeits[0]).toEqual({
      id: 'forfeit-1',
      player1: 22,
      player2: null,
      sente: 'unknown',
      handicap: null,
      result: 'player2_won',
      status: 'forfeit',
      round: 1,
    })
  })

  it('respects considerSente for the sente field', () => {
    const [game] = lateJoinerForfeitGames([], 22, 1, true, nextId)
    expect(game.sente).toBe('player1')
  })

  it('returns no games when publishedRounds is 0', () => {
    expect(lateJoinerForfeitGames([], 22, 0, false, nextId)).toEqual([])
  })

  it('regression (id-22): skips rounds where the id already has a game as player1 or player2', () => {
    // Reused id already has a lone forfeit in round 1 and a paired game in round 3.
    const games = [
      makeGame({ round: 1, player1: 22, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 2, player1: 7, player2: 22 }),
      makeGame({ round: 3, player1: 22, player2: null }),
    ]
    const forfeits = lateJoinerForfeitGames(games, 22, 3, false, nextId)
    expect(forfeits).toEqual([])
  })

  it('only creates forfeits for the rounds actually missing', () => {
    const games = [
      makeGame({ round: 1, player1: 22, player2: null }),
      makeGame({ round: 3, player1: 9, player2: 22 }),
    ]
    const forfeits = lateJoinerForfeitGames(games, 22, 3, false, nextId)
    expect(forfeits.map((g) => g.round)).toEqual([2])
  })
})

describe('isEmptyParticipantRow (save-time drop of nameless rows)', () => {
  const locales = (overrides: Record<string, Partial<{ familyName: string; givenName: string }>> = {}) =>
    Object.fromEntries(
      ['ru', 'en', 'de'].map((locale) => [
        locale,
        { familyName: '', givenName: '', title: '', location: '', ...overrides[locale] },
      ])
    )

  it('treats a fully nameless row as empty', () => {
    const row = { id: 22, locales: locales() }
    expect(isEmptyParticipantRow(row)).toBe(true)
  })

  it('treats a row with a name in any locale as not empty', () => {
    const row = { id: 22, locales: locales({ ru: { familyName: 'Иванов', givenName: 'Иван' } }) }
    expect(isEmptyParticipantRow(row)).toBe(false)
  })

  it('treats a row with only a familyName as empty', () => {
    const row = { id: 22, locales: locales({ en: { familyName: 'Smith' } }) }
    expect(isEmptyParticipantRow(row)).toBe(true)
  })

  it('treats whitespace-only names as empty', () => {
    const row = { id: 22, locales: locales({ de: { familyName: '  ', givenName: '  ' } }) }
    expect(isEmptyParticipantRow(row)).toBe(true)
  })

  it('save-time composition: nameless-row games are dropped, named rows untouched', () => {
    // Mirrors formStateToUpdateInput: rows dropped as empty (id > 0) are passed
    // to gamesWithoutParticipants before persisting games.
    const games = [
      makeGame({ round: 1, player1: 22, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 2, player1: 5, player2: 7 }),
    ]
    const rows = [
      { id: 22, locales: locales() }, // nameless -> dropped on save
      { id: 5, locales: locales({ ru: { familyName: 'А', givenName: 'Б' } }) },
    ]
    const droppedIds = rows.filter((r) => isEmptyParticipantRow(r) && r.id > 0).map((r) => r.id)
    const result = gamesWithoutParticipants(games, droppedIds, 2)
    expect(result).toEqual([games[1]])
  })
})

