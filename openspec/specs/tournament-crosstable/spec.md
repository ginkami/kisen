## Purpose

The tournament crosstable: its tab in the tournament edit form, table columns and rank badge styling, inline editing of pairings and results, and rich opponent hover cards.

## Requirements

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

### Requirement: Crosstable round cells

Each round cell for a participant SHALL render a default button containing, in one line and in order: (1) the player color symbol `☗` when the participant was sente (player1) or `☖` when gote (player2), only when `settings.considerSente == true`; (2) the crosstable row number of the opponent and the result symbol: `+` for a win, `-` for a loss, `=` for a draw; the result text color SHALL be `text-success` for a win, `text-error` for a loss, default for a draw; (3) a handicap badge with background `bg-base-200` showing the handicap string (e.g. `-L`, `+4p`) when `game.handicap != null`.

A bye game SHALL show only its result symbol — `+` when `result = 'player1_won'` (or absent) and `=` when `result = 'draw'` — with no opponent number and no color symbol. A forfeit game SHALL show only `-` (no opponent number, no color symbol). An empty cell (no game for that participant and round) SHALL render a `-` placeholder.

Game-cell buttons for rounds `<= currentRound + 1` SHALL be clickable to open an inline editor. Clicking replaces the button with a text input (auto-focused, pre-filled with the serialized cell text) and a `BsCheckLg` confirm button to the right of the input. Cells for rounds `> currentRound + 1` SHALL NOT be editable.

#### Scenario: Regular game cell with sente

- **WHEN** `considerSente` is true and the participant played as player1 against crosstable row 3 and won
- **THEN** the cell button shows `☗ 3 +` with success text color

#### Scenario: Regular game cell without considerSente

- **WHEN** `considerSente` is false and the participant played as player2 against crosstable row 5 and lost
- **THEN** the cell button shows `5 -` with error text color

#### Scenario: Handicap game cell

- **WHEN** the participant's game has `handicap = '-L'` and the participant won
- **THEN** the cell button shows the result plus a `bg-base-200` badge with the text `-L`

#### Scenario: Bye cell

- **WHEN** the participant has a `status = 'bye'` game in a round
- **THEN** the cell button shows only `+` when the bye `result` is `'player1_won'` (or absent)
- **AND** the cell button shows only `=` when the bye `result` is `'draw'`

#### Scenario: Forfeit cell

- **WHEN** the participant has a `status = 'forfeit'` game in a round
- **THEN** the cell button shows only `-`

#### Scenario: Opening the inline editor

- **WHEN** the user clicks a game-cell button in a round `<= currentRound + 1`
- **THEN** the button is replaced by an auto-focused text input pre-filled with the serialized cell text
- **AND** a `BsCheckLg` confirm button appears to the right of the input


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


### Requirement: Cell input grammar and serialization

The inline editor text SHALL map 1:1 to the button content: `☗` is written as `^` in the input; `☖` and a missing result (`?`) produce no characters in the input. The `^` prefix SHALL be allowed only when `settings.considerSente == true`. The input grammar is: `^? opponentNumber result? handicap?` where `result` is `+`/`-`/`=`, `handicap` is a sign (`-`/`+`) followed by one of `L`, `B`, `R`, `RL`, `2p`, `4p`, `5p`, `6p`, `8p`, `10p`, and `opponentNumber` is the opponent's crosstable row number (1–3 digits). The standalone values `+` and `-` denote bye and forfeit respectively. Ambiguity between a missing result with handicap and a loss result (e.g. `^3-L` vs `5-`) SHALL be resolved by backtracking: parse `result handicap?` first, then `handicap` alone.

Canonical mappings (button ↔ input): `☗4+[+B]` ↔ `^4++B`; `☖11+[-2p]` ↔ `11+-2p`; `5-` ↔ `5-`; `☗3?[-L]` ↔ `^3-L`; `☖5?` ↔ `5`; `17?` ↔ `17`; `+` ↔ `+`; `=` ↔ `=`; `-` ↔ `-`.

When `considerSente == true`, a leading `^` means the edited player is player1 (sente); its absence means player2 (gote). When `considerSente == false`, the edited player is always player1 with `sente = 'unknown'`. The result symbol in the input is from the perspective of the edited player.

#### Scenario: Serialization with sente and handicap

- **WHEN** the button shows `☗4+[+B]` and the user opens the editor
- **THEN** the input contains `^4++B`

#### Scenario: Serialization without result

- **WHEN** the button shows `☖5?` and the user opens the editor
- **THEN** the input contains `5`

#### Scenario: Empty cell serialization

- **WHEN** the user opens the editor on a cell with no game
- **THEN** the input is empty

#### Scenario: Serialization of a bye-draw

- **WHEN** the button shows ``=`` (a bye with ``result = 'draw'``) and the user opens the editor
- **THEN** the input contains ``=```

### Requirement: Cell input validation

The input SHALL be validated on the fly: `onChange` rejects any value that is not a valid prefix of the grammar (invalid characters or sequences cannot be typed). On confirm (confirm button click or input blur), a value that is empty or not fully parsable SHALL be treated as invalid: previous game data is preserved unchanged. A valid value updates the games for the round. After processing (valid or invalid), the editor closes and the button reappears.

#### Scenario: Invalid characters cannot be typed

- **WHEN** the user types `x` or `#` into the input
- **THEN** the character is rejected and not appended

#### Scenario: Empty input on confirm preserves data

- **WHEN** the user clears the input and clicks the confirm button
- **THEN** no games change and the editor closes

#### Scenario: Invalid value on blur preserves data

- **WHEN** the input holds a value that fails full parsing and the input loses focus
- **THEN** no games change and the editor closes

### Requirement: Cell edit round synchronization

Applying a valid cell edit SHALL re-synchronize the whole round: (1) remove the edited player''s game in that round; (2) if a new opponent is specified, remove that opponent''s game in the same round (the opponent''s former partner becomes unpaired); (3) create the new game between the edited player and the opponent with player1/player2 per the `^` rule, `result` from the edited player''s perspective (null when absent), `sente`, and `handicap` (null when absent); (4) for standalone `+` create a bye game with `result = 'player1_won'`, for standalone `=` create a bye game with `result = 'draw'`, and for standalone `-` create a forfeit game for the edited player in that round. Created and updated games SHALL receive the status derived by the game-status lifecycle rule (see the `tournament-management` capability). Opponent row numbers SHALL be resolved to participant ids via the current standings place map. Standings and tie-breaks SHALL recalculate automatically from the updated games.

#### Scenario: Opponent change cascades

- **WHEN** player A (paired with B) is edited in a round to play against C (who was paired with D)
- **THEN** the game A–B is removed, the game C–D is removed, a new game A–C is created
- **AND** B and D have no game in that round

#### Scenario: Result edit keeps pairing

- **WHEN** the user edits only the result symbol of an existing pairing (opponent unchanged)
- **THEN** the game between the same two players is updated with the new result and both color/handicap fields are preserved when not specified

#### Scenario: Bye input

- **WHEN** the user enters `+` and confirms
- **THEN** the edited player has a `status = ''bye''` game with `result = 'player1_won'`, `player1` = player id and `player2 = null`, in that round, and any previous game of the player or their former opponent is removed

#### Scenario: Bye-draw input

- **WHEN** the user enters `=` and confirms
- **THEN** the edited player has a `status = 'bye'` game with `result = 'draw'`, `player1` = player id, and `player2 = null` in that round

#### Scenario: Forfeit input

- **WHEN** the user enters `-` and confirms
- **THEN** the edited player has a `status = ''forfeit''` game in that round

### Requirement: Opponent hover cards

The «Кросс-таблица» section SHALL show rich hover tooltips with compact opponent row cards. An opponent card SHALL render, left to right: the opponent's country flag with a tooltip showing the country name in the current UI locale, the rank badge colorized per the crosstable color scale with a crown icon showing the title tooltip when the opponent has one, the opponent name as «familyName, givenName» picked for the current locale with fallback to `ru` then `en`, the opponent's captured rating value, the opponent's tournament points in a primary badge, and the hovered player's result in that game as a badge — `+` on success, `-` on error, `=` on secondary, `?` on base-300. When there is no opponent, the card SHALL render only the result badge. Hovering the result cell of a paired game SHALL show a tooltip with the card of the opponent in that game; bye cells, forfeit cells, and cells without a game SHALL show no tooltip. Hovering a participant's family name SHALL show a tooltip with one card per game of that participant that has an opponent, in ascending round order; forfeit games SHALL render result-only cards, byes SHALL be omitted; if no such games exist, no tooltip SHALL be shown.

#### Scenario: Result cell tooltip shows the opponent card

- **WHEN** the user hovers the round-2 result cell of a paired game between participants A and B
- **THEN** a tooltip appears showing B's card: flag, rank badge with crown when titled, name, rating, tournament points in a primary badge, and a `+` success badge when A won that game

#### Scenario: No tooltip on bye, forfeit, or empty cells

- **WHEN** the user hovers a bye cell, a forfeit cell, or a cell without a game
- **THEN** the cell renders as before and no tooltip appears

#### Scenario: Result badge colors

- **WHEN** the hovered player's result in a game is, respectively, a win, a loss, a draw, or not yet set
- **THEN** the card's result badge renders `+` with the success color, `-` with the error color, `=` with the secondary color, or `?` with the base-300 background

#### Scenario: Name tooltip lists all opponents

- **WHEN** the user hovers the family name of a participant who played opponents in rounds 1 and 3 and received a forfeit in round 2
- **THEN** a tooltip appears with, in order: the round-1 opponent's card, a result-only card with `-` for the round-2 forfeit, and the round-3 opponent's card

#### Scenario: Name tooltip omitted without opponents

- **WHEN** the user hovers the family name of a participant with no games against opponents
- **THEN** no tooltip appears
