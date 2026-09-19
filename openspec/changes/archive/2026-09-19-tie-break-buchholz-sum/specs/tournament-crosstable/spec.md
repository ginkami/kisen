## MODIFIED Requirements

### Requirement: Tie-break computation and standings sorting

The crosstable model SHALL provide pure tie-break calculators with the following definitions (points of an opponent are their total points from games plus starting points; a bye contributes its result value — 1 for a win bye, 0.5 for a draw bye; forfeit gives zero points):

- `points` = startingPoints + 1 per win + 0.5 per draw + the bye result value (1 for 'player1_won' or absent, 0.5 for 'draw')
- `BH` (Buchholz) = sum of opponents' points across all games played by the participant
- `BHC` (Buchholz cut) = BH minus the lowest N opponents' points, where N = `cutCount`
- `BHM` (median Buchholz) = BH minus the highest and the lowest opponents' points
- `BH+` (Buchholz plus) = sum over opponents of (opponent points + own game result against that opponent)
- `SB` (Sonneborn-Berger) = sum of points of defeated opponents + 0.5 × sum of points of drawn opponents
- `BH-BH` (Sum of Buchholz, `buchholz_sum`) = sum of the Buchholz values of the opponents the participant has faced; a bye provides no opponent and contributes nothing; forfeit games are excluded
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

#### Scenario: A bye contributes nothing to Sum of Buchholz

- **WHEN** a participant's games up to the round include a bye and one opponent with Buchholz 5, and `tieBreaks` include `buchholz_sum`
- **THEN** the participant's `buchholz_sum` value is `5`
