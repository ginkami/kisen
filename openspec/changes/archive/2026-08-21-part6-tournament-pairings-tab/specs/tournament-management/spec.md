## MODIFIED Requirements

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row; when the target row holds a lone game, the completed game SHALL have `result = null` and a status derived by the game-status lifecycle rule (see the Game status lifecycle requirement), so the row's result and handicap controls become enabled. When the target row is empty, the dropped participant SHALL be stored as `player1` of a new lone game regardless of which column (`players1` or `players2`) received the drop. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container; when the active round is a past round (strictly earlier than `currentRound`), the participant SHALL instead receive a forfeit game for that round (see the Auto-forfeit for unpaired participants in past rounds requirement). When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet. When a participant who currently has a forfeit game (`status = 'forfeit'`) is dropped into `players1` or `players2`, the forfeit game SHALL be removed so that the participant has exactly one game in the round (the newly formed pair). A participant SHALL NOT have two games in the same round.

When a card is dragged from `players1` at row N and dropped onto `players2` at the same row N (or vice versa), the system SHALL swap the two players in the game instead of creating a new bye. The swap SHALL exchange `player1` and `player2` on the game, keep `sente` attached to the position (unchanged — the player in position `player1` is sente when `considerSente` is true), and flip a non-null result (`player1_won` ↔ `player2_won`, `draw` unchanged). The swap SHALL be triggered when the drop target is a `p1-row-N` or `p2-row-N` zone AND the dragged participant currently occupies the opposite column at the same row index. The swap SHALL target the game displayed at that row (identified by game id), independent of the storage order of `games`. The sente symbols ☗/☖ in the crosstable SHALL reflect the swap immediately (no save required), because `sente` remains `'player1'` under the project invariant and `formStateToUpdateInput` forcing `sente='player1'` on save is a no-op.

When one member of a pair is dragged back to `unpaired`, the game SHALL NOT be deleted while the partner remains: the partner SHALL stay in the same row as a lone game with lone-game field values (see the Lone game invariant requirement). The game SHALL be deleted only when the last (only) player of a lone game is moved to `unpaired`.

Empty pairing rows SHALL display the drop hint (`tournament.edit.pairings.dropHere`) only in their `players1` zone. The `players2` zone of an empty row SHALL NOT display a drop hint, because a participant dropped into an empty row is always stored and displayed as `player1`; the `players2` zone of an empty row remains a valid drop target and a drop there behaves exactly like a drop into the row's `players1` zone.

#### Scenario: Next round initializes unpaired

- **WHEN** the user opens the round `currentRound + 1` for the first time and no games exist for that round
- **THEN** all tournament participants appear in the `unpaired` container

#### Scenario: Dragging a card to players1 creates a bye game

- **WHEN** the user drags a participant from `unpaired` into an empty row of `players1` (no opponent in `players2` at that row)
- **THEN** a `Game` is created in `games` with `player1` = that participant id, `player2 = null`, `status = 'bye'`, `sente = settings.considerSente ? 'player1' : 'unknown'`, `result = 'player1_won'`, `handicap = null`, and `round` = active round

#### Scenario: Dragging a card to players2 of an empty row creates a lone game

- **WHEN** the user drags a participant from `unpaired` into an empty row of `players2` (no player in `players1` at that row)
- **THEN** a `Game` is created in `games` with `player1` = that participant id (never `player2`), `player2 = null`, `status = 'bye'`, `result = 'player1_won'`, `handicap = null`, and `round` = active round

#### Scenario: Dragging a card to players2 completes a pair

- **WHEN** the user drags a participant into `players2` opposite an existing `players1` card
- **THEN** the existing game for that row has its `player2` set to the dropped participant, its `result` reset to `null` (clearing any previous lone-game bye result), and its `status` derived by the game-status lifecycle rule (`'live'` in the active round, `'not_started'` otherwise), so the row's result and handicap buttons become enabled

#### Scenario: Dragging a paired card back to unpaired keeps the partner in the row

- **WHEN** the user drags one member of a pair back to `unpaired`
- **THEN** the remaining partner stays in the same row as a lone game with lone-game field values
- **AND** the game is deleted only when the last player of a lone game is moved to `unpaired`

#### Scenario: Dropping a participant to unpaired in a past round creates a forfeit

- **WHEN** `currentRound = 3`, the user is viewing round 2, and drags a paired participant into `unpaired`
- **THEN** the participant has a `status = 'forfeit'` game in round 2 (see the Auto-forfeit for unpaired participants in past rounds requirement)

#### Scenario: Empty players2 zone shows no drop hint

- **WHEN** an empty pairing row is rendered
- **THEN** its `players1` zone displays the drop hint
- **AND** its `players2` zone displays no hint while remaining a valid drop target

#### Scenario: Dropping at a position reorders pairs

- **WHEN** the user drops a card between two existing rows of `players1`
- **THEN** the order of games for that round is updated to reflect the new row position

#### Scenario: Swapping players within a row by cross-column drop

- **WHEN** the user drags the `players1` card from row N and drops it onto the `players2` drop zone of the same row N
- **THEN** the game at row N has `player1` and `player2` exchanged
- **AND** `sente` is flipped (`player1` ↔ `player2`, `unknown` unchanged)
- **AND** if the game had a non-null `result`, it is flipped (`player1_won` ↔ `player2_won`; `draw` unchanged)

#### Scenario: Swap preserves game identity

- **WHEN** a swap is performed on a game that has `id`, `status`, `handicap`, and `round` set
- **THEN** only `player1`, `player2`, `sente`, and `result` fields change; all other fields remain unchanged

### Requirement: Pairings result button

Between each `players1`/`players2` row pair the board SHALL render a result button that cycles through `?` → `>` → `<` → `=` on click; a right-click SHALL cycle in the reverse direction (the native context menu is suppressed on the button). The symbols map to `Game.result` as `null` / `'player1_won'` / `'player2_won'` / `'draw'`. Result buttons SHALL be disabled only when the row's game has `status = 'forfeit'`. For a bye row (`status = 'bye'`) the result button SHALL be enabled and cycle only between `'player1_won'` (`>`) and `'draw'` (`=`), keeping `status = 'bye'`.

#### Scenario: Cycling the result

- **WHEN** the user clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'player1_won'` and the button shows `>`
- **AND** subsequent clicks cycle to `'player2_won'` (`<`), then `'draw'` (`=`), then back to `null` (`?`)

#### Scenario: Reverse cycling with right-click

- **WHEN** the user right-clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'draw'` and the button shows `=`
- **AND** subsequent right-clicks cycle backward to `'player2_won'` (`<`), then `'player1_won'` (`>`), then back to `null` (`?`)

#### Scenario: Bye result cycles between win and draw

- **WHEN** the user clicks the result button of a bye row whose `result` is `'player1_won'`
- **THEN** the result becomes `'draw'` (button shows `=`) and the game keeps `status = 'bye'`
- **AND** the next click returns the result to `'player1_won'` (button shows `>`)

#### Scenario: Result button disabled for forfeit rows

- **WHEN** a row renders a forfeit game (`status = 'forfeit'`)
- **THEN** the result button for that row is disabled

### Requirement: Lone game invariant

Any pairings-board game with no opponent (`player2 == null`) that is not a forfeit game (`status == 'forfeit'`) SHALL have `status: 'bye'`, a `result` of `'player1_won'` (the default for newly created lone games) or `'draw'`, and `handicap: null`. The pairings model SHALL establish this invariant whenever it creates or mutates a lone game (drop into an empty row of either column, removal of an opponent from a pair), defaulting `result` to `'player1_won'`. The result button SHALL be enabled for bye rows and cycle between the two allowed values; the handicap button SHALL be disabled for lone rows.

#### Scenario: Lone game created by drop has invariant shape

- **WHEN** a participant is dropped into an empty row of `players1` or `players2`
- **THEN** the created game has `player2 = null`, `status = 'bye'`, `result = 'player1_won'`, `handicap = null`

#### Scenario: Invariant restored when a pair is broken

- **WHEN** one member of a pair is moved to `unpaired`
- **THEN** the remaining lone game has `status = 'bye'`, `result = 'player1_won'`, `handicap = null`

#### Scenario: Bye result may be cycled to a draw

- **WHEN** the result of a bye game is cycled to `'draw'`
- **THEN** the game keeps `status = 'bye'`, `result = 'draw'`, `handicap = null`

#### Scenario: Forfeit games are exempt

- **WHEN** a late joiner's auto-forfeit game exists (`player2 = null`, `status = 'forfeit'`, `result = 'player2_won'`)
- **THEN** the system does not rewrite its fields to lone-game values

#### Scenario: Handicap button disabled for lone games

- **WHEN** a row renders a lone game (`player2 == null`, bye or forfeit)
- **THEN** the handicap button for that row is disabled, while the result button stays enabled when the lone game is a bye

### Requirement: Cumulative participant points display

Each participant card in the pairings board SHALL display a cumulative points badge. Cumulative points = `participant.startingPoints` + sum of points earned from game results across all rounds up to and including the active round. Points: win (`player1_won` for player1, `player2_won` for player2) = 1, draw = 0.5, bye = the bye result value (`'player1_won'` or absent → 1; `'draw'` → 0.5), forfeit = 0. The badge SHALL be visible only in the pairings tab.

#### Scenario: Points include startingPoints and game results

- **WHEN** a participant has `startingPoints = 2` and has won one game in round 1
- **THEN** the badge displays `3` when viewing any round ≥ 1

#### Scenario: Points accumulate across rounds

- **WHEN** a participant wins round 1 and draws round 2
- **THEN** the badge displays `1.5` (plus `startingPoints`) when viewing round 2 or later

#### Scenario: Bye points follow the bye result

- **WHEN** a participant has a bye game (`status = 'bye'`) in round 1
- **THEN** the badge includes +1 when the bye `result` is `'player1_won'` (or absent) and +0.5 when it is `'draw'`

#### Scenario: Forfeit gives zero points

- **WHEN** a participant has a forfeit game (`status = 'forfeit'`) in a round
- **THEN** the badge adds 0 points for that round

### Requirement: Handicap cycling button

Each pairing row in the `PairingsBoard` SHALL render a handicap button between the `players1` and `players2` slots (adjacent to the result button). The button SHALL display the current `Game.handicap` value as a short code string, or `=` when `handicap` is `null`. Clicking the button SHALL cycle `Game.handicap` forward through the sequence: `null → -L → -B → -R → -RL → -2p → -4p → -5p → -6p → -8p → -10p → +L → +B → +R → +RL → +2p → +4p → +5p → +6p → +8p → +10p → null`. A right-click SHALL cycle in the reverse direction (the native context menu is suppressed on the button). A double-click SHALL reset `handicap` to `null` (button shows `=`) without the double click's constituent single clicks advancing the cycle first (single clicks are deferred briefly and cancelled by the double click). The button SHALL carry a DaisyUI tooltip reading "Игра с форой" (ru) / "Game with handicap" (en). The handicap button SHALL be disabled when the row's game is a lone game (`player2 == null`, bye or forfeit).

#### Scenario: Cycling from no handicap to first handicap code

- **WHEN** the user clicks the handicap button of a game whose `handicap` is `null`
- **THEN** `game.handicap` becomes `'-L'`
- **AND** the button displays `-L`

#### Scenario: Cycling through all codes wraps around

- **WHEN** the user clicks the handicap button repeatedly through all 21 states
- **THEN** after `'+10p'` the next click returns `handicap` to `null` and the button displays `=`

#### Scenario: Reverse cycling with right-click

- **WHEN** the user right-clicks the handicap button of a game whose `handicap` is `null`
- **THEN** `game.handicap` becomes `'+10p'`
- **AND** a right-click on a game whose `handicap` is `'-L'` returns `handicap` to `null`

#### Scenario: Double-click resets handicap to null

- **WHEN** the user double-clicks the handicap button of a game whose `handicap` is `'-2p'`
- **THEN** `game.handicap` becomes `null` and the button displays `=`
- **AND** the cycle did not advance before the reset (no `-R` or `-B` step was applied)

#### Scenario: Handicap button disabled for lone games

- **WHEN** a row renders a lone game (`player2 == null`, bye or forfeit)
- **THEN** the handicap button for that row is disabled

#### Scenario: Tooltip shown on handicap button

- **WHEN** the user hovers over the handicap button
- **THEN** a DaisyUI tooltip displays "Игра с форой" (ru locale) or "Game with handicap" (en locale)

## ADDED Requirements

### Requirement: Game status lifecycle

The pairings model SHALL derive `Game.status` for every game from the game's own fields and the tournament's `currentRound`: (1) a game with `status = 'forfeit'` keeps `forfeit`; (2) a lone non-forfeit game (`player2 = null`) has `bye`; (3) a paired game with a non-null `result` has `completed`; (4) a paired game without a result in the active round (`round = currentRound`) has `live`; (5) a paired game without a result in any other round has `not_started`. The derivation SHALL be re-applied whenever games or `currentRound` change through the form hook's mutation entry points (`updateGames`, `publishDraw`, `unpublishDraw`) and by every pairings-model mutation that writes a game. Normalization SHALL be reference-stable: a game whose derived status equals its stored status is returned unchanged.

#### Scenario: Recording a result marks the game completed

- **WHEN** a paired game in the active round without a result gets `result = 'player1_won'`
- **THEN** its status becomes `'completed'`

#### Scenario: Publishing a round marks its unplayed games live

- **WHEN** `publishDraw` sets `currentRound` to R and round R contains paired games without results
- **THEN** those games have `status = 'live'`

#### Scenario: Unpublishing reverts unplayed games to not_started

- **WHEN** `unpublishDraw` decrements `currentRound` from R to R-1 and round R still has paired games without results
- **THEN** those games have `status = 'not_started'`

#### Scenario: Bye and forfeit statuses are preserved

- **WHEN** normalization runs over games with `status = 'bye'` or `status = 'forfeit'`
- **THEN** their statuses are unchanged

### Requirement: Auto-forfeit for unpaired participants in past rounds

When the active round is a past round (strictly earlier than `currentRound`), every tournament participant who has no game in that round SHALL automatically receive a forfeit game with `player1` = participant id, `player2 = null`, `status = 'forfeit'`, `result = 'player2_won'`, `sente = considerSente ? 'player1' : 'unknown'`, and `round` = active round. This SHALL happen (a) when a participant is dropped into the `unpaired` container while a past round is active, and (b) when a past round with unpaired participants is opened, idempotently. Participants who already have any game in the round (paired, bye, or forfeit) SHALL NOT receive another. Auto-forfeits SHALL NOT be created for the current or a future round.

#### Scenario: Dropping a participant to unpaired in a past round creates a forfeit

- **WHEN** `currentRound = 3`, the user views round 2, and drags a paired participant into `unpaired`
- **THEN** the participant has a `status = 'forfeit'` game with `result = 'player2_won'` in round 2

#### Scenario: Opening a past round with unpaired participants creates forfeits

- **WHEN** `currentRound = 3`, round 1 has two participants with no games, and the user opens round 1
- **THEN** both participants receive `status = 'forfeit'` games for round 1

#### Scenario: Idempotent auto-forfeits

- **WHEN** a participant already has a forfeit game in the past round and the round is opened again or re-rendered
- **THEN** no duplicate game is created

#### Scenario: No auto-forfeit in current or future rounds

- **WHEN** the active round is equal to or later than `currentRound` and a participant is unpaired
- **THEN** no forfeit game is created for that participant

### Requirement: Forfeit toggle disabled in past-round unpaired container

When the active round is a past round (strictly earlier than `currentRound`), the forfeit toggle on participant cards in the `unpaired` container SHALL be disabled. This prevents the arbiter from removing a forfeit game in a round that has already been played, since every unpaired participant in a past round must carry a forfeit game. The toggle on cards in the `players1`/`players2` pairing rows SHALL remain interactive in all rounds.

#### Scenario: Forfeit toggle disabled for unpaired cards in a past round

- **WHEN** `currentRound = 3` and the user views round 1
- **THEN** the forfeit toggle on every card in the `unpaired` container is disabled

#### Scenario: Forfeit toggle enabled for paired cards in a past round

- **WHEN** `currentRound = 3` and the user views round 1
- **THEN** the forfeit toggle on cards in the `players1`/`players2` pairing rows remains interactive