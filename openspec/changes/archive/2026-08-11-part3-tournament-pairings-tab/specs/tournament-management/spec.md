## MODIFIED Requirements

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container. When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet.

Cards SHALL remain draggable at all times regardless of publication status or result presence. When a card belonging to a pair with a non-null `result` is unpairеd (moved to `unpaired`), the game SHALL be deleted from `games`.

The unpaired container SHALL be automatically sorted by descending cumulative points (primary criterion) and descending `capturedRating.value` (secondary criterion). Sorting of the unpaired container SHALL be applied on every render via `containersFromGames`.

Paired rows SHALL be automatically sorted by descending max cumulative points of the pair (primary criterion) and descending max `capturedRating.value` of the pair (secondary criterion). Sorting of paired rows SHALL be applied in `handleDragEnd` via `sortRoundGamesByPairStrength` after each drop operation, modifying the `games` array in `formState`. Bye-plays in the current round SHALL NOT contribute points when sorting paired rows (via `excludeByesInRound` parameter).

For pairing rows (`p1-row-N`, `p2-row-N`), the component SHALL use `DropZone` (useDroppable only, no SortableContext) to prevent @dnd-kit from reordering cards within individual columns independently. The `unpaired` container SHALL use `SortableContainer` (useDroppable + SortableContext) to allow internal reordering.

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

#### Scenario: Unpaired cards sorted by points then rating

- **WHEN** the unpaired container contains participants A (3 points, rating 1500), B (3 points, rating 1800), C (5 points, rating 1200)
- **THEN** the display order is C (5 pts), B (3 pts, 1800), A (3 pts, 1500)

#### Scenario: Paired rows sorted by max pair points then max pair rating

- **WHEN** two pairs exist: pair1 (A: 2 pts/1600, B: 4 pts/1400) and pair2 (C: 3 pts/1700, D: 1 pts/1300)
- **THEN** pair1 (max 4 pts) is displayed above pair2 (max 3 pts)

## ADDED Requirements

### Requirement: Auto-forfeit for late joiners in past rounds

When a new participant is added via `addParticipant` and `currentRound > 0`, the system SHALL automatically create forfeit games for that participant in all rounds `1..currentRound`. Each forfeit game SHALL have `player1` = new participant id, `player2 = null`, `status = 'forfeit'`, `result = 'player2_won'`, `sente = considerSente ? 'player1' : 'unknown'`, and `round` = the respective round number.

#### Scenario: New participant added mid-tournament gets forfeits for past rounds

- **WHEN** a new participant is added while `currentRound = 3`
- **THEN** forfeit games are created for rounds 1, 2, and 3 for that participant
- **AND** each game has `status = 'forfeit'` and `result = 'player2_won'`

#### Scenario: New participant added before first round gets no forfeits

- **WHEN** a new participant is added while `currentRound = 0`
- **THEN** no forfeit games are created

### Requirement: Persistent forfeit in unpaired for next round

When a participant has a forfeit game in the current round and the next round is opened, the participant SHALL appear in the `unpaired` container with the forfeit game preserved in `games` for the new round. The forfeit game SHALL NOT be deleted when switching to a new round.

#### Scenario: Forfeit participant appears in unpaired with forfeit game in next round

- **WHEN** a participant has a forfeit game in round 2 and the user opens round 3
- **THEN** the participant appears in the `unpaired` container for round 3
- **AND** a forfeit game exists for that participant in round 3

#### Scenario: Forfeit participant can still be paired in next round

- **WHEN** a participant with a forfeit in round 2 is dragged into `players1` in round 3
- **THEN** the forfeit game for round 3 is removed (replaced by a normal pairing game)