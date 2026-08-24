## Purpose

TBD

## Requirements

### Requirement: Tournament basic information
The tournament entity SHALL represent the organizing country as a required ISO 3166-1 alpha-2 code. The tournament entity SHALL NOT contain an online/offline flag. The tournament entity SHALL represent the chief arbiter as a single optional localized name object. The tournament entity SHALL hold a `regulations` array of regulation id references (UUIDv7, default empty): old tournament documents without the field parse with an empty array; updates persist the array through `UpdateTournamentInput.regulations`; the edit form round-trips it with dirty tracking.

#### Scenario: Creating a draft tournament
- **WHEN** a user creates a new tournament draft
- **THEN** the system pre-fills `country` and `locales.*.location` from the user's IP address
- **AND** the draft document contains no `isOnline` field
- **AND** the draft document contains an optional `arbiter` field with localized `familyName` and `givenName`
- **AND** the draft document contains `regulations: []`

#### Scenario: Publishing a tournament
- **WHEN** a user publishes a tournament
- **THEN** the system rejects the publish action unless `country` is a valid 2-letter code
- **AND** the system rejects the publish action unless every locale has a non-empty `location`

#### Scenario: Existing tournament without the regulations field

- **WHEN** a tournament document created before this change (no `regulations` field) is loaded
- **THEN** it parses with `regulations` equal to an empty array

#### Scenario: Saving selected regulations

- **WHEN** the user adds regulations in the edit form and saves
- **THEN** the persisted tournament contains the selected regulation ids in `regulations` in selection order

### Requirement: Regulations picker in tournament general info

The general info section of the tournament edit form SHALL provide, below the description `ExpandableField`: a «+ Регламент» button visually styled like `ExpandableField` (ghost button with the `BsPlus` icon); when the tournament has no selected regulations, this button SHALL be the only element shown. When at least one regulation is selected, a «Регламенты» label SHALL appear above the button, followed by one removable outline badge per selected regulation (localized title + × button removing the id). Clicking the button SHALL open a `RegulationPickerModal` listing, in a scrollable area, only regulations the current user can edit (`listEditable`: created by the user, affiliated with associations the user manages, or all for admins) excluding already-selected ones; picking a regulation closes the modal and adds its badge next to the others. Badge titles resolve from the same loaded list; a saved regulation missing from the list SHALL render an «untitled» placeholder badge.

#### Scenario: No regulations selected

- **WHEN** the tournament has no regulations and the user opens the general info tab
- **THEN** only the «+ Регламент» button is rendered below the description field

#### Scenario: Selected regulations render as removable badges

- **WHEN** the tournament has two selected regulations
- **THEN** the «Регламенты» label renders with two outline badges showing localized titles, each with a working × removal button, above the «+ Регламент» button

#### Scenario: Picker lists only unselected editable regulations

- **WHEN** the user opens the picker and one of their editable regulations is already selected
- **THEN** the modal list excludes that regulation and shows the remaining editable ones

#### Scenario: Adding a regulation from the picker

- **WHEN** the user picks a regulation in the modal
- **THEN** the modal closes and a badge for the picked regulation appears next to the existing badges

### Requirement: Tournament startYearMonth computation

The `startYearMonth` field of a tournament SHALL be computed as the minimum `scheduledAt` date across both `schedule.rounds` and `schedule.events` arrays. If both arrays are empty, it SHALL default to the current month.

#### Scenario: startYearMonth considers both rounds and events

- **WHEN** a tournament has events in `schedule.events` but no rounds in `schedule.rounds`
- **THEN** `startYearMonth` is derived from the earliest `scheduledAt` in `schedule.events`

#### Scenario: startYearMonth with empty schedule

- **WHEN** a tournament has no rounds and no events in its schedule
- **THEN** `startYearMonth` defaults to the current month

### Requirement: Removed features
The tournament entity SHALL NOT provide an online/offline flag. The tournament entity SHALL NOT support multiple arbiters.

#### Scenario: Online flag absent
- **WHEN** a tournament is created or updated
- **THEN** no `isOnline` field is stored or exposed
- **AND** country selection is always visible in the tournament edit form

#### Scenario: Single arbiter
- **WHEN** a tournament is created or updated
- **THEN** only a single optional `arbiter` with localized `familyName` and `givenName` is stored
- **AND** no "Arbiters" tab appears in the tournament edit form

### Requirement: Tournament title search in admin drawer

The `TournamentRepository` SHALL provide a `searchByTitle(prefix: string): Promise<Tournament[]>` method that performs server-side prefix matching on `locales.<locale>.title` across all supported locales. The `TournamentService` SHALL expose this method as a passthrough. The admin drawer's "Tournaments" section SHALL provide a search input field above the month datepicker. When the search field contains 3 or more characters, the datepicker SHALL be disabled, and matching tournament cards (from the entire collection, not limited by month) SHALL be displayed. Search SHALL be debounced (300ms). The search SHALL cover all supported locales.

#### Scenario: User searches for a tournament by title

- **WHEN** the user types 3 or more characters in the tournament search field
- **THEN** the month datepicker becomes disabled
- **AND** the system performs a server-side search across all locales after a 300ms debounce
- **AND** matching tournament cards from any month are displayed

#### Scenario: User clears the tournament search field

- **WHEN** the tournament search field contains fewer than 3 characters
- **THEN** the month datepicker becomes active again
- **AND** the tournaments for the selected month are displayed as before

#### Scenario: Search covers all locales

- **WHEN** a tournament has a title in `ru` locale that matches the search prefix but the `en` locale title does not
- **THEN** the tournament is included in the search results

#### Scenario: Search with no results

- **WHEN** the user types a prefix that matches no tournament title in any locale
- **THEN** a "no tournaments found" message is displayed
- **AND** the datepicker remains disabled

#### Scenario: Repository searchByTitle implementation

- **WHEN** `searchByTitle` is called with a prefix
- **THEN** the repository issues Firestore range queries (`>=` prefix, `<=` prefix + `\uf8ff`) on `locales.<locale>.title` for each supported locale in parallel
- **AND** results are deduplicated by document id
- **AND** the result set is limited to 20 items

### Requirement: Tournament currentRound field

The tournament entity SHALL include a `currentRound` integer field representing the currently active round number. The domain schema (`tournamentSchema` in `src/domain/tournament.ts`) SHALL define it with a default of `0` so that existing Firestore documents without the field parse successfully. The `TournamentService.create` and `TournamentService.createDraft` methods SHALL initialize `currentRound` to `0` on newly created tournaments. The field SHALL round-trip through the Firestore repository mappers without mapper changes (serialized as part of the tournament object).

#### Scenario: New tournament is created with default currentRound

- **WHEN** a tournament is created via `TournamentService.create` or `TournamentService.createDraft`
- **THEN** the resulting tournament document has `currentRound` equal to `0`

#### Scenario: Existing document without currentRound parses successfully

- **WHEN** a Firestore tournament document lacking the `currentRound` field is loaded
- **THEN** the parsed tournament has `currentRound` equal to `0` (Zod default)

#### Scenario: currentRound is persisted and reloaded

- **WHEN** a tournament with `currentRound` set to a non-zero value is saved and then reloaded
- **THEN** the reloaded tournament has the same `currentRound` value

### Requirement: Tournament settings.considerSente field

The `tournamentSettings` object SHALL include a `considerSente` boolean field indicating whether player piece color ("sente" / first move) is taken into account when recording game results. The domain schema (`tournamentSettingsSchema`) SHALL define it with a default of `false` for backward compatibility with existing documents. The `defaultSettings()` helper in `TournamentService` SHALL initialize `considerSente` to `false`. The field SHALL round-trip through the Firestore repository mappers without mapper changes.

#### Scenario: New tournament is created with considerSente false

- **WHEN** a tournament is created via `TournamentService.create` or `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.considerSente` is `false`

#### Scenario: Existing document without considerSente parses successfully

- **WHEN** a Firestore tournament document whose `settings` lacks `considerSente` is loaded
- **THEN** the parsed tournament's `settings.considerSente` is `false` (Zod default)

#### Scenario: considerSente is persisted and reloaded

- **WHEN** a tournament with `settings.considerSente` set to `true` is saved and then reloaded
- **THEN** the reloaded tournament's `settings.considerSente` is `true`

### Requirement: considerSente toggle in tournament edit form

The tournament edit form (`TournamentEditForm.tsx`) SHALL render a dedicated "Advanced" (`Дополнительно`) section on the Settings tab containing a toggle bound to `settings.considerSente`. The toggle SHALL be labeled "Учитывать цвет в результатах партий" (ru) / "Consider piece color in game results" (en). The `useTournamentForm` hook SHALL provide an `updateConsiderSente(value: boolean)` updater that updates `formState.settings.considerSente` and marks the form as having unsaved changes. Changes to the toggle SHALL be included in the unsaved-changes detection and SHALL be persisted on save via the existing `settings` round-trip.

#### Scenario: User toggles considerSente on

- **WHEN** the user opens the Settings tab and switches the "Consider piece color" toggle from off to on
- **THEN** `formState.settings.considerSente` becomes `true`
- **AND** the form is marked as having unsaved changes

#### Scenario: User saves the tournament with considerSente enabled

- **WHEN** the user enables the toggle and clicks "Save Draft"
- **THEN** the persisted tournament document has `settings.considerSente` equal to `true`
- **AND** after reload the toggle reflects the enabled state

#### Scenario: considerSente defaults to off for a new draft

- **WHEN** a new tournament draft is opened in the edit form
- **THEN** the "Consider piece color" toggle is in the off position

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

The `PairingsBoard` for a round SHALL render three drop containers: `unpaired`, `players1`, and `players2`. Each container holds draggable participant cards derived from `tournament.participants`. Cards SHALL be draggable between containers using `@dnd-kit`. Dropping a card into `players1` or `players2` at a specific row position forms a pair with the card in the opposite column at the same row; when the target row holds a lone game, the completed game SHALL have `result = null` and a status derived by the game-status lifecycle rule (see the Game status lifecycle requirement), so the row's result and handicap controls become enabled. When the target row is empty, the dropped participant SHALL be stored as `player1` of a new lone game regardless of which column (`players1` or `players2`) received the drop. Dropping a card into the `unpaired` container SHALL remove that participant from any game in the round and append the card to the bottom of the `unpaired` container; when the active round is a past round (strictly earlier than `currentRound`), the participant SHALL instead receive a forfeit game for that round (see the Auto-forfeit for unpaired participants in past rounds requirement). When the active round equals `currentRound + 1` (the next round to be prepared), opening the round SHALL initialize all participants into the `unpaired` container if no games exist for that round yet. When a participant who currently has a forfeit game (`status = 'forfeit'`) is dropped into `players1` or `players2`, the forfeit game SHALL be removed so that the participant has exactly one game in the round (the newly formed pair). A participant SHALL NOT have two games in the same round.


When a card is dragged from `players1` at row N and dropped onto `players2` at the same row N (or vice versa), the system SHALL swap the two players in the game instead of creating a new bye. The swap SHALL exchange `player1` and `player2` on the game, keep `sente` attached to the position (unchanged — the player in position `player1` is sente when `considerSente` is true), and flip a non-null result (`player1_won` ↔ `player2_won`, `draw` unchanged). The swap SHALL be triggered when the drop target is a `p1-row-N` or `p2-row-N` zone AND the dragged participant currently occupies the opposite column at the same row index. The swap SHALL target the game displayed at that row (identified by game id), independent of the storage order of `games`. The sente symbols ☗/☖ in the crosstable SHALL reflect the swap immediately (no save required), because `sente` remains `'player1'` under the project invariant and `formStateToUpdateInput` forcing `sente='player1'` on save is a no-op.
#### Scenario: Next round initializes unpaired

- **WHEN** the user opens the round `currentRound + 1` for the first time and no games exist for that round
- **THEN** all tournament participants appear in the `unpaired` container

#### Scenario: Dragging a card to players1 creates a bye game

- **WHEN** the user drags a participant from `unpaired` into an empty row of `players1` (no opponent in `players2` at that row)
- **THEN** a `Game` is created in `games` with `player1` = that participant id, `player2 = null`, `status = 'bye'`, `sente = settings.considerSente ? 'player1' : 'unknown'`, `result = null`, and `round` = active round

#### Scenario: Dragging a card to players2 completes a pair

- **WHEN** the user drags a participant into `players2` opposite an existing `players1` card
- **THEN** the existing game for that row has its `player2` set to the dropped participant, its `status` set to `'not_started'`, and its `result` reset to `null` (clearing any previous lone-game bye result), so the row's result and handicap buttons become enabled

#### Scenario: Dragging a paired card back to unpaired keeps the partner in the row

- **WHEN** the user drags one member of a pair back to `unpaired`
- **THEN** the remaining partner stays in the same row as a lone game with lone-game field values
- **AND** the game is deleted only when the last player of a lone game is moved to `unpaired`

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
- **AND** `sente` is attached to the position (unchanged � the player in position `player1` is sente when `considerSente` is true)
- **AND** if the game had a non-null `result`, it is flipped (`player1_won` - `player2_won`; `draw` unchanged)

#### Scenario: Swap preserves game identity

- **WHEN** a swap is performed on a game that has `id`, `status`, `handicap`, and `round` set
- **THEN** only `player1`, `player2`, `sente`, and `result` fields change; all other fields remain unchanged
### Requirement: Pairings result button

Between each `players1`/`players2` row pair the board SHALL render a result button. For paired rows (both players present), the button cycles through `?` → `>` → `<` → `=` (4 states). The symbols map to `Game.result` as `null` / `'player1_won'` / `'player2_won'` / `'draw'`. For bye rows (lone game, `player2 == null`, `status != 'forfeit'`), the button cycles between `>` (`'player1_won'`) and `=` (`'draw'`), keeping `status: 'bye'`. Right-click (`onContextMenu` with `preventDefault()`) reverses the cycle direction. The result button SHALL be disabled only when `status === 'forfeit'`.

#### Scenario: Cycling the result forward

- **WHEN** the user left-clicks the result button of a pair whose `result` is `null`
- **THEN** the result becomes `'player1_won'` and the button shows `>`
- **AND** subsequent left-clicks cycle to `'player2_won'` (`<`), then `'draw'` (`=`), then back to `null` (`?`)

#### Scenario: Cycling the result backward

- **WHEN** the user right-clicks the result button of a pair whose `result` is `'draw'`
- **THEN** the result becomes `'player2_won'` and the button shows `<`
- **AND** subsequent right-clicks cycle to `'player1_won'` (`>`), then `null` (`?`), then back to `'draw'` (`=`)

#### Scenario: Bye result cycling

- **WHEN** the user clicks the result button of a bye row whose `result` is `'player1_won'`
- **THEN** the result becomes `'draw'` and the button shows `=`
- **AND** the next click returns to `'player1_won'` and the button shows `>`

#### Scenario: Result button disabled for forfeit rows

- **WHEN** a row has `status === 'forfeit'`
- **THEN** the result button for that row is disabled

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

## Part 3 Additions

### Requirement: Pairings board — sorting and drop zones (updated from Part 1)

The unpaired container SHALL be automatically sorted by descending cumulative points (primary criterion) and descending `capturedRating.value` (secondary criterion). Sorting of the unpaired container SHALL be applied on every render via `containersFromGames`.

Paired rows SHALL be automatically sorted by descending max cumulative points of the pair (primary criterion) and descending max `capturedRating.value` of the pair (secondary criterion). Sorting of paired rows SHALL be applied in `handleDragEnd` via `sortRoundGamesByPairStrength` after each drop operation, modifying the `games` array in `formState`. Bye-plays in the current round SHALL NOT contribute points when sorting paired rows (via `excludeByesInRound` parameter).

For pairing rows (`p1-row-N`, `p2-row-N`), the component SHALL use `DropZone` (useDroppable only, no SortableContext) to prevent @dnd-kit from reordering cards within individual columns independently. The `unpaired` container SHALL use `SortableContainer` (useDroppable + SortableContext) to allow internal reordering.

Cards SHALL remain draggable at all times regardless of publication status or result presence. When a card belonging to a pair with a non-null `result` is unpairеd (moved to `unpaired`), the game SHALL be deleted from `games`. Dropping a card into an occupied slot SHALL append a new bye row at the end instead of swapping with the existing card.

#### Scenario: Unpaired cards sorted by points then rating

- **WHEN** the unpaired container contains participants A (3 points, rating 1500), B (3 points, rating 1800), C (5 points, rating 1200)
- **THEN** the display order is C (5 pts), B (3 pts, 1800), A (3 pts, 1500)

#### Scenario: Paired rows sorted by max pair points then max pair rating

- **WHEN** two pairs exist: pair1 (A: 2 pts/1600, B: 4 pts/1400) and pair2 (C: 3 pts/1700, D: 1 pts/1300)
- **THEN** pair1 (max 4 pts) is displayed above pair2 (max 3 pts)

#### Scenario: Bye in current round excluded from sorting

- **WHEN** a participant has a bye in the current round (no opponent yet)
- **THEN** the bye does not contribute +1 point to their sorting position

#### Scenario: Drop in occupied slot appends new row

- **WHEN** the user drops a card into a `players1` slot that already has a card
- **THEN** a new bye row is appended at the end with the dropped card as player1

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

#### Scenario: English strings present

- **WHEN** the `en` translation file is loaded
- **THEN** `tournament.edit.tabs.pairings` exists and equals "Pairings"
- **AND** `tournament.edit.pairings.title` exists and equals "Rounds"
- **AND** `tournament.edit.pairings.publishDraw`, `tournament.edit.pairings.drawPublished`, and `tournament.edit.pairings.forfeit` exist

## Part 4 Additions

### Requirement: Handicap cycling button

Each pairing row in the `PairingsBoard` SHALL render a handicap button between the `players1` and `players2` slots (adjacent to the result button). The button SHALL display the current `Game.handicap` value as a short code string, or `=` when `handicap` is `null`. Left-clicking the button SHALL cycle `Game.handicap` forward through the sequence: `null -> -L -> -B -> -R -> -RL -> -2p -> -4p -> -5p -> -6p -> -8p -> -10p -> +L -> +B -> +R -> +RL -> +2p -> +4p -> +5p -> +6p -> +8p -> +10p -> null`. Right-click (`onContextMenu` with `preventDefault()`) SHALL cycle backward through the same sequence. Double-click SHALL reset `handicap` to `null`; single clicks SHALL be deferred ~250 ms so that a double-click does not first advance the cycle. The button SHALL carry a DaisyUI tooltip reading "Игра с форой" (ru) / "Game with handicap" (en). The handicap button SHALL be disabled for lone games (`player2 == null`, covering both bye and forfeit rows).

#### Scenario: Cycling from no handicap to first handicap code

- **WHEN** the user left-clicks the handicap button of a game whose `handicap` is `null`
- **THEN** `game.handicap` becomes `'-L'`
- **AND** the button displays `-L`

#### Scenario: Cycling through all codes wraps around

- **WHEN** the user left-clicks the handicap button repeatedly through all 21 states
- **THEN** after `'+10p'` the next click returns `handicap` to `null` and the button displays `=`

#### Scenario: Right-click cycles backward

- **WHEN** the user right-clicks the handicap button of a game whose `handicap` is `'-L'`
- **THEN** `game.handicap` becomes `null` and the button displays `=`

#### Scenario: Double-click resets handicap

- **WHEN** the user double-clicks the handicap button of a game whose `handicap` is `'+4p'`
- **THEN** `game.handicap` becomes `null` and the button displays `=`
- **AND** the deferred single-click timer is cancelled and the cycle does not advance

#### Scenario: Handicap button disabled for lone games

- **WHEN** a row renders a lone game (`player2 == null`, bye or forfeit)
- **THEN** the handicap button for that row is disabled

#### Scenario: Tooltip shown on handicap button

- **WHEN** the user hovers over the handicap button
- **THEN** a DaisyUI tooltip displays "Игра с форой" (ru locale) or "Game with handicap" (en locale)
## Part 5 Additions

### Requirement: Lone game invariant

Any pairings-board game with no opponent (player2 == null) that is not an auto-forfeit game (status == 'forfeit') SHALL have status: 'bye', result: 'player1_won' (default) or result: 'draw', and handicap: null. The pairings model SHALL establish this invariant whenever it creates or mutates a lone game (drop into an empty row of either column, removal of an opponent from a pair). The result button is enabled for bye rows (cycles between '>' and '='). The handicap button SHALL be disabled for lone rows.

#### Scenario: Lone game created by drop has invariant shape

- **WHEN** a participant is dropped into an empty row of players1 or players2
- **THEN** the created game has player2 = null, status = 'bye', result = 'player1_won', handicap = null

#### Scenario: Invariant restored when a pair is broken

- **WHEN** one member of a pair is moved to unpaired
- **THEN** the remaining lone game has status = 'bye', result = 'player1_won', handicap = null

#### Scenario: Forfeit games are exempt

- **WHEN** a late joiner's auto-forfeit game exists (player2 = null, status = 'forfeit', result = 'player2_won')
- **THEN** the system does not rewrite its fields to lone-game values

#### Scenario: Handicap button disabled for lone games

- **WHEN** a row renders a lone game (player2 == null)
- **THEN** the handicap button for that row is disabled

### Requirement: Pairings card draggability

Participant cards on the pairings board SHALL remain draggable at all times - regardless of publication status, a recorded Game.result or Game.handicap, or lone-game status. No card lock based on game state SHALL be applied. The result and handicap buttons keep their own disabled conditions and are unaffected by this requirement.

#### Scenario: Cards with a recorded result remain draggable

- **WHEN** a paired game has result = 'player1_won'
- **THEN** both participant cards of the pair can be dragged (to unpaired or into another row)

#### Scenario: Dragging out of a scored pair applies pair-break normalization

- **WHEN** one member of a pair with a recorded result is dragged to unpaired
- **THEN** the remaining partner stays in the row as a lone game with lone-game field values (see the Lone game invariant requirement)

#### Scenario: Lone game cards stay draggable

- **WHEN** a lone game has result = 'player1_won' (bye point)
- **THEN** the participant card of that lone game remains draggable

### Requirement: Game status lifecycle

Every `Game.status` field SHALL be derived by a single rule (`deriveGameStatus(game, currentRound)`): a game with stored `status = 'forfeit'` keeps `forfeit`; a game with stored `status = 'bye'` keeps `bye`; a paired game (`player2 != null`) with a non-null `result` is `completed`; a paired game without a result in the active round is `live`; a paired game without a result in any other round is `not_started`. A `normalizeGame(game, currentRound)` wrapper also re-applies the lone-game invariant (bye: `handicap: null`, default `result: 'player1_won'`) and returns the same object reference when nothing changes. All mutation paths (`updateGames`, `publishDraw`, `unpublishDraw`, and every `pairingsModel` mutation) SHALL normalize `Game.status` accordingly.

#### Scenario: Reference-stable normalization

- **WHEN** `normalizeGame` is called on a game whose derived status equals its stored status
- **THEN** the same object reference is returned unchanged

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