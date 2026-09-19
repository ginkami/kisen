## Why

Tie-break coefficients based on opponents' results currently ignore unplayed rounds: a forfeited game contributes 0 and the player's own skipped round contributes nothing to their Buchholz family values. This under-rewards participants who faced stronger fields and lets skippers hide. The FIDE-style «face value vs. self» convention fixes both.

## What Changes

- Opponent's forfeit: contributes 0.5 to their adjusted score (a «vs. self» draw) in every opponent-result tie-break (BH, BHC, BHM, BH+, SB, BH-BH). Opponent's bye already counts at face value — unchanged.
- Participant's own skipped round (bye or forfeit): counts as a game against a virtual «robot» whose score equals the participant's own points at the computed round depth; the game is a draw. The robot's score enters the BH/BHC/BHM lists and BH-BH; BH+ adds `own points + 0.5` and SB adds `0.5 × own points` per skipped round.
- `points`, `DE` and `W` keep their current definitions.

## Capabilities

### Modified Capabilities
- `tournament-crosstable`: the tie-break computation requirement redefines the calculators under the «face value vs. self» convention with new scenarios.

## Impact

- **Affected specs:** `openspec/specs/tournament-crosstable/spec.md`.
- **Affected code:** `src/components/tournament/crosstable/crosstableModel.ts` (skip counting, adjusted opponent scores, robot entries), tests (`crosstableModel.test.ts`).
- The pairing engine is not affected (it uses only face-value points for score groups).
