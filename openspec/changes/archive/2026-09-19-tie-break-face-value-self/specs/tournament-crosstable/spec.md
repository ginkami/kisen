## MODIFIED Requirements

### Requirement: Tie-break computation and standings sorting

The crosstable model SHALL provide pure tie-break calculators with the following definitions. Unplayed rounds follow the «face value vs. self» convention:

- the participant's `points` are computed at face value: a bye contributes its result value (1 for a win bye, 0.5 for a draw bye), a forfeit contributes zero;
- an opponent's unplayed game counts toward the opponent's score as follows: a bye at face value (already inside the opponent's points) and a forfeit as 0.5 («vs. self» — the opponent played a draw against themselves); the adjusted opponent score = opponent points + 0.5 × the opponent's forfeit count;
- the participant's own skipped round (bye or forfeit) counts as a game against a virtual «robot» whose score equals the participant's own points at the computed round depth; the game against the robot is a draw.

The calculators:

- `points` = startingPoints + 1 per win + 0.5 per draw + the bye result value (1 for 'player1_won' or absent, 0.5 for 'draw')
- `BH` (Buchholz) = sum of the adjusted scores of all faced opponents, plus one robot entry (the participant's own points) per skipped round
- `BHC` (Buchholz cut) = BH minus the lowest N adjusted opponent scores (including robot entries), where N = `cutCount`
- `BHM` (median Buchholz) = BH minus the highest and the lowest adjusted opponent scores (including robot entries)
- `BH+` (Buchholz plus) = sum over faced opponents of (adjusted opponent score + own game result against that opponent), plus `own points + 0.5` per skipped round (a draw against the robot)
- `SB` (Sonneborn-Berger) = sum of adjusted scores of defeated opponents + 0.5 × sum of adjusted scores of drawn opponents, plus `0.5 × own points` per skipped round (a draw against the robot)
- `BH-BH` (Sum of Buchholz, `buchholz_sum`) = sum of the Buchholz values of the opponents the participant has faced, plus `own points` per skipped round (the robot's Buchholz equals the participant's own points)
- `DE` (direct encounter) = points scored in games against opponents currently tied on points
- `W` (wins count) = number of wins, not counting draw byes

Rows SHALL be sorted by the chain of tie-breaks in `settings.tieBreaks` order (each descending). The crosstable row number of a participant SHALL be their position (1-based) in this sorted order and SHALL be used as the opponent number in round cells.

#### Scenario: Sorting by points then Buchholz

- **WHEN** participant A has 3 points with BH 5 and participant B has 3 points with BH 7, and `tieBreaks = [points, buchholz]`
- **THEN** B is displayed above A

#### Scenario: Opponent number references the sorted position

- **WHEN** participant C is at sorted position 2 and participant A played against C in round 1
- **THEN** A's round-1 cell shows the number `2`

#### Scenario: Sum of Buchholz equals the sum of faced opponents' Buchholz

- **WHEN** participant A has faced opponents with Buchholz values 4 and 6, and `tieBreaks` include `buchholz_sum`
- **THEN** A's `buchholz_sum` value is `10`

#### Scenario: A skipped round contributes the participant's own score via the robot

- **WHEN** a participant with 3 points has one skipped round (bye or forfeit), and `tieBreaks` include `buchholz`
- **THEN** the participant's `buchholz` value includes a robot entry of `3` for the skipped round

#### Scenario: An opponent's forfeit contributes 0.5 to the participant's Buchholz

- **WHEN** participant A has faced participant B, and B has one forfeit in the computed rounds, and `tieBreaks` include `buchholz`
- **THEN** B's adjusted score counted in A's `buchholz` value includes `0.5` for the forfeit
