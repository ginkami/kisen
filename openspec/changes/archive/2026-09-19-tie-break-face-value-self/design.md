# Design

## Context

Tie-break coefficients based on opponents' results ignored unplayed rounds: an opponent's forfeit contributed 0 and the player's own skipped round contributed nothing to their Buchholz family values.

## Decisions

### Decision 1: The change lives in the crosstable, not the pairing engine
**Choice:** the convention is implemented in `crosstableModel.ts` (tie-break computation) only.
**Rationale:** the pairing engine uses only face-value points for score groups and computes no opponent-result coefficients; «final score» semantics of the virtual robot are meaningful for tie-breaks computed over completed rounds.
**Alternatives considered:** adjusting pairing score groups (nonsensical — final scores are unknown mid-tournament).

### Decision 2: One-level convention without recursion into opponents' robots
**Choice:** an opponent's adjusted score = their face-value points + 0.5 per own forfeit («vs. self» draw); the player's own skipped round contributes a robot whose score equals the player's own points at the computed depth.
**Rationale:** matches the user-defined convention directly; full recursion into opponents' virtual rounds has no FIDE analogue and complicates the model without a demonstrated need.
**Alternatives considered:** recursive robot chains (rejected — unbounded complexity).

### Decision 3: The robot participates in every opponent-result tie-break
**Choice:** BH/BHC/BHM get a robot score entry per skipped round; BH-BH counts the robot's BH as the player's own points (the robot "is" the player); BH+ and SB treat the round as a draw against the robot (`own points + 0.5` / `0.5 × own points`). W and DE stay unchanged — they are not based on opponents' result totals.
**Rationale:** «all coefficients based on opponents' results» per the requirement; W counts the player's own wins and DE only real games, so the robot has nothing to contribute there.
