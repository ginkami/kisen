## ADDED Requirements

### Requirement: Tournament pairings tab

The tournament edit form (`TournamentEditForm.tsx`) SHALL render a "Пары по туров" / "Pairings" tab with the `Bs123` icon. The tab SHALL render a `PairingsSection` that is the entry point to round-by-round pairing management. The tab SHALL be available for any tournament that has at least one round in `schedule.rounds`. The `useTournamentForm` hook SHALL expose `games: Game[]` and `currentRound: number` as part of `TournamentFormState`, initialized from the loaded tournament and persisted through `tournamentService.update`.

#### Scenario: User opens the Pairings tab

- **WHEN** the user clicks the "Pairings" tab in `TournamentEditForm`
- **THEN** the `PairingsSection` is rendered with a "Rounds" header and a row of round sub-tabs numbered `1` through `schedule.rounds.length`

#### Scenario: Tournament with no rounds

- **WHEN** the tournament has no rounds in `schedule.rounds`
- **THEN** the "Pairings" tab renders an empty state and no round sub-tabs

#### Scenario: Form state round-trips games and currentRound

- **WHEN** a tournament with `currentRound = 1` and two games for round 1 is loaded into the edit form
- **THEN** `formState.games` contains those two games and `formState.currentRound` equals `1`
- **AND** on "Save Draft" both `games` and `currentRound` are sent to `tournamentService.update`

#### Scenario: Update input carries currentRound

- **WHEN** the form is saved while `currentRound` differs from the persisted value
- **THEN** `UpdateTournamentInput` includes the new `currentRound` value
- **AND** the repository persists it and the reloaded tournament reflects the new value

### Requirement: Pairings round navigation

The `PairingsSection` SHALL render one sub-tab per round (`1..schedule.rounds.length`). Round sub-tabs with number strictly greater than `currentRound + 1` SHALL be disabled. The currently selected round sub-tab is local UI state initialized to `currentRound` (or `1` when `currentRound === 0`). Selecting a non-disabled round sub-tab SHALL display the `PairingsBoard` for that round.

#### Scenario: Default visible round

- **WHEN** a tournament with `currentRound = 0` is opened in the Pairings tab
- **THEN** round sub-tab `1` is active and all round sub-tabs except `1` are disabled

#### Scenario: Advancing unlocks the next round

- **WHEN** `currentRound` is advanced from `0` to `1`
- **THEN** round sub-tabs `1` and `2` become enabled and round sub-tabs `> 2` remain disabled

#### Scenario: User switches rounds

- **WHEN** the user clicks an enabled round sub-tab `2`
- **THEN** the `PairingsBoard` for round `2` is rendered and round sub-tab `2` is marked active

### Requirement: Publish draw button

The `PairingsSection` header SHALL contain a right-aligned "Опубликовать жеребьёвку" / "Publish draw" button. The button SHALL be disabled unless every tournament participant appears in a game for the active round (either as `player1` or `player2`, or as a single-participant `forfeit`/`bye` game). Clicking the enabled button SHALL set `currentRound` to the active round number via `useTournamentForm.publishDraw(round)`. After `currentRound` equals the active round, the button SHALL be disabled and labeled "Жеребьёвка опубликована" / "Draw published".

#### Scenario: Publish disabled when participants are unpaired

- **WHEN** the active round has at least one participant not placed in any game slot
- **THEN** the "Publish draw" button is disabled

#### Scenario: Publish enabled when all participants are paired

- **WHEN** every tournament participant is referenced by some game in the active round
- **THEN** the "Publish draw" button is enabled

#### Scenario: Publishing advances currentRound

- **WHEN** the user clicks the enabled "Publish draw" button for round `1`
- **THEN** `currentRound` is set to `1`
- **AND** the button becomes disabled and labeled "Draw published"

#### Scenario: Already-published round shows locked button

- **WHEN** the active round equals `currentRound`
- **THEN** the button is disabled and labeled "Draw published"

### Requirement: Pairings board layout and drag-and-drop

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container. When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet.

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

### Requirement: Pairings result button

Between each `players1`/`players2` row pair the board SHALL render a result button that cycles through `?` → `>` → `<` → `=`. The symbols map to `Game.result` as `null` / `'player1_won'` / `'player2_won'` / `'draw'`. Result buttons SHALL be disabled when the active round is not equal to `currentRound`.

#### Scenario: Cycling the result

- **WHEN** the user clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'player1_won'` and the button shows `>`
- **AND** subsequent clicks cycle to `'player2_won'` (`<`), then `'draw'` (`=`), then back to `null` (`?`)

#### Scenario: Result button disabled before publication

- **WHEN** the active round is not equal to `currentRound`
- **THEN** all result buttons in that round's board are disabled

### Requirement: Pairings card lock after result

A participant card belonging to a pair that has a non-null `Game.result` SHALL be non-draggable. Clearing the result back to `null` (by cycling the result button to `?`) SHALL restore draggability.

#### Scenario: Cards locked once result is set

- **WHEN** a pair's `Game.result` is set to `'player1_won'`
- **THEN** both participant cards of that pair cannot be dragged

#### Scenario: Cards unlocked when result cleared

- **WHEN** the user cycles the result button back to `?` (`result = null`)
- **THEN** both cards become draggable again

### Requirement: Per-card forfeit toggle

Each participant card rendered in the pairings board SHALL display a toggle (refining the `showToggle` capability of `PlayerCard`) labeled with the tooltip "Техническое поражение" / "Forfeit". When the toggle is off, the participant SHALL be removed from `players1`/`players2` and forced into the `unpaired` container, and a `Game` with `player1` = that participant, `player2 = null`, `status = 'forfeit'`, `round` = active round SHALL be created/updated. When the toggle is on, the participant behaves as a normal draggable card and any existing `forfeit` game for that participant in the round SHALL be removed.

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

### Requirement: PlayerCard controllable toggle

The `PlayerCard` component SHALL accept optional `toggleChecked?: boolean`, `onToggleChange?: (checked: boolean) => void`, and `toggleTooltip?: string` props. When `showToggle` is `true` and `toggleChecked`/`onToggleChange` are provided, the toggle SHALL be controlled by those props and render the `toggleTooltip` as a DaisyUI tooltip. When `showToggle` is `true` but `toggleChecked`/`onToggleChange` are absent, the toggle SHALL remain in its current decorative (uncontrolled, always-checked) state to preserve existing call sites.

#### Scenario: Controllable toggle renders supplied state

- **WHEN** `PlayerCard` is rendered with `showToggle`, `toggleChecked={false}`, and `onToggleChange`
- **THEN** the toggle reflects the unchecked state
- **AND** interacting with the toggle calls `onToggleChange(true)`

#### Scenario: Tooltip is shown for the toggle

- **WHEN** `PlayerCard` is rendered with `showToggle`, `toggleChecked`, `onToggleChange`, and `toggleTooltip="Техническое поражение"`
- **THEN** the toggle element is decorated with a DaisyUI `tooltip` showing "Техническое поражение"

#### Scenario: Existing decorative usage stays intact

- **WHEN** `PlayerCard` is rendered with only `showToggle={true}` and no `toggleChecked`/`onToggleChange`
- **THEN** the toggle remains checked and non-interactive, matching pre-change behavior

### Requirement: Pairings i18n strings

The locale dictionaries `src/locales/{ru,en}/translation.json` SHALL add keys under `tournament.edit.pairings.*` (at minimum: `title`, `publishDraw`, `drawPublished`, `forfeit`, result symbols `resultUndecided`, `resultPlayer1Won`, `resultPlayer2Won`, `resultDraw`) and `tournament.edit.tabs.pairings`. All user-facing strings introduced by the pairings feature SHALL be translated in both `ru` and `en`.

#### Scenario: Russian strings present

- **WHEN** the `ru` translation file is loaded
- **THEN** `tournament.edit.tabs.pairings` exists and equals "Пары по туров"
- **AND** `tournament.edit.pairings.title` exists and equals "Туры"
- **AND** `tournament.edit.pairings.publishDraw`, `tournament.edit.pairings.drawPublished`, and `tournament.edit.pairings.forfeit` exist

#### Scenario: English strings present

- **WHEN** the `en` translation file is loaded
- **THEN** `tournament.edit.tabs.pairings` exists and equals "Pairings"
- **AND** `tournament.edit.pairings.title` exists and equals "Rounds"
- **AND** `tournament.edit.pairings.publishDraw`, `tournament.edit.pairings.drawPublished`, and `tournament.edit.pairings.forfeit` exist