## ADDED Requirements

### Requirement: Participants section in tournament edit form

The Participants tab of the tournament edit form SHALL render a `ParticipantsSection` with a header titled "Участники турнира" / "Tournament participants" and a locale switcher (`LocaleTabs`) controlling the locale of localized participant fields. The section SHALL list all tournament participants as editable cards. Each card SHALL expose the fields: familyName, givenName (active locale), ratingValue, rank, nationality, location, residence, and title. `startingPoints` SHALL be set to 0 and SHALL NOT be editable on this tab.

#### Scenario: Rendering the Participants tab

- **WHEN** the user opens the Participants tab of the tournament edit form
- **THEN** the section renders with the header "Участники турнира" / "Tournament participants"
- **AND** a `LocaleTabs` switcher controls localized fields of all participant cards
- **AND** existing tournament participants are displayed as cards

#### Scenario: Empty participants list shows one empty card

- **WHEN** the tournament has no participants
- **THEN** the section displays a single empty participant card ready for input

#### Scenario: Editing a localized participant field

- **WHEN** the user changes the familyName of a participant while the `ru` locale is active
- **THEN** only the `ru` locale value of that participant's familyName changes
- **AND** the `en` locale value remains unchanged

#### Scenario: Starting points are not editable on this tab

- **WHEN** a participant is created via this tab
- **THEN** the participant's `startingPoints` SHALL be 0
- **AND** no UI control for `startingPoints` SHALL be displayed

### Requirement: Participant card row management

Each participant card SHALL be rendered in a row with an add button (`BsPlus`, tooltip "Добавить участника" / "Add participant") and a remove button (`BsX`, tooltip "Удалить участника" / "Remove participant") on the right, mirroring the Schedule section pattern. The add button SHALL insert a new empty participant card directly below the current card. The remove button SHALL require a confirmation modal before removing the card.

#### Scenario: Adding a participant below an existing card

- **WHEN** the user clicks the add button on participant card N
- **THEN** a new empty participant card is inserted at position N+1

#### Scenario: Removing a participant requires confirmation

- **WHEN** the user clicks the remove button on a participant card
- **THEN** a confirmation modal is displayed
- **AND** the participant is removed only after the user confirms

#### Scenario: Cancelling participant removal

- **WHEN** the removal confirmation modal is open and the user cancels
- **THEN** the participant card remains unchanged

### Requirement: Link participant to a player from the database

When a participant is not linked to a player, the card SHALL show a "link player" button (`BsFillPersonPlusFill`, tooltip "Связать с игроком из базы" / "Link to player from database"). Clicking the button SHALL open a search popover titled "Найти игрока в базе" / "Find a player in the database" containing a reusable player search panel. Selecting a player from the popover SHALL close the popover, link the player to the participant (`participant.player`), and open a confirmation modal asking whether to overwrite the participant's card fields with the selected player's data.

#### Scenario: Linking an unlinked participant

- **WHEN** the user clicks the "link player" button on an unlinked participant
- **THEN** a search popover opens with a player search input
- **WHEN** the user selects a player from the search results
- **THEN** the popover closes
- **AND** `participant.player` is set to the selected player's id
- **AND** a confirmation modal asks whether to overwrite the participant card from the player

#### Scenario: Confirming overwrite after linking

- **WHEN** the user confirms the "overwrite from player" modal after linking
- **THEN** the participant's localized name fields, nationality, residence, rating, and rank are overwritten with the linked player's current data

#### Scenario: Cancelling overwrite after linking

- **WHEN** the user cancels the "overwrite from player" modal after linking
- **THEN** `participant.player` remains set
- **AND** the participant card fields are NOT overwritten

### Requirement: Edit a linked player in a modal

When a participant is linked to a player (`participant.player` is set), the card SHALL show a button with the player's nationality flag and the text "FamilyName, GivenName" (tooltip "Редактировать связанного с участником игрока из базы" / "Edit the linked database player"). Clicking the button SHALL open a `PlayerEditModal` that reuses `PlayerInfoSection` and allows saving changes to the linked player via `playerService.update`. On save, the system SHALL show a confirmation modal asking whether to overwrite the participant's card fields with the updated player data.

#### Scenario: Opening the player edit modal

- **WHEN** the user clicks the linked-player button on a linked participant
- **THEN** a modal opens displaying the `PlayerInfoSection` for the linked player
- **AND** the modal exposes "Save" and "Cancel" buttons

#### Scenario: Saving changes to the linked player

- **WHEN** the user edits fields in the modal and clicks "Save"
- **THEN** the changes are persisted via `playerService.update`
- **AND** the modal closes
- **AND** a confirmation modal asks whether to overwrite the participant card from the updated player

#### Scenario: Modal does not navigate away from the tournament page

- **WHEN** the player edit modal saves a player
- **THEN** the browser SHALL remain on the tournament edit page
- **AND** no router navigation SHALL occur

### Requirement: Unlink a participant from a player

When a participant is linked to a player, the card SHALL show an "unlink" button (`BsFillPersonXFill`, tooltip "Отвязать от игрока из базы" / "Unlink from database player"). Clicking the button SHALL open a confirmation modal. On confirmation, the system SHALL set `participant.player` to `null` and SHALL NOT modify the participant's other fields.

#### Scenario: Unlinking a participant

- **WHEN** the user clicks the "unlink" button and confirms
- **THEN** `participant.player` becomes `null`
- **AND** the participant's name, nationality, rating, and other fields remain unchanged

#### Scenario: Cancelling unlink

- **WHEN** the user cancels the unlink confirmation
- **THEN** `participant.player` remains set

### Requirement: FamilyName autocomplete popover

While typing in the familyName field of a participant, a popover SHALL appear (without a title and without a separate search input) showing players whose family name matches the typed text. Selecting a player from the autocomplete popover SHALL immediately link the player to the participant (`participant.player`) and auto-fill the participant's card fields from the player's data WITHOUT showing a confirmation modal.

#### Scenario: Autocomplete shows matching players

- **WHEN** the user types at least three characters into the familyName field
- **THEN** a popover appears listing matching players (using `PlayerCard`)

#### Scenario: Selecting an autocomplete suggestion auto-fills without confirmation

- **WHEN** the user selects a player from the familyName autocomplete popover
- **THEN** `participant.player` is set to the selected player's id
- **AND** the participant's localized name, nationality, residence, rating, and rank are overwritten with the player's data
- **AND** NO confirmation modal is shown

#### Scenario: Autocomplete popover has no title or search input

- **WHEN** the familyName autocomplete popover is displayed
- **THEN** the popover does NOT render a title
- **AND** the popover does NOT render a separate search input (the familyName field itself drives the query)

### Requirement: Player search panel is a reusable component

A reusable `PlayerSearchPanel` component SHALL be extracted from the admin drawer's inline player search. It SHALL accept a query string, a query-change callback, an `onSelect(player)` callback, and the active locale. The admin drawer SHALL be refactored to use `PlayerSearchPanel` while preserving its existing search UX. The `PlayerSearchPanel` SHALL also be used by the participant link-player popover.

#### Scenario: Admin drawer uses the shared search panel

- **WHEN** the admin drawer renders the player search section
- **THEN** it delegates the input and result list to `PlayerSearchPanel`
- **AND** the existing debounce, loading, empty-state, and navigation behavior is preserved

#### Scenario: Participant link popover uses the shared search panel

- **WHEN** the participant link-player popover is open
- **THEN** the search input and results are rendered by `PlayerSearchPanel`

### Requirement: Player edit modal reuses shared form helpers

The `PlayerEditModal` SHALL NOT use `usePlayerForm` (to avoid router navigation and outlet-context side effects). Instead, `playerToFormState`, `formStateToUpdateInput`, `validatePlayerForm`, and `createEmptyFormState` SHALL be extracted from `usePlayerForm` into `src/hooks/playerFormHelpers.ts` and shared by both `usePlayerForm` and `PlayerEditModal`.

#### Scenario: Helpers are extracted to a shared module

- **WHEN** `usePlayerForm` needs to convert a player to form state
- **THEN** it calls `playerToFormState` imported from `playerFormHelpers.ts`
- **AND** the behavior is identical to the previous inline implementation

#### Scenario: Modal uses shared helpers instead of usePlayerForm

- **WHEN** the `PlayerEditModal` loads and saves a player
- **THEN** it uses `playerToFormState` and `formStateToUpdateInput` from `playerFormHelpers.ts`
- **AND** it does NOT instantiate `usePlayerForm`