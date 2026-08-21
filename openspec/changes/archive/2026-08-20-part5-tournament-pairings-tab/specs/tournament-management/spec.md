## MODIFIED Requirements

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row; when the target row holds a lone game, the completed game SHALL have `result = null` and `status = 'not_started'`, so the row's result and handicap controls become enabled. When the target row is empty, the dropped participant SHALL be stored as `player1` of a new lone game regardless of which column (`players1` or `players2`) received the drop. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container. When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet.

When a card is dragged from `players1` at row N and dropped onto `players2` at the same row N (or vice versa), the system SHALL swap the two players in the game instead of creating a new bye. The swap SHALL exchange `player1` and `player2` on the game, flip `sente` (`player1` <-> `player2`, `unknown` unchanged), and flip a non-null result (`player1_won` <-> `player2_won`, `draw` unchanged). The swap SHALL be triggered when the drop target is a `p1-row-N` or `p2-row-N` zone AND the dragged participant currently occupies the opposite column at the same row index.

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
- **THEN** the existing game for that row has its `player2` set to the dropped participant, its `status` set to `'not_started'`, and its `result` reset to `null` (clearing any previous lone-game bye result), so the row's result and handicap buttons become enabled

#### Scenario: Dragging a paired card back to unpaired keeps the partner in the row

- **WHEN** the user drags one member of a pair back into `unpaired`
- **THEN** the dragged participant appears in the `unpaired` container
- **AND** the former game remains in `games` for the same row with the remaining partner as `player1`, `player2 = null`, `status = 'bye'`, `result = 'player1_won'`, `handicap = null`
- **AND** no `result`, `status`, or `handicap` values from the former pairing remain

#### Scenario: Dragging a lone game card to unpaired deletes the game

- **WHEN** the user drags the only player of a lone game (bye) back into `unpaired`
- **THEN** that lone game is removed from `games`

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
- **AND** `sente` is flipped (`player1` -> `player2`, `player2` -> `player1`, `unknown` unchanged)
- **AND** if the game had a non-null `result`, it is flipped (`player1_won` <-> `player2_won`; `draw` unchanged)

#### Scenario: Swap preserves game identity

- **WHEN** a swap is performed on a game that has `id`, `status`, `handicap`, and `round` set
- **THEN** only `player1`, `player2`, `sente`, and `result` fields change; all other fields remain unchanged

### Requirement: Pairings board — sorting and drop zones (updated from Part 1)

The unpaired container SHALL be automatically sorted by descending cumulative points (primary criterion) and descending `capturedRating.value` (secondary criterion). Sorting of the unpaired container SHALL be applied on every render via `containersFromGames`.

Paired rows SHALL be automatically sorted by descending max cumulative points of the pair (primary criterion) and descending max `capturedRating.value` of the pair (secondary criterion), where cumulative points SHALL be earned strictly BEFORE the active round (rounds `1..round-1` inclusive, i.e. `upToRound = round - 1`). Results entered in the active round SHALL NOT influence the order of that round's rows. Sorting of paired rows SHALL be applied on every render via `containersFromGames` and persisted after each drop operation via `sortRoundGamesByPairStrength` in `handleDragEnd`. Bye games in the active round SHALL NOT contribute points when sorting paired rows (they fall outside the points window).

For pairing rows (`p1-row-N`, `p2-row-N`), the component SHALL use `DropZone` (useDroppable only, no SortableContext) to prevent @dnd-kit from reordering cards within individual columns independently. The `unpaired` container SHALL use `SortableContainer` (useDroppable + SortableContext) to allow internal reordering.

The board SHALL render enough rows for every unpaired participant to have a free slot: the displayed row count SHALL be `max(game rows + 1, ceil((placed participants + unpaired participants) / 2))`, so at least one fully empty row is always rendered at the bottom below the last game row. Extra empty rows are display-only; no `Game` objects SHALL be created for them until a drop occurs.

Drop operations (`withParticipantDropped` and the cross-column swap) SHALL resolve target row indices against the displayed row order - the round's non-forfeit games sorted by the same points-before-round comparator that `containersFromGames` applies for rendering - regardless of the storage order of `games` or the position of auto-forfeit games. Auto-forfeit games SHALL stay outside row indexing and SHALL be returned unchanged by drop mutations. Rendering and mutations SHALL share one comparator implementation so the displayed and the mutated row order cannot diverge.

Cards SHALL remain draggable at all times regardless of publication status or result presence. Dropping a card into an occupied slot SHALL append a new bye row at the end instead of swapping with the existing card.

#### Scenario: Unpaired cards sorted by points then rating

- **WHEN** the unpaired container contains participants A (3 points, rating 1500), B (3 points, rating 1800), C (5 points, rating 1200)
- **THEN** the display order is C (5 pts), B (3 pts, 1800), A (3 pts, 1500)

#### Scenario: Paired rows sorted by max pair points then max pair rating

- **WHEN** two pairs exist: pair1 (A: 2 pts/1600, B: 4 pts/1400) and pair2 (C: 3 pts/1700, D: 1 pts/1300)
- **THEN** pair1 (max 4 pts) is displayed above pair2 (max 3 pts)

#### Scenario: Bye in current round excluded from sorting

- **WHEN** a participant has a bye in the current round (no opponent yet)
- **THEN** the bye does not contribute +1 point to their sorting position

#### Scenario: Active round results do not affect its own row order

- **WHEN** round 2 has some results already entered and the board for round 2 is rendered
- **THEN** the paired-row order is determined solely by points earned in round 1 (then rating)

#### Scenario: Display order is sorted regardless of storage order

- **WHEN** games for the active round are stored in `games` in an order that does not match the points-before-round comparator
- **THEN** the board renders the rows sorted by the comparator without requiring any drop interaction

#### Scenario: Extra empty rows rendered for unpaired overflow

- **WHEN** the board for a round shows 2 paired rows (4 placed participants, no free slots) and 5 unpaired participants
- **THEN** 3 additional empty rows are rendered so the number of free slots is at least 5
- **AND** no `Game` objects exist for the empty rows

#### Scenario: At least one empty trailing row is always rendered

- **WHEN** every participant is placed in complete pairs and the `unpaired` container is empty
- **THEN** one additional fully empty row is rendered at the bottom of the board

#### Scenario: Drop resolves against displayed row order

- **WHEN** the round's games are stored so that a lone game follows a paired game in `games`, but the comparator displays the lone game above it, and the user drops an unpaired participant into the `players2` zone of that displayed lone row
- **THEN** the displayed lone game receives the dropped participant as its `player2`, keeping its `id`, with `status = 'not_started'` and `result = null`
- **AND** no extra row is appended and no other row is modified

#### Scenario: Forfeit games do not shift row indices

- **WHEN** the round contains an auto-forfeit game stored among the round's games and the user drops a participant into the `players2` zone of a displayed row
- **THEN** the drop resolves against the displayed (forfeit-excluded) row order and the forfeit game is returned unchanged

#### Scenario: Drop in occupied slot appends new row

- **WHEN** the user drops a card into a `players1` slot that already has a card
- **THEN** a new bye row is appended at the end with the dropped card as player1

### Requirement: Pairings result button

Between each `players1`/`players2` row pair the board SHALL render a result button that cycles through `?` → `>` → `<` → `=`. The symbols map to `Game.result` as `null` / `'player1_won'` / `'player2_won'` / `'draw'`. Result buttons SHALL be disabled when the active round is not equal to `currentRound` or when the row's game is a lone game (`player2 == null`).

#### Scenario: Cycling the result

- **WHEN** the user clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'player1_won'` and the button shows `>`
- **AND** subsequent clicks cycle to `'player2_won'` (`<`), then `'draw'` (`=`), then back to `null` (`?`)

#### Scenario: Result button disabled before publication

- **WHEN** the active round is not equal to `currentRound`
- **THEN** all result buttons in that round's board are disabled

#### Scenario: Result button disabled for lone games

- **WHEN** a row contains a lone game (`player2 == null`)
- **THEN** the result button for that row is disabled

## REMOVED Requirements

### Requirement: Pairings card lock after result

**Reason**: manual pairing must stay correctable while results are recorded - the lock blocked dragging cards of scored pairs (e.g. fixing a mispaired game in the active round) and contradicted the "cards remain draggable at all times" rule already stated in the sorting and drop zones requirement of this change. Superseded by the ADDED requirement "Pairings card draggability".

## ADDED Requirements

### Requirement: Lone game invariant

Any pairings-board game with no opponent (`player2 == null`) that is not an auto-forfeit game (`status == 'forfeit'`) SHALL have `status: 'bye'`, `result: 'player1_won'`, and `handicap: null`. The pairings model SHALL establish this invariant whenever it creates or mutates a lone game (drop into an empty row of either column, removal of an opponent from a pair). The result and handicap buttons SHALL be disabled for lone rows.

#### Scenario: Lone game created by drop has invariant shape

- **WHEN** a participant is dropped into an empty row of `players1` or `players2`
- **THEN** the created game has `player2 = null`, `status = 'bye'`, `result = 'player1_won'`, `handicap = null`

#### Scenario: Invariant restored when a pair is broken

- **WHEN** one member of a pair is moved to `unpaired`
- **THEN** the remaining lone game has `status = 'bye'`, `result = 'player1_won'`, `handicap = null`

#### Scenario: Forfeit games are exempt

- **WHEN** a late joiner's auto-forfeit game exists (`player2 = null`, `status = 'forfeit'`, `result = 'player2_won'`)
- **THEN** the system does not rewrite its fields to lone-game values

#### Scenario: Handicap button disabled for lone games

- **WHEN** a row renders a lone game (`player2 == null`)
- **THEN** the handicap button for that row is disabled (same disabled condition as the result button)

### Requirement: Pairings card draggability

Participant cards on the pairings board SHALL remain draggable at all times - regardless of publication status, a recorded `Game.result` or `Game.handicap`, or lone-game status. No card lock based on game state SHALL be applied. The result and handicap buttons keep their own disabled conditions and are unaffected by this requirement.

#### Scenario: Cards with a recorded result remain draggable

- **WHEN** a paired game has `result = 'player1_won'`
- **THEN** both participant cards of the pair can be dragged (to `unpaired` or into another row)

#### Scenario: Dragging out of a scored pair applies pair-break normalization

- **WHEN** one member of a pair with a recorded result is dragged to `unpaired`
- **THEN** the remaining partner stays in the row as a lone game with lone-game field values (see the Lone game invariant requirement)

#### Scenario: Lone game cards stay draggable

- **WHEN** a lone game has `result = 'player1_won'` (bye point)
- **THEN** the participant card of that lone game remains draggable
