import { describe, expect, it } from 'vitest'
import type { Game, Participant } from '../domain/tournament.ts'
import { generatePairings } from '../components/tournament/pairings/pairingEngine.ts'

const SENTINEL = -1

/** Seeded PRNG (mulberry32) for reproducible simulations. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeParticipants(n: number, rng: () => number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    player: null,
    locales: { ru: { familyName: `F${i + 1}`, givenName: 'X' } },
    capturedRating: { value: 800 + Math.floor(rng() * 35) * 50, rank: null },
    startingPoints: 0,
  }))
}

/** Simulates a full Swiss tournament with auto-pairing each round. */
function simulate(n: number, roundCount: number, considerSente: boolean, seed: number): void {
  const rng = mulberry32(seed)
  const participants = makeParticipants(n, rng)
  const games: Game[] = []
  const playedPairs = new Set<string>()
  const skipped = new Set<number>()
  const balance = new Map<number, number>()
  const colors = new Map<number, Array<'sente' | 'gote'>>()
  for (const p of participants) {
    balance.set(p.id, 0)
    colors.set(p.id, [])
  }

  for (let round = 1; round <= roundCount; round++) {
    const newGames = generatePairings({
      participants,
      games,
      round,
      publishedRounds: round - 1,
      considerSente,
    })
    games.push(...newGames)

    // Invariant: every participant is placed in exactly one game per round.
    const placed = new Set<number>()
    for (const g of newGames) {
      placed.add(g.player1)
      if (g.player2 != null) placed.add(g.player2)
    }
    expect(placed.size).toBe(n)

    for (const g of newGames) {
      if (g.status === 'bye') {
        // Invariant: no participant receives more than one bye.
        expect(skipped.has(g.player1)).toBe(false)
        skipped.add(g.player1)
        continue
      }
      if (g.player2 == null) continue
      // Invariant: no rematches.
      const key = [g.player1, g.player2].sort((a, b) => a - b).join('-')
      expect(playedPairs.has(key)).toBe(false)
      playedPairs.add(key)
      // Invariant: score difference is small (score-group priority).
      const pts = (id: number) => {
        const p = participants.find((x) => x.id === id)
        let points = p?.startingPoints ?? 0
        for (const h of games) {
          if (h.round >= round || h.status === 'forfeit') continue
          const isP1 = h.player1 === id
          const isP2 = h.player2 === id
          if (!isP1 && !isP2) continue
          if (h.status === 'bye') {
            if (isP1) points += h.result === 'draw' ? 0.5 : 1
            continue
          }
          if (h.result === 'draw') points += 0.5
          else if ((h.result === 'player1_won' && isP1) || (h.result === 'player2_won' && isP2)) points += 1
        }
        return points
      }
      expect(Math.abs(pts(g.player1) - pts(g.player2))).toBeLessThanOrEqual(3)

      if (considerSente) {
        const senteId = g.sente === 'player1' ? g.player1 : (g.player2 as number)
        const goteId = g.sente === 'player1' ? (g.player2 as number) : g.player1
        balance.set(senteId, (balance.get(senteId) as number) + 1)
        balance.set(goteId, (balance.get(goteId) as number) - 1)
        colors.get(senteId)?.push('sente')
        colors.get(goteId)?.push('gote')
      }
    }

    if (considerSente) {
      // Invariants: color balance within ±2, no three identical colors in a row.
      for (const p of participants) {
        expect(Math.abs(balance.get(p.id) as number)).toBeLessThanOrEqual(2)
        const list = colors.get(p.id) as Array<'sente' | 'gote'>
        const tail = list.slice(-3)
        if (tail.length === 3) {
          expect(new Set(tail).size).toBeGreaterThan(1)
        }
      }
    }

    // Random results, then the round is published.
    for (const g of newGames) {
      if (g.player2 == null || g.result != null) continue
      const roll = rng()
      g.result = roll < 0.45 ? 'player1_won' : roll < 0.9 ? 'player2_won' : 'draw'
      g.status = 'completed'
    }
  }
}

describe('Swiss pairing simulations', () => {
  const playerCounts = [8, 9, 16, 33]
  // Small fields exhaust the unplayed-pair graph quickly (after 5 rounds of
  // 8 players a full round can become mathematically impossible), so fewer
  // rounds are simulated there.
  const roundsByCount: Record<number, number> = { 8: 4, 9: 5, 16: 6, 33: 6 }

  for (const considerSente of [false, true]) {
    it(
      `keeps Swiss invariants over multiple rounds (considerSente=${considerSente})`,
      () => {
        let seed = 1
        for (const n of playerCounts) {
          for (let trial = 0; trial < 4; trial++) {
            simulate(n, roundsByCount[n] as number, considerSente, seed++)
          }
        }
      },
      20000,
    )
  }

  it('produces a full draw for a single odd round with one bye', () => {
    simulate(9, 5, false, 999)
  })
})

// Re-use of SENTINEL guard: keep the constant referenced for readability.
void SENTINEL
