# Design

## Context

The knockout tools must give the host explicit control: the bracket size and the knockout round are chosen in the UI, and the engine must find or start exactly that bracket — without inventing forfeit games for eliminated players.

## Decisions

### Decision 1: Deterministic bracket search from the dropdowns
**Choice:** for knockout round `K` and bracket size `B`, the start round is fully determined: `s = publishedRounds + 2 − K` (`K = 1` starts at the round being prepared). Round `s` must contain a canonical knockout round 1 of size `B`: the players covered by paired/bye games (`B/2 ≤ covered ≤ B`) strictly seeded by points before round `s` (then rating), byes to the top `B − covered` seeds. Rounds `s+1..publishedRounds` must pair exactly the winners per bracket adjacency with fixed, non-draw results. Players outside the bracket (forfeits, byes of eliminated players) are unconstrained.
**Rationale:** no ambiguity in what the button will produce; the user's choices define the search instead of the engine guessing among candidate start rounds.
**Alternatives considered:** keeping the multi-candidate auto-detection and only adding dropdowns (still surprising results); persisting the bracket in the tournament document (schema change — rejected).

### Decision 2: No forfeit games from the engine
**Choice:** `generateKnockoutRoundGames` returns only the pairs (and byes in knockout round 1) of the chosen round. Eliminated players get no games — they remain unpaired. Existing manual forfeit games of the round are kept untouched.
**Rationale:** the user explicitly does not want the engine to decide eliminations; hosts can record forfeits manually via the existing per-card controls.

### Decision 3: Bracket size persisted in localStorage per tournament
**Choice:** key `kisen.pairingTools.knockoutBracketSize.<tournamentId>` (`'new'` for unsaved tournaments, mirroring `usePairingHistory`). Invalid saved values fall back to the default (smallest power of two ≥ participants count, min 4); the saved value is re-validated whenever the options change.
**Alternatives considered:** storing in the tournament document (server round-trip for a UI preference); IndexedDB draft storage (heavier than needed).

### Decision 4: Card blocked by the Swiss completeness condition
**Choice:** the whole card (both dropdowns and the generate button) is disabled under the same `actionsDisabled` condition as the Swiss actions (any round 1..publishedRounds with a paired game without a result or a participant without any game), plus while generating.
**Rationale:** forming knockout pairs on top of an incomplete earlier round produces an invalid state; the card now follows the same invariant as the rest of the drawer (the old knockout button was deliberately not blocked — that exception is removed).

### Decision 5: Brackets embedded in Swiss or arbitrary rounds
**Choice:** the bracket search constrains only the bracket's own games. In the start round a configuration of the round's bye games and paired games is searched (fewest ignored games first, bounded budget) whose covered players form the canonical knockout round 1; in continuation rounds every bracket pair just needs a game with a fixed, non-draw result. All other games of a round — Swiss games, consolation games between eliminated players, forfeits — are ignored and never invalidate the bracket.
**Rationale:** knockout stages are routinely embedded in ongoing Swiss tournaments or mixed with manually recorded games; rejecting a bracket because of unrelated games made the tool unusable (e.g. a consolation game (6,5) between two players eliminated in the semifinals broke the final's recognition).
**Alternatives considered:** strict per-round exact matching (previous behavior — rejected as too brittle); inferring the bracket from the seeding rank alone (bracket membership is by participation, not by rank).

## Migration Notes

- The old engine exports `analyzeKnockoutBracket`, `planKnockoutRound`, `generateKnockoutPairings` and the `KnockoutRoundInfo`/`KnockoutRoundPlan` types are removed; the drawer uses `generateKnockoutRoundGames` only.
- Tournaments that relied on the engine assigning forfeit games to eliminated players must record those forfeits manually if desired.

