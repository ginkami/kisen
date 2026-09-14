import { describe, expect, it } from 'vitest'
import { maxWeightMatching, type BlossomEdge } from '../components/tournament/pairings/blossom.ts'

const SENTINEL = -1

/** Seeded PRNG (mulberry32) for reproducible random graphs. */
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

interface BruteResult {
  weight: number
  cardinality: number
  mate: number[]
}

/** Exhaustive maximum-weight matching for small graphs. */
function bruteForce(n: number, edges: BlossomEdge[], maxCardinality: boolean): BruteResult {
  let best: BruteResult = { weight: 0, cardinality: 0, mate: Array<number>(n).fill(SENTINEL) }
  const better = (candidate: BruteResult): boolean => {
    if (maxCardinality && candidate.cardinality !== best.cardinality) {
      return candidate.cardinality > best.cardinality
    }
    return candidate.weight > best.weight
  }
  const used = new Array<boolean>(n).fill(false)
  const mate = Array<number>(n).fill(SENTINEL)
  const rec = (v: number, weight: number, cardinality: number): void => {
    if (v === n) {
      const candidate: BruteResult = { weight, cardinality, mate: [...mate] }
      if (better(candidate)) best = candidate
      return
    }
    if (used[v]) {
      rec(v + 1, weight, cardinality)
      return
    }
    used[v] = true
    rec(v + 1, weight, cardinality)
    used[v] = false
    for (const e of edges) {
      const other = e.u === v ? e.v : e.v === v ? e.u : SENTINEL
      if (other === SENTINEL || used[other]) continue
      used[v] = true
      used[other] = true
      mate[v] = other
      mate[other] = v
      rec(v + 1, weight + e.w, cardinality + 1)
      used[v] = false
      used[other] = false
      mate[v] = SENTINEL
      mate[other] = SENTINEL
    }
  }
  rec(0, 0, 0)
  return best
}

function matchingWeight(mate: number[], edges: BlossomEdge[]): number {
  let weight = 0
  for (let v = 0; v < mate.length; v++) {
    if (mate[v] !== SENTINEL && v < mate[v]) {
      const e = edges.find((x) => (x.u === v && x.v === mate[v]) || (x.v === v && x.u === mate[v]))
      if (!e) throw new Error(`matched to non-neighbour: ${v}-${mate[v]}`)
      weight += e.w
    }
  }
  return weight
}

function assertValidMatching(mate: number[], n: number, edges: BlossomEdge[]): void {
  for (let v = 0; v < n; v++) {
    if (mate[v] === SENTINEL) continue
    expect(mate[mate[v]]).toBe(v)
    const e = edges.find((x) => (x.u === v && x.v === mate[v]) || (x.v === v && x.u === mate[v]))
    expect(e).toBeDefined()
  }
}

describe('maxWeightMatching', () => {
  it('handles no edges and isolated vertices', () => {
    expect(maxWeightMatching(0, [])).toEqual([])
    expect(maxWeightMatching(3, [])).toEqual([SENTINEL, SENTINEL, SENTINEL])
    expect(maxWeightMatching(4, [{ u: 0, v: 1, w: 5 }])).toEqual([1, 0, SENTINEL, SENTINEL])
  })

  it('matches a single edge', () => {
    expect(maxWeightMatching(2, [{ u: 0, v: 1, w: 1 }])).toEqual([1, 0])
  })

  it('leaves vertices unmatched when that maximizes weight', () => {
    expect(
      maxWeightMatching(5, [
        { u: 1, v: 2, w: 5 },
        { u: 2, v: 3, w: 11 },
        { u: 3, v: 4, w: 5 },
      ]),
    ).toEqual([SENTINEL, SENTINEL, 3, 2, SENTINEL])
  })

  it('supports max cardinality', () => {
    const edges: BlossomEdge[] = [
      { u: 1, v: 2, w: 5 },
      { u: 2, v: 3, w: 11 },
      { u: 3, v: 4, w: 5 },
    ]
    expect(maxWeightMatching(5, edges, true)).toEqual([SENTINEL, 2, 1, 4, 3])
  })

  it('handles negative weights', () => {
    const edges: BlossomEdge[] = [
      { u: 1, v: 2, w: 2 },
      { u: 1, v: 3, w: -2 },
      { u: 2, v: 3, w: 1 },
      { u: 2, v: 4, w: -1 },
      { u: 3, v: 4, w: -6 },
    ]
    expect(maxWeightMatching(5, edges)).toEqual([SENTINEL, 2, 1, SENTINEL, SENTINEL])
    expect(maxWeightMatching(5, edges, true)).toEqual([SENTINEL, 3, 4, 1, 2])
  })

  it('creates an S-blossom and uses it for augmentation', () => {
    expect(
      maxWeightMatching(5, [
        { u: 1, v: 2, w: 8 },
        { u: 1, v: 3, w: 9 },
        { u: 2, v: 3, w: 10 },
        { u: 3, v: 4, w: 7 },
      ]),
    ).toEqual([SENTINEL, 2, 1, 4, 3])
    expect(
      maxWeightMatching(7, [
        { u: 1, v: 2, w: 8 },
        { u: 1, v: 3, w: 9 },
        { u: 2, v: 3, w: 10 },
        { u: 3, v: 4, w: 7 },
        { u: 1, v: 6, w: 5 },
        { u: 4, v: 5, w: 6 },
      ]),
    ).toEqual([SENTINEL, 6, 3, 2, 5, 4, 1])
  })

  it('relabels an S-blossom as T and uses it for augmentation', () => {
    expect(
      maxWeightMatching(7, [
        { u: 1, v: 2, w: 9 },
        { u: 1, v: 3, w: 8 },
        { u: 2, v: 3, w: 10 },
        { u: 1, v: 4, w: 5 },
        { u: 4, v: 5, w: 4 },
        { u: 1, v: 6, w: 3 },
      ]),
    ).toEqual([SENTINEL, 6, 3, 2, 5, 4, 1])
    expect(
      maxWeightMatching(7, [
        { u: 1, v: 2, w: 9 },
        { u: 1, v: 3, w: 8 },
        { u: 2, v: 3, w: 10 },
        { u: 1, v: 4, w: 5 },
        { u: 4, v: 5, w: 3 },
        { u: 3, v: 6, w: 4 },
      ]),
    ).toEqual([SENTINEL, 2, 1, 6, 5, 4, 3])
  })

  it('creates nested S-blossoms and expands them recursively', () => {
    expect(
      maxWeightMatching(9, [
        { u: 1, v: 2, w: 8 },
        { u: 1, v: 3, w: 8 },
        { u: 2, v: 3, w: 10 },
        { u: 2, v: 4, w: 12 },
        { u: 3, v: 5, w: 12 },
        { u: 4, v: 5, w: 14 },
        { u: 4, v: 6, w: 12 },
        { u: 5, v: 7, w: 12 },
        { u: 6, v: 7, w: 14 },
        { u: 7, v: 8, w: 12 },
      ]),
    ).toEqual([SENTINEL, 2, 1, 5, 6, 3, 4, 8, 7])
  })


  it('expands a T-blossom with nasty relabeling', () => {
    expect(
      maxWeightMatching(11, [
        { u: 1, v: 2, w: 45 },
        { u: 1, v: 5, w: 45 },
        { u: 2, v: 3, w: 50 },
        { u: 3, v: 4, w: 45 },
        { u: 4, v: 5, w: 50 },
        { u: 1, v: 6, w: 30 },
        { u: 3, v: 9, w: 35 },
        { u: 4, v: 8, w: 35 },
        { u: 5, v: 7, w: 26 },
        { u: 9, v: 10, w: 5 },
      ]),
    ).toEqual([SENTINEL, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9])
  })

  it('expands a nested T-blossom with an inner blossom on the augmenting path', () => {
    expect(
      maxWeightMatching(13, [
        { u: 1, v: 2, w: 45 },
        { u: 1, v: 7, w: 45 },
        { u: 2, v: 3, w: 50 },
        { u: 3, v: 4, w: 45 },
        { u: 4, v: 5, w: 95 },
        { u: 4, v: 6, w: 94 },
        { u: 5, v: 6, w: 94 },
        { u: 6, v: 7, w: 50 },
        { u: 1, v: 8, w: 30 },
        { u: 3, v: 11, w: 35 },
        { u: 5, v: 9, w: 36 },
        { u: 7, v: 10, w: 26 },
        { u: 11, v: 12, w: 5 },
      ]),
    ).toEqual([SENTINEL, 8, 3, 2, 6, 9, 4, 10, 1, 5, 7, 12, 11])
  })

  it('matches the brute-force optimum on random small graphs', () => {
    const rng = mulberry32(42)
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(rng() * 9) // 2..10 vertices
      const edgeCount = Math.floor(rng() * ((n * (n - 1)) / 2) * 0.7)
      const edgeSet = new Map<string, BlossomEdge>()
      while (edgeSet.size < edgeCount) {
        const u = Math.floor(rng() * n)
        const v = Math.floor(rng() * n)
        if (u === v) continue
        const key = u < v ? `${u}-${v}` : `${v}-${u}`
        const w = Math.floor(rng() * 21) - 8 // weights -8..12
        edgeSet.set(key, { u, v, w })
      }
      const edges = [...edgeSet.values()]
      const maxCardinality = rng() < 0.5
      const mate = maxWeightMatching(n, edges, maxCardinality)
      assertValidMatching(mate, n, edges)
      const expected = bruteForce(n, edges, maxCardinality)
      expect(matchingWeight(mate, edges)).toBe(expected.weight)
      if (maxCardinality) {
        expect(mate.filter((m) => m !== SENTINEL).length / 2).toBe(expected.cardinality)
      }
    }
  })
})

