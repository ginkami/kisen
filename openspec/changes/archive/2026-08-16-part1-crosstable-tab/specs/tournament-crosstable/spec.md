## ADDED Requirements

### Requirement: Crosstable tab

The tournament edit form (`TournamentEditForm.tsx`) SHALL render a "Таблица" / "Crosstable" tab with the `BsGrid3X2` icon, placed after the "Pairings" tab. The tab SHALL render a single `CrosstableSection` without a section heading. The section SHALL be rendered from `formState.games`, `formState.participants`, `formState.settings.tieBreaks`, `formState.settings.considerSente`, and the round count from `formState.scheduleRows`. Participant names, locations, and titles SHALL be displayed in the global i18n locale.

#### Scenario: User opens the Crosstable tab

- **WHEN** the user clicks the "Crosstable" tab in `TournamentEditForm`
- **THEN** the `CrosstableSection` is rendered as a single section without a heading
- **AND** participant names are displayed in the current global locale

#### Scenario: Tab is additive

- **WHEN** the crosstable tab is added
- **THEN** no existing tab behavior or requirement changes

### Requirement: Crosstable columns

The crosstable SHALL render the following columns in order: (1) sequential row number without header; (2) nationality flag with a locale-dependent country-name tooltip, without header; (3) rank badge without header — white text on a rank-dependent background color, plus a `PiCrownSimple` icon with a title tooltip when the participant has `locales[locale].title`; (4) "Имя" / "Name" localized header with `<FamilyName, GivenName>` in the current locale; (5) "Город" / "Residence" localized header showing the participant location, prefixed by a residence-country flag with country-name tooltip when the residence country differs from the nationality country (same presentation as `PlayerCard`); (6) "Рейтинг" / "Rating" localized header showing `currentRating.value`; (7) one column per tournament round with the round number as header; (8) "СО" / "SP" localized header with a full-description tooltip, containing an input bound to `participant.startingPoints` via `updateStartingPoints`; (9) one column per tie-break in `settings.tieBreaks` order — all configured tie-breaks SHALL be displayed (the `isVisible` flag is ignored).

Tie-break column headers SHALL be locale-independent abbreviations (BH, BHC, BHM, BH+, SB, DE, W) with locale-dependent tooltips; the `points` tie-break column header SHALL be the localized "Очки" / "Pts" without a tooltip.

#### Scenario: Rank badge colors

- **WHEN** a participant has rank `20k` through `10k`
- **THEN** the rank badge background is `oklch(70.081% 0.164 56.844)` with white text

- **WHEN** a participant has rank `9k` through `7k`
- **THEN** the badge background is `oklch(60.995% 0.08 174.616)`

- **WHEN** a participant has rank `6k` through `4k`
- **THEN** the badge background is `oklch(45.0% 0.14 250.0)`

- **WHEN** a participant has rank `3k` through `1k`
- **THEN** the badge background is `oklch(43% 0.020 52.190)`

- **WHEN** a participant has rank `1d` through `3d`
- **THEN** the badge background is `#000`

- **WHEN** a participant has rank `4d` through `9d`
- **THEN** the badge background is `oklch(40.0% 0.12 25.0)`

- **WHEN** a participant has no rank (`null`)
- **THEN** no rank badge is rendered

#### Scenario: Title icon on rank badge

- **WHEN** a participant has a non-empty `locales[locale].title`
- **THEN** the rank badge additionally contains a `PiCrownSimple` icon with a tooltip showing that title in the current locale

#### Scenario: Residence flag

- **WHEN** a participant''s residence country differs from the nationality country
- **THEN** the residence cell shows the residence-country flag with a country-name tooltip before the location text

- **WHEN** residence equals nationality or residence is empty
- **THEN** no residence flag is shown

#### Scenario: Starting points input

- **WHEN** the user edits the "SP" input for a participant
- **THEN** `updateStartingPoints(participantId, value)` is called and the standings recalculate

### Requirement: Crosstable round cells

Each round cell for a participant SHALL render a default button (no click action) containing, in one line and in order: (1) the player color symbol ``☗`` when the participant was sente (player1) or ``☖`` when gote (player2), only when `settings.considerSente == true`; (2) the crosstable row number of the opponent and the result symbol: `+` for a win, `-` for a loss, `=` for a draw; the result text color SHALL be `text-success` for a win, `text-error` for a loss, default for a draw; (3) a handicap badge with background `bg-base-200` showing the handicap string (e.g. `-L`, `+4p`) when `game.handicap != null`.

A bye game SHALL show only `+` (no opponent number, no color symbol). A forfeit game SHALL show only `-` (no opponent number, no color symbol). An empty cell (no game for that participant and round) SHALL render a `-` placeholder.

#### Scenario: Regular game cell with sente

- **WHEN** `considerSente` is true and the participant played as player1 against crosstable row 3 and won
- **THEN** the cell button shows ``☗ 3 +`` with success text color

#### Scenario: Regular game cell without considerSente

- **WHEN** `considerSente` is false and the participant played as player2 against crosstable row 5 and lost
- **THEN** the cell button shows `5 -` with error text color

#### Scenario: Handicap game cell

- **WHEN** the participant''s game has `handicap = ''-L''` and the participant won
- **THEN** the cell button shows the result plus a `bg-base-200` badge with the text `-L`

#### Scenario: Bye cell

- **WHEN** the participant has a `status = ''bye''` game in a round
- **THEN** the cell button shows only `+`

#### Scenario: Forfeit cell

- **WHEN** the participant has a `status = ''forfeit''` game in a round
- **THEN** the cell button shows only `-`

### Requirement: Tie-break computation and standings sorting

The crosstable model SHALL provide pure tie-break calculators with the following definitions (points of an opponent are their total points from games plus starting points; bye counts as a win; forfeit gives zero points):

- `points` = startingPoints + 1 per win + 0.5 per draw + 1 per bye
- `BH` (Buchholz) = sum of opponents'' points across all games played by the participant
- `BHC` (Buchholz cut) = BH minus the lowest N opponents'' points, where N = `cutCount`
- `BHM` (median Buchholz) = BH minus the highest and the lowest opponents'' points
- `BH+` (Buchholz plus) = sum over opponents of (opponent points + own game result against that opponent)
- `SB` (Sonneborn-Berger) = sum of points of defeated opponents + 0.5 × sum of points of drawn opponents
- `DE` (direct encounter) = points scored in games against opponents currently tied on points
- `W` (wins count) = number of wins including byes

Rows SHALL be sorted by the chain of tie-breaks in `settings.tieBreaks` order (each descending). The crosstable row number of a participant SHALL be their position (1-based) in this sorted order and SHALL be used as the opponent number in round cells.

#### Scenario: Sorting by points then Buchholz

- **WHEN** participant A has 3 points with BH 5 and participant B has 3 points with BH 7, and `tieBreaks = [points, buchholz]`
- **THEN** B is displayed above A

#### Scenario: Opponent number references the sorted position

- **WHEN** participant C is at sorted position 2 and participant A played against C in round 1
- **THEN** A''s round-1 cell shows the number `2`

### Requirement: Crosstable sticky scroll

The crosstable content SHALL scroll inside its container (`overflow-auto`). The header row SHALL be sticky at the top of the scroll container. The first four columns (row number, nationality flag, rank badge, name) SHALL be sticky on the left side with opaque backgrounds so content does not show through while scrolling horizontally.

#### Scenario: Vertical scroll keeps headers visible

- **WHEN** the table is taller than its container and the user scrolls down
- **THEN** the header row remains visible at the top

#### Scenario: Horizontal scroll keeps identity columns visible

- **WHEN** the table is wider than its container and the user scrolls right
- **THEN** the row number, flag, rank badge, and name columns remain visible on the left
