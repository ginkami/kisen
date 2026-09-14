## Context

The pairing assistant drawer automates Swiss rounds (`pairingEngine.ts` + blossom matching). Hosts also need single-elimination stages. The drawer operates on the round being prepared (`publishedRounds + 1`) and already records every games change as one Undo/Redo action via a snapshot-recording effect in `TournamentEditForm`.

Terminology (user-approved):
- **Active** — a participant playing (or having won/bye-ed through) paired knockout games.
- **Eliminated** — a loser of a paired knockout game; from the next round on they receive a lone forfeit game (`status: 'forfeit'`, `result: 'player2_won'`) every round.
- **Virtual seed** — an abstract bottom-seeded placeholder used to pad the list to the next power of two; a real player drawn against a virtual seed gets a **bye** (`status: 'bye'`, `result: 'player1_won'`). Byes therefore always go to TOP seeds.
- **`{n}`** — pairs + byes of the round = bracket size / 2 = number of active players after the round. 6/7/8 players → «1/4 финала»; 9–16 → «1/8 финала»; continuation rounds: active (power of two) / 2.

## Goals / Non-Goals

**Goals:**
- `analyzeKnockoutBracket`: detect a strict single-elimination bracket covering ALL participants in the published rounds and return the bracket for continuation.
- `generateKnockoutPairings`: form the round for `publishedRounds + 1` — bracket continuation when possible, otherwise canonical knockout round 1 seeded by (points, rating) with manual-pair approximation and manual-forfeit eliminations.
- Drawer button `BsDiagram2Fill` "Сформировать пары 1/{{n}} финала" (not gated by the Swiss `actionsDisabled`), applying via one `updateGames` call.

**Non-Goals:**
- No reseeding between rounds (fixed bracket by design).
- No third-place matches, no double elimination.
- No changes to the Swiss engine or its gating.

## Decisions

### Decision 1: Bracket analysis by candidate start round
**Choice:** `analyzeKnockoutBracket` iterates candidate start rounds `s = 1..publishedRounds` (earliest valid wins). For `s`: every participant must be covered in round `s` (paired or bye), byes only in round `s`, and the paired games must match the canonical strict seeding of all participants sorted by (points before round `s`, rating) — padded to the next power of two with bottom virtual seeds. For every later round `r`: winners of round `r−1` (paired-game winners + bye recipients) must be exactly the participants in paired games of `r`, paired per bracket adjacency (winners of adjacent bracket slots), and every eliminated player must have exactly one forfeit game in `r`. On success the bracket (ordered match tree rooted at the round-`s` seeding) is returned; the continuation pairing for `publishedRounds + 1` follows the tree.
**Rationale:** the strict-seeding check only applies to the start round (later rounds follow the tree, not reseeding), which makes the earliest-start search deterministic and rejects Swiss histories (Swiss rounds pair everyone every round, so round `s+1` cannot be bracket-adjacent when more than two rounds exist... more precisely, Swiss histories fail the winners/losers accounting).
**Alternatives considered:** accepting any start round without the canonical seeding check (would accept arbitrary pairings as "brackets"); storing bracket state on the tournament (schema change — rejected).

### Decision 2: Canonical round generation with bottom virtual padding
**Choice:** `generateKnockoutPairings` first reconciles the current round's manual games: paired games (both players active) are kept as pre-formed bracket matches; forfeit games mark those players eliminated. If a bracket exists and the kept manual games don't break it → continuation; otherwise → knockout round 1: all remaining participants sorted by (points after published rounds, rating), padded to the next power of two with bottom virtual seeds, strictly seeded. Remaining players who cannot be paired due to padding get byes (top seeds). Manual games that make the canonical form impossible (e.g. an odd unusable remainder, a player in two games) → `PairingError`.
**Rationale:** matches the user-approved semantics including the "важный момент" (abstract bottom padding ⇒ byes to top seeds) and the manual-pair approximation.

### Decision 3: Elimination bookkeeping inside the generated round
**Choice:** every eliminated player (losers of previous knockout rounds, players eliminated by manual forfeits) receives a lone forfeit game (`status: 'forfeit'`, `result: 'player2_won'`) in the generated round — the board stays complete each round, mirroring the user's canonical description.
**Rationale:** keeps every participant placed in every round (consistent with `withAutoForfeits` semantics) and makes Undo/Redo snapshots uniform.

### Decision 4: Button semantics
**Choice:** the knockout button sits under the Swiss button, is never disabled by the Swiss `actionsDisabled` check, and is disabled only while generating. `{n}` is recomputed per render via `analyzeKnockoutBracket` + the manual-pair reconciliation. The result is applied via a single `updateGames(round, [...])` call (one Undo/Redo action). `PairingError` → existing alert modal.
**Rationale:** knockout validity is independent of Swiss round completeness; keeping one-action semantics reuses the history pipeline unchanged.

## Risks / Trade-offs

- **Bracket mis-detection on unusual histories** → the analysis is strict (canonical start + tree-adjacent continuation + full losers accounting); any deviation falls back to knockout round 1, which is always well-defined.
- **Odd remainder with manual pairs** → resolved by virtual padding (byes to top seeds), so `PairingError` is reserved for structurally impossible requests (duplicate placements).
- **Large fields** → bracket math is O(N log N); blossom is not needed for knockout (pairings are fully determined by the bracket).
