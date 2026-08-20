## MODIFIED Requirements

### Requirement: Crosstable round cells

Each round cell for a participant SHALL render a default button containing, in one line and in order: (1) the player color symbol `☗` when the participant was sente (player1) or `☖` when gote (player2), only when `settings.considerSente == true`; (2) the crosstable row number of the opponent and the result symbol: `+` for a win, `-` for a loss, `=` for a draw; the result text color SHALL be `text-success` for a win, `text-error` for a loss, default for a draw; (3) a handicap badge with background `bg-base-200` showing the handicap string (e.g. `-L`, `+4p`) when `game.handicap != null`.

A bye game SHALL show only `+` (no opponent number, no color symbol). A forfeit game SHALL show only `-` (no opponent number, no color symbol). An empty cell (no game for that participant and round) SHALL render a `-` placeholder.

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
- **THEN** the cell button shows only `+`

#### Scenario: Forfeit cell

- **WHEN** the participant has a `status = 'forfeit'` game in a round
- **THEN** the cell button shows only `-`

#### Scenario: Opening the inline editor

- **WHEN** the user clicks a game-cell button in a round `<= currentRound + 1`
- **THEN** the button is replaced by an auto-focused text input pre-filled with the serialized cell text
- **AND** a `BsCheckLg` confirm button appears to the right of the input

## ADDED Requirements

### Requirement: Cell input grammar and serialization

The inline editor text SHALL map 1:1 to the button content: `☗` is written as `^` in the input; `☖` and a missing result (`?`) produce no characters in the input. The `^` prefix SHALL be allowed only when `settings.considerSente == true`. The input grammar is: `^? opponentNumber result? handicap?` where `result` is `+`/`-`/`=`, `handicap` is a sign (`-`/`+`) followed by one of `L`, `B`, `R`, `RL`, `2p`, `4p`, `5p`, `6p`, `8p`, `10p`, and `opponentNumber` is the opponent's crosstable row number (1–3 digits). The standalone values `+` and `-` denote bye and forfeit respectively. Ambiguity between a missing result with handicap and a loss result (e.g. `^3-L` vs `5-`) SHALL be resolved by backtracking: parse `result handicap?` first, then `handicap` alone.

Canonical mappings (button ↔ input): `☗4+[+B]` ↔ `^4++B`; `☖11+[-2p]` ↔ `11+-2p`; `5-` ↔ `5-`; `☗3?[-L]` ↔ `^3-L`; `☖5?` ↔ `5`; `17?` ↔ `17`; `+` ↔ `+`; `-` ↔ `-`.

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

Applying a valid cell edit SHALL re-synchronize the whole round: (1) remove the edited player''s game in that round; (2) if a new opponent is specified, remove that opponent''s game in the same round (the opponent''s former partner becomes unpaired); (3) create the new game between the edited player and the opponent with player1/player2 per the `^` rule, `result` from the edited player''s perspective (null when absent), `sente`, and `handicap` (null when absent); (4) for standalone `+` create a bye game and for standalone `-` create a forfeit game for the edited player in that round. Opponent row numbers SHALL be resolved to participant ids via the current standings place map. Standings and tie-breaks SHALL recalculate automatically from the updated games.

#### Scenario: Opponent change cascades

- **WHEN** player A (paired with B) is edited in a round to play against C (who was paired with D)
- **THEN** the game A–B is removed, the game C–D is removed, a new game A–C is created
- **AND** B and D have no game in that round

#### Scenario: Result edit keeps pairing

- **WHEN** the user edits only the result symbol of an existing pairing (opponent unchanged)
- **THEN** the game between the same two players is updated with the new result and both color/handicap fields are preserved when not specified

#### Scenario: Bye input

- **WHEN** the user enters `+` and confirms
- **THEN** the edited player has a `status = ''bye''` game with `player1` = player id and `player2 = null` in that round, and any previous game of the player or their former opponent is removed

#### Scenario: Forfeit input

- **WHEN** the user enters `-` and confirms
- **THEN** the edited player has a `status = ''forfeit''` game in that round
