## MODIFIED Requirements

### Requirement: Crosstable columns

The crosstable SHALL render the following columns in order: (1) sequential row number without header; (2) nationality flag with a locale-dependent country-name tooltip, without header; (3) rank badge without header — white text on a rank-dependent background color, plus a `PiCrownSimple` icon with a title tooltip when the participant has `locales[locale].title`; (4) "Имя" / "Name" localized header with `<FamilyName, GivenName>` in the current locale; (5) "Город" / "Residence" localized header showing the participant location, prefixed by a residence-country flag with country-name tooltip when the residence country differs from the nationality country (same presentation as `PlayerCard`); (6) "Рейтинг" / "Rating" localized header showing `currentRating.value`; (7) one column per tournament round with the round number as header; (8) "СО" / "SP" localized header with a full-description tooltip, containing an input bound to `participant.startingPoints` via `updateStartingPoints`; (9) one column per tie-break in `settings.tieBreaks` order — all configured tie-breaks SHALL be displayed (the `isVisible` flag is ignored).

Tie-break column headers SHALL be locale-dependent abbreviations from the i18n keys `tournament.tieBreak.abbr.<type>` (ru: «Очки», «Бухг.», «УБ», «МБ», «Бухг.+», «Берг.», «ЛВ», «ЧВ», «СЛБ»; en: "Pts", "BH", "BHC", "MCH", "BH+", "SB", "DE", "WIN", "SL Pts") with locale-dependent tooltips from `tournament.tieBreak.<type>`; the `points` tie-break column header SHALL be the localized "Очки" / "Pts" without a tooltip. For `buchholz_cut` entries the header SHALL append the entry's `cutCount` to the abbreviation (e.g. «УБ1» / "BHC1", «УБ2» / "BHC2"). The hardcoded locale-independent abbreviation map SHALL be removed from the crosstable model.

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

#### Scenario: Tie-break header abbreviations follow the locale

- **WHEN** the UI locale is `ru` and the crosstable renders a `sonneborn_berger` column
- **THEN** the header shows «Берг.» and the tooltip shows «Бергер»
- **WHEN** the UI locale is `en` and the crosstable renders a `sonneborn_berger` column
- **THEN** the header shows "SB" and the tooltip shows "Sonneborn-Berger"

#### Scenario: Buchholz cut header shows the cut count

- **WHEN** the crosstable renders a `buchholz_cut` column with `cutCount = 2`
- **THEN** the header abbreviation is suffixed with `2` («УБ2» in ru, "BHC2" in en)

### Requirement: Tie-break computation and standings sorting

The crosstable model SHALL provide pure tie-break calculators with the following definitions (points of an opponent are their total points from games plus starting points; a bye contributes its result value — 1 for a win bye, 0.5 for a draw bye; forfeit gives zero points):

- `points` = startingPoints + 1 per win + 0.5 per draw + the bye result value (1 for 'player1_won' or absent, 0.5 for 'draw')
- `BH` (Buchholz) = sum of opponents'' points across all games played by the participant
- `BHC` (Buchholz cut) = BH minus the lowest N opponents'' points, where N = `cutCount`
- `BHM` (median Buchholz) = BH minus the highest and the lowest opponents'' points
- `BH+` (Buchholz plus) = sum over opponents of (opponent points + own game result against that opponent)
- `SB` (Sonneborn-Berger) = sum of points of defeated opponents + 0.5 × sum of points of drawn opponents
- `DE` (direct encounter) = points scored in games against opponents currently tied on points
- `W` (wins count) = number of wins, not counting draw byes
- `SL` (SL Points, `sl_points`) = based only on scored points: participants are grouped by equal points; groups are ordered by points descending; each group is assigned the position of its last (lowest-ranked) member in the overall points-descending list — i.e. the cumulative number of participants whose points are greater than or equal to the group's points; every member of the group receives the same value mapped from that position — 1→55, 2→34, 3→21, 4→13, 5→8, 6→5, 7→3, 8→2, 9 and beyond→1

Rows SHALL be sorted by the chain of tie-breaks in `settings.tieBreaks` order (each descending). The crosstable row number of a participant SHALL be their position (1-based) in this sorted order and SHALL be used as the opponent number in round cells.

#### Scenario: Sorting by points then Buchholz

- **WHEN** participant A has 3 points with BH 5 and participant B has 3 points with BH 7, and `tieBreaks = [points, buchholz]`
- **THEN** B is displayed above A

#### Scenario: Opponent number references the sorted position

- **WHEN** participant C is at sorted position 2 and participant A played against C in round 1
- **THEN** A''s round-1 cell shows the number `2`

#### Scenario: SL Points for distinct score groups

- **WHEN** five participants have pairwise distinct points and `tieBreaks = [points, sl_points]`
- **THEN** their SL Points values are 55, 34, 21, 13, 8 in order of decreasing points

#### Scenario: SL Points shared within a score group

- **WHEN** two participants share the top points value and a third participant has the next-lower points value
- **THEN** the top group of two ends at position 2 in the overall list and both participants receive SL Points 34
- **AND** the third participant''s score group ends at position 3 and receives SL Points 21

#### Scenario: SL Points for positions beyond the mapping table

- **WHEN** a participant''s score group position in the overall points-descending list is 9 or greater
- **THEN** the participant receives SL Points 1

#### Scenario: SL Points with groups of different sizes

- **WHEN** six participants have points 2, 1, 1, 1, 0, 0 (groups of size 1, 3, 2)
- **THEN** the group with 2 pts ends at position 1 and its member receives SL Points 55
- **AND** the group with 1 pt ends at position 4 and all three members receive SL Points 13
- **AND** the group with 0 pts ends at position 6 and both members receive SL Points 5

#### Scenario: SL Points never contradicts points ordering

- **WHEN** `tieBreaks = [points, sl_points]` and participant A has strictly more points than participant B
- **THEN** A''s SL Points value is greater than or equal to B''s, and A is displayed above B