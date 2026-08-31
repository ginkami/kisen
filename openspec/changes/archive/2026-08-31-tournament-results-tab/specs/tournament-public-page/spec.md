## MODIFIED Requirements

### Requirement: Placeholder sections

The «Описание» section SHALL render the tournament description content defined by the «Description tab content» requirement and SHALL NOT be a placeholder anymore. The «Результаты» section SHALL NOT be a placeholder anymore and SHALL render the results view defined by the «Results round tabs», «Results table», and «Results table headers» requirements.

#### Scenario: Description tab is no longer a placeholder

- **WHEN** the user opens the «Описание» tab of a tournament that has a description
- **THEN** the section area renders the description content instead of an empty placeholder

#### Scenario: Results tab is no longer a placeholder

- **WHEN** the user opens the «Результаты» tab of a tournament with at least one published round
- **THEN** the section area renders the rounds heading, round tabs, and the results table for the active round

## ADDED Requirements

### Requirement: Results round tabs

The «Результаты» section SHALL render a second-level heading («Туры»/«Rounds») and one tab per published round. Published rounds SHALL be the rounds numbered `1..min(roundCount, currentRound)` where `roundCount` is `schedule.rounds.length` and `currentRound` equals the number of published draws. Tabs for rounds greater than the last published round SHALL NOT be rendered. The default active round SHALL be the last published round. When no round is published (`currentRound == 0`), the section SHALL render the heading, a localized empty-state message, and no tabs or table.

#### Scenario: Published rounds only

- **WHEN** a tournament has 7 scheduled rounds and `currentRound == 3`
- **THEN** the section renders exactly three round tabs (1, 2, 3) with round 3 active

#### Scenario: No published rounds

- **WHEN** a tournament has scheduled rounds but `currentRound == 0`
- **THEN** the section renders the «Туры» heading and a localized empty-state message, and no tabs or table

#### Scenario: Switching rounds

- **WHEN** the user selects a different published round tab
- **THEN** the results table re-renders for the selected round

### Requirement: Results table content and ordering

For the active round, the «Результаты» section SHALL render a read-only table whose pair and bye rows SHALL be the games returned by `containersFromGames` for that round — the same boards, in the same pair-strength order, as displayed by the pairings board in the edit form — followed by one trailing row per forfeit game of that round. Each row SHALL start with a sequential pair number (1-based over all rendered rows). For each player the row SHALL render, in order: the country flag with a tooltip showing the country name in the current UI locale, the rank badge with the player's captured rating rank colorized per the crosstable color scale and a crown icon with a tooltip showing the title when the player has one, the player name as «familyName, givenName» picked for the current locale with fallback to `ru` then `en`, the captured rating value, and a badge with the points accumulated strictly before the active round (including `startingPoints`, excluding the active round itself). Bye rows SHALL leave all player-2 cells empty. Forfeit rows SHALL render only the forfeiting player and no player-2 cells.

#### Scenario: Boards match the pairings board order

- **WHEN** the pairings board for the active round lists boards sorted by descending pair strength
- **THEN** the results table lists the same boards in the same order, and forfeit games appear as rows after all pair and bye rows

#### Scenario: Points before the round

- **WHEN** a player has 2 points after round 1 and starting points 0, and round 2 is active
- **THEN** the player's points badge in the round-2 table shows 2

#### Scenario: Bye row

- **WHEN** the active round contains a bye game for a player
- **THEN** the row renders the player in the player-1 cells and all player-2 cells are empty

#### Scenario: Forfeit row

- **WHEN** the active round contains a forfeit game
- **THEN** the table renders a trailing row with only the forfeiting player's cells populated

### Requirement: Results result symbols

The result cell between the two players SHALL render: `? : ?` when the game has no result (including live, adjourned, and not-started games), `+ : -` when player 1 won, `- : +` when player 2 won, `= : =` for a draw, `+` for a bye (or `=` when the bye result is a draw, consistent with the crosstable), and `-` for a forfeit row.

#### Scenario: Outcome symbols

- **WHEN** the active round contains, respectively, a game without a result, a player-1 win, a player-2 win, and a draw
- **THEN** the result cells render `? : ?`, `+ : -`, `- : +`, and `= : =`

#### Scenario: Bye and forfeit symbols

- **WHEN** the active round contains a bye game won by its player and a forfeit game
- **THEN** the bye row's result cell renders `+` and the forfeit row's result cell renders `-`

### Requirement: Results table headers

The table header SHALL contain, left to right: an empty pair-number column; per player an empty flag column, an empty rank column, a name column header showing ☗ for player 1 and ☖ for player 2 when `settings.considerSente` is true (otherwise empty), a «Рейтинг»/«Rating» column header, and an «Очки»/«Pts» column header; and a result column header showing the localized round label («{{n}}-й тур»/«Round {{n}}») with the active round number.

#### Scenario: Sente-aware headers

- **WHEN** `settings.considerSente` is true
- **THEN** the player-1 name column header shows ☗ and the player-2 name column header shows ☖

#### Scenario: Headers without sente tracking

- **WHEN** `settings.considerSente` is false
- **THEN** both name column headers are empty

#### Scenario: Result column header

- **WHEN** round 2 is active
- **THEN** the result column header renders «2-й тур» in the `ru` locale and «Round 2» in the `en` locale
