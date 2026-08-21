## MODIFIED Requirements

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

- `points` = startingPoints + 1 per win + 0.5 per draw + the bye result value (1 for `'player1_won'` or absent, 0.5 for `'draw'`)
- `BH` (Buchholz) = sum of opponents' points across all games played by the participant
- `BHC` (Buchholz cut) = BH minus the lowest N opponents' points, where N = `cutCount`
- `BHM` (median Buchholz) = BH minus the highest and the lowest opponents' points
- `BH+` (Buchholz plus) = sum over opponents of (opponent points + own game result against that opponent)
- `SB` (Sonneborn-Berger) = sum of points of defeated opponents + 0.5 × sum of points of drawn opponents
- `DE` (direct encounter) = points scored in games against opponents currently tied on points
- `W` (wins count) = number of wins including byes whose result is a win (draw byes are not counted)

Rows SHALL be sorted by the chain of tie-breaks in `settings.tieBreaks` order (each descending). The crosstable row number of a participant SHALL be their position (1-based) in this sorted order and SHALL be used as the opponent number in round cells.

#### Scenario: Sorting by points then Buchholz

- **WHEN** participant A has 3 points with BH 5 and participant B has 3 points with BH 7, and `tieBreaks = [points, buchholz]`
- **THEN** B is displayed above A

#### Scenario: Opponent number references the sorted position

- **WHEN** participant C is at sorted position 2 and participant A played against C in round 1
- **THEN** A's round-1 cell shows the number `2`

#### Scenario: Bye-draw earns half a point

- **WHEN** a participant has a bye with `result = 'draw'` in round 1 and no other games
- **THEN** their `points` equal `startingPoints + 0.5`
- **AND** their wins count `W` equals 0

### Requirement: Cell input grammar and serialization

The inline editor text SHALL map 1:1 to the button content: `☗` is written as `^` in the input; `☖` and a missing result (`?`) produce no characters in the input. The `^` prefix SHALL be allowed only when `settings.considerSente == true`. The input grammar is: `^? opponentNumber result? handicap?` where `result` is `+`/`-`/`=`, `handicap` is a sign (`-`/`+`) followed by one of `L`, `B`, `R`, `RL`, `2p`, `4p`, `5p`, `6p`, `8p`, `10p`, and `opponentNumber` is the opponent's crosstable row number (1–3 digits). The standalone values `+`, `=`, and `-` denote a bye with a win result, a bye with a draw result, and a forfeit respectively. Ambiguity between a missing result with handicap and a loss result (e.g. `^3-L` vs `5-`) SHALL be resolved by backtracking: parse `result handicap?` first, then `handicap` alone. A bye game serializes to `+` when its `result` is `'player1_won'` (or absent) and to `=` when its `result` is `'draw'`.

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

- **WHEN** the button shows `=` (a bye with `result = 'draw'`) and the user opens the editor
- **THEN** the input contains `=`

### Requirement: Cell edit round synchronization

Applying a valid cell edit SHALL re-synchronize the whole round: (1) remove the edited player's game in that round; (2) if a new opponent is specified, remove that opponent's game in the same round (the opponent's former partner becomes unpaired); (3) create the new game between the edited player and the opponent with player1/player2 per the `^` rule, `result` from the edited player's perspective (null when absent), `sente`, and `handicap` (null when absent); (4) for standalone `+` create a bye game with `result = 'player1_won'`, for standalone `=` create a bye game with `result = 'draw'`, and for standalone `-` create a forfeit game for the edited player in that round. Created and updated games SHALL receive the status derived by the game-status lifecycle rule (see the `tournament-management` capability). Opponent row numbers SHALL be resolved to participant ids via the current standings place map. Standings and tie-breaks SHALL recalculate automatically from the updated games.

#### Scenario: Opponent change cascades

- **WHEN** player A (paired with B) is edited in a round to play against C (who was paired with D)
- **THEN** the game A–B is removed, the game C–D is removed, a new game A–C is created
- **AND** B and D have no game in that round

#### Scenario: Result edit keeps pairing

- **WHEN** the user edits only the result symbol of an existing pairing (opponent unchanged)
- **THEN** the game between the same two players is updated with the new result and both color/handicap fields are preserved when not specified

#### Scenario: Bye input

- **WHEN** the user enters `+` and confirms
- **THEN** the edited player has a `status = 'bye'` game with `result = 'player1_won'`, `player1` = player id and `player2 = null`, in that round, and any previous game of the player or their former opponent is removed

#### Scenario: Bye-draw input

- **WHEN** the user enters `=` and confirms
- **THEN** the edited player has a `status = 'bye'` game with `result = 'draw'`, `player1` = player id, and `player2 = null` in that round

#### Scenario: Forfeit input

- **WHEN** the user enters `-` and confirms
- **THEN** the edited player has a `status = 'forfeit'` game in that round