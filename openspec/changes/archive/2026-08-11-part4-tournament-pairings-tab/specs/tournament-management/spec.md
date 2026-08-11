## MODIFIED Requirements

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container. When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet.

When a card is dragged from `players1` at row N and dropped onto `players2` at the same row N (or vice versa), the system SHALL swap the two players in the game instead of creating a new bye. The swap SHALL exchange `player1` and `player2` on the game, flip `sente` (`player1` ↔ `player2`, `unknown` unchanged), and flip a non-null result (`player1_won` ↔ `player2_won`, `draw` unchanged). The swap SHALL be triggered when the drop target is a `p1-row-N` or `p2-row-N` zone AND the dragged participant currently occupies the opposite column at the same row index.

#### Scenario: Next round initializes unpaired

- **WHEN** the user opens the round `currentRound + 1` for the first time and no games exist for that round
- **THEN** all tournament participants appear in the `unpaired` container

#### Scenario: Dragging a card to players1 creates a bye game

- **WHEN** the user drags a participant from `unpaired` into an empty row of `players1` (no opponent in `players2` at that row)
- **THEN** a `Game` is created in `games` with `player1` = that participant id, `player2 = null`, `status = 'bye'`, `sente = settings.considerSente ? 'player1' : 'unknown'`, `result = null`, and `round` = active round

#### Scenario: Dragging a card to players2 completes a pair

- **WHEN** the user drags a participant into `players2` opposite an existing `players1` card
- **THEN** the existing game for that row has its `player2` set to the dropped participant and its `status` set to `'not_started'`

#### Scenario: Dragging a paired card back to unpaired removes the game

- **WHEN** the user drags a participant from a paired slot back into `unpaired`
- **THEN** the `Game` containing that participant is removed from `games` (or reverted to a single-participant `bye` game if the opponent remains in `players1`)

#### Scenario: Dropping at a position reorders pairs

- **WHEN** the user drops a card between two existing rows of `players1`
- **THEN** the order of games for that round is updated to reflect the new row position

#### Scenario: Swapping players within a row by cross-column drop

- **WHEN** the user drags the `players1` card from row N and drops it onto the `players2` drop zone of the same row N
- **THEN** the game at row N has `player1` and `player2` exchanged
- **AND** `sente` is flipped (`player1` → `player2`, `player2` → `player1`, `unknown` unchanged)
- **AND** if the game had a non-null `result`, it is flipped (`player1_won` ↔ `player2_won`; `draw` unchanged)

#### Scenario: Swap preserves game identity

- **WHEN** a swap is performed on a game that has `id`, `status`, `handicap`, and `round` set
- **THEN** only `player1`, `player2`, `sente`, and `result` fields change; all other fields remain unchanged

## ADDED Requirements

### Requirement: Handicap cycling button

Each pairing row in the `PairingsBoard` SHALL render a handicap button between the `players1` and `players2` slots (adjacent to the result button). The button SHALL display the current `Game.handicap` value as a short code string, or `=` when `handicap` is `null`. Clicking the button SHALL cycle `Game.handicap` through the sequence: `null → -L → -B → -R → -RL → -2p → -4p → -5p → -6p → -8p → -10p → +L → +B → +R → +RL → +2p → +4p → +5p → +6p → +8p → +10p → null`. The button SHALL carry a DaisyUI tooltip reading "Игра с форой" (ru) / "Game with handicap" (en). The handicap button SHALL be disabled when the result button is disabled (i.e. the same `disabled` condition applies).

#### Scenario: Cycling from no handicap to first handicap code

- **WHEN** the user clicks the handicap button of a game whose `handicap` is `null`
- **THEN** `game.handicap` becomes `'-L'`
- **AND** the button displays `-L`

#### Scenario: Cycling through all codes wraps around

- **WHEN** the user clicks the handicap button repeatedly through all 21 states
- **THEN** after `'+10p'` the next click returns `handicap` to `null` and the button displays `=`

#### Scenario: Handicap button disabled in locked state

- **WHEN** the result button for a row is disabled
- **THEN** the handicap button in the same row is also disabled

#### Scenario: Tooltip shown on handicap button

- **WHEN** the user hovers over the handicap button
- **THEN** a DaisyUI tooltip displays "Игра с форой" (ru locale) or "Game with handicap" (en locale)
