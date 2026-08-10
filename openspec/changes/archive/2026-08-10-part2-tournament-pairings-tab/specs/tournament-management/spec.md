## MODIFIED Requirements

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container. When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet.

Cards SHALL remain draggable at all times regardless of publication status or result presence. When a card belonging to a pair with a non-null `result` is unpairеd (moved to `unpaired`), the game SHALL be deleted from `games`.

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

#### Scenario: Dragging a card with a result deletes the game

- **WHEN** the user drags a participant from a pair that has a non-null `result` back into `unpaired`
- **THEN** the `Game` is deleted from `games` (the result is discarded)

#### Scenario: Dropping at a position reorders pairs

- **WHEN** the user drops a card between two existing rows of `players1`
- **THEN** the order of games for that round is updated to reflect the new row position

### Requirement: Pairings result button

Between each `players1`/`players2` row pair the board SHALL render a result button that cycles through `?` → `>` → `<` → `=`. The symbols map to `Game.result` as `null` / `'player1_won'` / `'player2_won'` / `'draw'`. Result buttons SHALL be enabled at all times (no publication gating).

#### Scenario: Cycling the result

- **WHEN** the user clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'player1_won'` and the button shows `>`
- **AND** subsequent clicks cycle to `'player2_won'` (`<`), then `'draw'` (`=`), then back to `null` (`?`)

#### Scenario: Result button always enabled

- **WHEN** the user views a published round or an unpublished round
- **THEN** all result buttons are enabled and can be cycled

### Requirement: Per-card forfeit toggle

Each participant card rendered in the pairings board SHALL display a toggle (refining the `showToggle` capability of `PlayerCard`) labeled with the tooltip "Техническое поражение" / "Forfeit". When the toggle is off, the participant SHALL be removed from `players1`/`players2` and forced into the `unpaired` container, and a `Game` with `player1` = that participant, `player2 = null`, `status = 'forfeit'`, `round` = active round SHALL be created/updated. When the toggle is on, the participant behaves as a normal draggable card and any existing `forfeit` game for that participant in the round SHALL be removed. The forfeit toggle SHALL be enabled at all times.

#### Scenario: Enabling forfeit for a participant

- **WHEN** the user switches a participant's forfeit toggle from on to off
- **THEN** the participant card moves to the `unpaired` container
- **AND** a `Game` with `status = 'forfeit'` and `player2 = null` exists for that participant in the active round

#### Scenario: Disabling forfeit for a participant

- **WHEN** the user switches a participant's forfeit toggle from off to on
- **THEN** the `forfeit` game for that participant in the active round is removed
- **AND** the participant card becomes draggable from the `unpaired` container

#### Scenario: Forfeit toggles reflected in publish eligibility

- **WHEN** all remaining participants are paired and at least one participant has a `forfeit` game
- **THEN** the "Publish draw" button is enabled because the forfeiting participant counts as placed in a game

## ADDED Requirements

### Requirement: Unpublish draw button

The `PairingsSection` SHALL display an "Отменить жеребьёвку" / "Unpublish draw" button to the left of the publish/unpublish button. The button SHALL be visible only when `safeActiveRound === safeCurrentRound && safeCurrentRound > 0`. Clicking the enabled button SHALL delete any games for `currentRound + 1` and decrement `currentRound` by 1 (minimum 0) via `useTournamentForm.unpublishDraw()`.

#### Scenario: Unpublish button visible for current round

- **WHEN** the active round equals `currentRound` and `currentRound > 0`
- **THEN** the "Unpublish draw" button is visible and enabled

#### Scenario: Unpublish button hidden for future rounds

- **WHEN** the active round is greater than `currentRound` (next round being prepared)
- **THEN** the "Unpublish draw" button is not displayed

#### Scenario: Unpublish deletes next round games and decrements currentRound

- **WHEN** the user clicks "Unpublish draw" while `currentRound = 2`
- **THEN** any games for round `3` (`currentRound + 1`) are deleted
- **AND** `currentRound` becomes `1`

#### Scenario: Unpublish at round 1 sets currentRound to 0

- **WHEN** the user clicks "Unpublish draw" while `currentRound = 1`
- **THEN** any games for round `2` are deleted
- **AND** `currentRound` becomes `0`

### Requirement: Cumulative participant points display

Each participant card in the pairings board SHALL display a cumulative points badge. Cumulative points = `participant.startingPoints` + sum of points earned from game results across all rounds up to and including the active round. Points: win (`player1_won` for player1, `player2_won` for player2) = 1, draw = 0.5, bye = 1, forfeit = 0. The badge SHALL be visible only in the pairings tab.

#### Scenario: Points include startingPoints and game results

- **WHEN** a participant has `startingPoints = 2` and has won one game in round 1
- **THEN** the badge displays `3` when viewing any round ≥ 1

#### Scenario: Points accumulate across rounds

- **WHEN** a participant wins round 1 and draws round 2
- **THEN** the badge displays `1.5` (plus `startingPoints`) when viewing round 2 or later

#### Scenario: Bye counts as a win

- **WHEN** a participant has a bye game (`status = 'bye'`) in round 1
- **THEN** the badge includes +1 point for that round

#### Scenario: Forfeit gives zero points

- **WHEN** a participant has a forfeit game (`status = 'forfeit'`) in a round
- **THEN** the badge adds 0 points for that round

### Requirement: Starting points inline editing

The `PlayerCard` component SHALL render an editable input bound to `participant.startingPoints` when rendered in the pairings tab. Editing the input SHALL update `startingPoints` for that participant across all rounds via `useTournamentForm.updateStartingPoints(participantId, value)`. The input SHALL display `0` when `startingPoints` is `0` or undefined. The input and points badge SHALL NOT appear in `PlayerSearchPanel` or other non-pairings call sites.

#### Scenario: Editing startingPoints updates participant

- **WHEN** the user types `3` in the startingPoints input for participant 5
- **THEN** `participant[5].startingPoints` becomes `3` in `formState.participants`
- **AND** the cumulative points badge updates immediately

#### Scenario: Input shows 0 by default

- **WHEN** a participant has `startingPoints = 0` or undefined
- **THEN** the input displays `0`

#### Scenario: Input hidden outside pairings tab

- **WHEN** `PlayerCard` is rendered in `PlayerSearchPanel` (no `startingPoints` / `onStartingPointsChange` props)
- **THEN** the input and points badge are not rendered

### Requirement: Pairings i18n strings part 2

The locale dictionaries `src/locales/{ru,en}/translation.json` SHALL add keys: `tournament.edit.pairings.unpublishDraw` and `tournament.edit.pairings.startingPoints`. All user-facing strings introduced by part 2 SHALL be translated in both `ru` and `en`.

#### Scenario: Russian strings present

- **WHEN** the `ru` translation file is loaded
- **THEN** `tournament.edit.pairings.unpublishDraw` exists and equals "Отменить жеребьёвку"
- **AND** `tournament.edit.pairings.startingPoints` exists

#### Scenario: English strings present

- **WHEN** the `en` translation file is loaded
- **THEN** `tournament.edit.pairings.unpublishDraw` exists and equals "Unpublish draw"
- **AND** `tournament.edit.pairings.startingPoints` exists