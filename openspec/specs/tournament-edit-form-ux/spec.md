## Purpose

TBD

## Requirements

### Requirement: Locale editing is isolated

The tournament edit form SHALL update only the active locale when the user types into a localized field. It SHALL NOT copy values from one locale to another during typing. On save and on publish, empty required fields (`title`, `location` for tournament locales; `givenName`, `familyName` for arbiter locales and participant locales) SHALL be backfilled from the first locale (in `supportedLocales` order) providing a non-empty value for that field, so a locale with any content is not lost or invalid.

#### Scenario: Typing in the Russian locale

- **WHEN** the user enters text into a localized field while the `ru` locale is active
- **THEN** only the `ru` locale value changes; the `en` locale value remains unchanged

#### Scenario: Typing in the English locale

- **WHEN** the user enters text into a localized field while the `en` locale is active
- **THEN** only the `en` locale value changes; the `ru` locale value remains unchanged

#### Scenario: Save backfills empty required locale fields

- **WHEN** the user fills `title` and `location` in the `ru` locale only and saves the draft
- **THEN** the saved tournament's `en` locale has its `title` and `location` backfilled from the `ru` locale

### Requirement: Optional fields collapse when empty

Optional form fields (description and venue) SHALL be hidden behind a `+ <Label>` button when their current value is empty. The field label SHALL also be hidden while the field is collapsed. Expanding the field SHALL reveal the label and input controls. The arbiter section is NOT optional and therefore SHALL NOT use this collapsing behavior.

#### Scenario: Empty optional field

- **WHEN** an optional field has no value
- **THEN** the form displays a button containing a plus icon and the field label

#### Scenario: Expanding an optional field

- **WHEN** the user clicks the `+ <Label>` button
- **THEN** the button is replaced by the field label and the corresponding input controls

#### Scenario: Non-empty optional field

- **WHEN** an optional field already contains a value
- **THEN** the label and input controls are visible immediately

### Requirement: Locale switcher uses localized labels

The locale switcher SHALL display the Russian locale button as `РУ` and the English locale button as `EN`. This SHALL apply to every locale switcher in the application, including the one in the site header and the one inside the tournament edit form.

#### Scenario: Header language switcher

- **WHEN** the header `LanguageSwitcher` is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

#### Scenario: Tournament form locale switcher

- **WHEN** the `LocaleTabs` switcher inside the tournament edit form is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

### Requirement: Country selector shows SVG flags

The country selector SHALL render each country option with an SVG flag from the `country-flag-icons` package inside a custom DaisyUI dropdown.

#### Scenario: Opening the country dropdown

- **WHEN** the user opens the country selector dropdown
- **THEN** each option displays the SVG flag for that country alongside the localized country name

#### Scenario: Selected country

- **WHEN** a country is selected
- **THEN** the closed selector displays the selected country's SVG flag and name

### Requirement: New drafts prefill arbiter from the current user

When a new tournament draft is created, the system SHALL initialize the arbiter's given name and family name from the authenticated user's profile for every supported locale. If the user profile is not loaded, the system SHALL fall back to the information available in the Firebase Auth account.

#### Scenario: Creating a tournament as a logged-in user with a loaded profile

- **WHEN** a user creates a new tournament draft
- **THEN** the arbiter fields are initialized with the user's `givenName` and `familyName` from `user.locales.ru` and `user.locales.en`

#### Scenario: Existing arbiter data is preserved

- **WHEN** a tournament already has stored arbiter data
- **THEN** the existing values are loaded unchanged

### Requirement: Arbiter is a required tournament field

The tournament domain model SHALL require a chief arbiter. The `arbiter.locales.[lang].familyName` and `arbiter.locales.[lang].givenName` fields SHALL NOT be empty. The tournament edit form SHALL always render the arbiter given/family name inputs and SHALL mark them as required.

#### Scenario: Rendering the general-info form

- **WHEN** the general-info section of the tournament edit form is displayed
- **THEN** the arbiter given name and family name inputs are visible without a collapse/expand button

#### Scenario: Validating the arbiter fields

- **WHEN** the user clears an arbiter name field
- **THEN** the form reports a validation error for the empty arbiter name

#### Scenario: Publishing a tournament without an arbiter

- **WHEN** a tournament is published or updated
- **THEN** the operation fails validation if any arbiter locale name is missing

### Requirement: Multiple Buchholz cut tie-breaks with configurable cut count

The tie-breaks section of the tournament edit form SHALL allow adding multiple `buchholz_cut` tie-break entries, each with its own `cutCount` value. When `buchholz_cut` is the selected tie-break type in the add control, a numeric input for `cutCount` SHALL be displayed. Other tie-break types SHALL remain unique — only one instance per type SHALL be allowed.

#### Scenario: Adding a Buchholz cut tie-break with a custom cut count

- **WHEN** the user selects `buchholz_cut` from the tie-break type dropdown and enters `2` in the `cutCount` input, then clicks "Add"
- **THEN** a new `buchholz_cut` tie-break with `cutCount: 2` is appended to the tie-breaks list

#### Scenario: Adding multiple Buchholz cut tie-breaks

- **WHEN** the user adds a `buchholz_cut` tie-break with `cutCount: 1` and then adds another `buchholz_cut` tie-break with `cutCount: 2`
- **THEN** both entries appear in the tie-breaks list, displayed as "Buchholz cut (1)" and "Buchholz cut (2)"

#### Scenario: Buchholz cut remains available after being added

- **WHEN** the user adds a `buchholz_cut` tie-break
- **THEN** `buchholz_cut` remains in the available types dropdown for further additions

#### Scenario: Non-cut tie-break types are unique

- **WHEN** the user adds a `buchholz` tie-break and it is already in the list
- **THEN** `buchholz` is removed from the available types dropdown and cannot be added again

#### Scenario: Cut count input is hidden for non-cut types

- **WHEN** the selected tie-break type is anything other than `buchholz_cut`
- **THEN** the `cutCount` numeric input is not displayed

### Requirement: New tournament drafts default to byoyomi time control

When `TournamentService.createDraft` creates a new tournament draft, the `settings.timeControl` SHALL be initialized to a `byoyomi` time control with `mainTime: 0`, `byoyomiTime: 0`, and `byoyomiPeriods: 1`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.timeControl.type` is `byoyomi`
- **AND** `byoyomiTime` is `0`
- **AND** `byoyomiPeriods` is `1`

### Requirement: New tournament drafts default to standard tie-break sequence

When `TournamentService.createDraft` creates a new tournament draft, the `settings.tieBreaks` SHALL be initialized to `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }]`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.tieBreaks` contains exactly three entries
- **AND** the first entry has `type: 'points'`
- **AND** the second entry has `type: 'buchholz'`
- **AND** the third entry has `type: 'sonneborn_berger'`

### Requirement: Schedule section displays unified chronological program

The schedule section of the tournament edit form SHALL display a single chronological feed that merges `schedule.events` and `schedule.rounds` into one list of rows. Each row SHALL be either an event (with locale-dependent title) or a round (with a number). The section SHALL be titled "Программа соревнований" (Competition program). If the tournament has no schedule items, one empty row SHALL be displayed.

#### Scenario: Loading a tournament with existing events and rounds

- **WHEN** a tournament with both events and rounds is loaded into the edit form
- **THEN** the schedule section displays all events and rounds as a single list sorted by `scheduledAt`

#### Scenario: Loading a tournament with no schedule

- **WHEN** a tournament with no events and no rounds is loaded
- **THEN** the schedule section displays one empty row ready for input

### Requirement: Schedule section has a locale switcher

The schedule section SHALL include a `LocaleTabs` switcher that controls which locale's event title is displayed in the event combobox. Switching locales SHALL update the displayed title for all event rows without affecting the data of other locales.

#### Scenario: Switching from Russian to English locale

- **WHEN** the user clicks the "EN" tab in the schedule section
- **THEN** all event combobox inputs display their `locales.en.title` values
- **AND** the `locales.ru.title` values remain unchanged

### Requirement: Schedule row has datetime and event combobox

Each schedule row SHALL contain a `datetime-local` input. For event-type rows, a custom combobox SHALL be displayed for event selection. The combobox SHALL consist of a text input and a dropdown panel. The text input SHALL display the current event title (for the active locale). For round-type rows, instead of the combobox, a non-editable badge SHALL be displayed with the text "N-й тур" / "Round N" (where N is the chronological round number). The badge SHALL use the `badge-info` DaisyUI class. Round rows SHALL NOT be editable — they can only be deleted.

#### Scenario: Editing a datetime field

- **WHEN** the user changes the datetime value in a row
- **THEN** the `scheduledAt` of that row is updated

#### Scenario: Typing free text in the combobox

- **WHEN** the user types text into the event combobox input
- **THEN** the row remains or becomes an event type
- **AND** the typed text is stored in `locales[activeLocale].title`
- **AND** the dropdown filters preset options to those containing the typed text (case-insensitive)

#### Scenario: Selecting a preset event

- **WHEN** the user selects a preset event option from the dropdown
- **THEN** the row becomes an event type
- **AND** the localized title is written to ALL supported locales simultaneously
- **AND** the input text is replaced with the preset's title for the active locale

#### Scenario: Selecting "Тур" from the dropdown

- **WHEN** the user selects the "Тур" option from the dropdown
- **THEN** the row becomes a round type
- **AND** all round rows in the schedule are renumbered sequentially (1, 2, 3…) based on their current chronological position
- **AND** any event locale data is cleared
- **AND** the combobox is replaced with a non-editable `badge-info` badge showing "N-й тур" / "Round N"

#### Scenario: Round row displays as a badge

- **WHEN** a schedule row has `kind === 'round'`
- **THEN** the row displays a `badge badge-info` element with text "N-й тур" / "Round N" instead of the event combobox
- **AND** the badge number N reflects the chronological position of this round among all round rows

#### Scenario: Round row cannot be edited

- **WHEN** a schedule row has `kind === 'round'`
- **THEN** there is no text input for the event field
- **AND** the user can only delete the row using the remove button

#### Scenario: Text input always produces event rows

- **WHEN** the user types text into the combobox input on an event row
- **THEN** the row remains an event type regardless of the typed content
- **AND** the text is stored in `locales[activeLocale].title`

### Requirement: Schedule row add and remove buttons

Each schedule row SHALL have an add button (PlusIcon) and a remove button (XMarkIcon). Clicking the add button SHALL insert a new empty row directly below the current row. Clicking the remove button SHALL remove the current row from the feed.

#### Scenario: Adding a row below an existing row

- **WHEN** the user clicks the add button on row N
- **THEN** a new empty row is inserted at position N+1

#### Scenario: Removing a row

- **WHEN** the user clicks the remove button on a row
- **THEN** the row is removed from the feed
- **AND** if the removed row was a round, subsequent round numbers are NOT renumbered until the next sort

### Requirement: Schedule auto-sorts chronologically on datetime blur

When a `datetime-local` input in any schedule row loses focus (`onBlur`), the entire schedule feed SHALL be re-sorted chronologically by `scheduledAt`. After sorting, all round-type rows SHALL be renumbered sequentially (1, 2, 3…) based on their position in the sorted array.

#### Scenario: Changing a datetime causes reordering

- **WHEN** the user changes the datetime of row N to an earlier time and the input loses focus
- **THEN** the feed is re-sorted so that row N moves to its correct chronological position
- **AND** all round rows are renumbered based on their new chronological order

#### Scenario: Blurring without datetime change

- **WHEN** the user focuses and then blurs a datetime input without changing its value
- **THEN** no re-sorting or renumbering occurs

### Requirement: Empty schedule rows are not saved

On save, schedule rows where `scheduledAt` is missing AND (for events) the title is empty in all locales SHALL be filtered out and not persisted. Event rows with a missing title in some but not all locales SHALL be saved with the non-empty locales only.

#### Scenario: Saving with an empty row

- **WHEN** the user saves a tournament that has an empty row (no datetime, no title)
- **THEN** that row is not included in `schedule.events` or `schedule.rounds`

#### Scenario: Saving with a partially filled event row

- **WHEN** the user saves a tournament with an event row that has a datetime but no title in any locale
- **THEN** that row is not included in `schedule.events`

### Requirement: Preset event options are localized

The schedule combobox SHALL offer four preset event options with localized titles for all supported locales: "Регистрация участников" / "Participant registration", "Открытие турнира, жеребьёвка" / "Tournament opening, drawing", "Награждение, закрытие турнира" / "Award ceremony, closing", "Перерыв" / "Break". When a preset is selected, each locale SHALL receive its own correctly localized title (not the same string repeated for all locales).

#### Scenario: Viewing preset options in Russian locale

- **WHEN** the active locale is Russian and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Регистрация участников", "Открытие турнира, жеребьёвка", "Награждение, закрытие турнира", "Перерыв"

#### Scenario: Viewing preset options in English locale

- **WHEN** the active locale is English and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Participant registration", "Tournament opening, drawing", "Award ceremony, closing", "Break"

#### Scenario: Selecting a preset writes per-locale translations

- **WHEN** the user selects a preset event option while the active locale is Russian
- **THEN** the `ru` locale slot receives the Russian translation of the preset
- **AND** the `en` locale slot receives the English translation of the same preset

### Requirement: Dropdown round option uses static label and info styling

The first item in the schedule event combobox dropdown SHALL always display "Тур" / "Round" (without a round number). This item SHALL be visually distinguished from preset events using a `bg-info` background class.

#### Scenario: Viewing the round option in Russian

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is Russian
- **THEN** the first item displays "Тур" with a `bg-info` background

#### Scenario: Viewing the round option in English

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is English
- **THEN** the first item displays "Round" with a `bg-info` background

### Requirement: Tournament publish field validation

The `useTournamentForm` hook SHALL validate required fields before publishing. A publish SHALL be blocked when: no locale has a non-empty `title`, `location` has no coordinates (`location.latitude`/`location.longitude` not set), no locale has both arbiter `givenName` and `familyName` filled, or the schedule has zero rounds. The hook SHALL expose a `validationErrors` record mapping field keys (`title`, `location`, `arbiter.givenName`, `arbiter.familyName`, `rounds`) to localized messages. Before validating, when `location` has no coordinates, the hook SHALL attempt to resolve the location from the user's IP address (coordinates plus reverse geocoding); the `location` error SHALL only be set when that fallback fails. Save draft SHALL remain permissive and SHALL NOT be blocked by validation (the IP fallback SHALL still be attempted). Before publishing, the hook SHALL backfill empty `title` (tournament locales), `givenName`/`familyName` (arbiter locales), and `settlement` (location locales) from the first locale providing a non-empty value, so that `publishedTournamentSchema` validation passes for every present locale when at least one locale provides the required value.

#### Scenario: Publishing with empty title

- **WHEN** the user clicks Publish and all locale `title` fields are empty
- **THEN** `validationErrors` contains an entry for `title`
- **AND** the publish is blocked
- **AND** the title input is highlighted with an error style

#### Scenario: Publishing with unresolved location

- **WHEN** the user clicks Publish, `location` has no coordinates, and the IP-based fallback fails
- **THEN** `validationErrors` contains an entry for `location`
- **AND** the publish is blocked

#### Scenario: Publishing resolves location via IP fallback

- **WHEN** the user clicks Publish and `location` has no coordinates but the IP-based fallback resolves them
- **THEN** the resolved location is used for the publish
- **AND** no `location` validation error is set

#### Scenario: Publishing with empty arbiter names

- **WHEN** the user clicks Publish and no locale has both arbiter `givenName` and `familyName` filled
- **THEN** `validationErrors` contains entries for `arbiter.givenName` and `arbiter.familyName`
- **AND** the publish is blocked

#### Scenario: Publishing with no rounds

- **WHEN** the user clicks Publish and the schedule has zero rounds
- **THEN** `validationErrors` contains an entry for `rounds`
- **AND** the publish is blocked

#### Scenario: Publishing with all required fields filled

- **WHEN** the user clicks Publish and all required fields are valid
- **THEN** the form passes validation
- **AND** the tournament is published via `tournamentService.publish`
- **AND** the lastSavedSnapshot is updated on success

#### Scenario: Publishing with one locale filled succeeds via backfill

- **WHEN** the user fills `title` in the `ru` locale only and clicks Publish
- **THEN** the `en` locale's `title` is backfilled from the `ru` locale
- **AND** the publish succeeds (no Zod parse error)

#### Scenario: Validation errors clear on edit

- **WHEN** validation errors are displayed and the user modifies any form field
- **THEN** all `validationErrors` are cleared
- **AND** the field error styles and messages are removed

#### Scenario: Save draft is not blocked by validation

- **WHEN** the user clicks Save Draft with empty required fields
- **THEN** the save is NOT blocked by validation
- **AND** the tournament draft is saved via `tournamentService.update`

### Requirement: Tournament form error dismissal

The tournament edit form SHALL allow dismissing error alert blocks. Each error alert (save, publish, delete) SHALL include a close button. The `useTournamentForm` hook SHALL expose `clearSaveError`, `clearPublishError`, and `clearDeleteError` functions that reset the corresponding mutation state. The hook SHALL also reset the mutation before each new save, publish, or delete attempt.

#### Scenario: Dismissing a save error

- **WHEN** a save error alert is displayed and the user clicks the close button
- **THEN** the alert disappears
- **AND** `saveError` becomes `null`

#### Scenario: Dismissing a publish error

- **WHEN** a publish error alert is displayed and the user clicks the close button
- **THEN** the alert disappears
- **AND** `publishError` becomes `null`

#### Scenario: Dismissing a delete error

- **WHEN** a delete error alert is displayed and the user clicks the close button
- **THEN** the alert disappears
- **AND** `deleteError` becomes `null`

#### Scenario: Error cleared before retry

- **WHEN** a publish error is displayed and the user clicks Publish again
- **THEN** the previous error is cleared before the new publish attempt begins

### Requirement: Tournament form hooks use query callbacks instead of effects

The `useTournamentForm` hook SHALL load tournament data into form state and reset `createError` via query callbacks or derived-state patterns instead of `useEffect` blocks that call `setState` synchronously. This eliminates the `react-hooks/set-state-in-effect` ESLint errors. The behavior (form state initialization, dirty detection, lastSavedSnapshot, error reset on tournamentId change) SHALL remain identical.

#### Scenario: Loading tournament into form on query success

- **WHEN** the tournament query resolves with tournament data
- **THEN** `formState` is populated with `tournamentToFormState(tournament)`
- **AND** `lastSavedSnapshot` is set to the JSON string of the initial state
- **AND** no cascading render occurs (no synchronous setState in useEffect body)

#### Scenario: Reset createError on tournamentId change

- **WHEN** the `tournamentId` parameter changes
- **THEN** `createError` is reset to null
- **AND** no synchronous setState is called inside a useEffect body

### Requirement: Participants section in tournament edit form

The Participants tab of the tournament edit form SHALL render a `ParticipantsSection` with a header titled "Участники турнира" / "Tournament participants" and a locale switcher (`LocaleTabs`) controlling the locale of localized participant fields. The section SHALL list all tournament participants as editable cards. Each card SHALL expose the fields: familyName, givenName (active locale), ratingValue, rank, nationality, location, residence, and title. `startingPoints` SHALL be set to 0 and SHALL NOT be editable on this tab. On save, participant rows without a name in any locale SHALL be dropped, and the games of such dropped rows' ids SHALL be dropped with them per the participant-removal game cleanup rule of the `tournament-management` capability.

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

#### Scenario: Saving with a nameless row drops the row and its games

- **WHEN** the user saves a tournament where a participant card was left without familyName and givenName but the card's row id has auto-generated lone games in the draft
- **THEN** the row is not persisted as a participant
- **AND** the lone games of that row's id are not persisted in `games`

### Requirement: Participant card row management

Each participant card SHALL be rendered in a row with an add button (`BsPlus`, tooltip "Добавить участника" / "Add participant") and a remove button (`BsX`, tooltip "Удалить участника" / "Remove participant") on the right, mirroring the Schedule section pattern. The add button SHALL insert a new empty participant card directly below the current card. The remove button SHALL require a confirmation modal before removing the card. Removing a participant SHALL also remove that participant's games from the draft per the participant-removal game cleanup rule of the `tournament-management` capability.

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

#### Scenario: Removing a participant removes their games

- **WHEN** the user confirms removal of a participant who has lone forfeit games in past rounds and a pairing in the round being prepared
- **THEN** the participant's lone games and unpublished pairing are removed from the draft
- **AND** the participant's paired games in published rounds remain unchanged

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

### Requirement: Participant names are required and validated on publish

The participant `familyName` and `givenName` fields SHALL be marked as required (`*`) in the UI. The tournament publish validation SHALL block when any participant lacks at least one locale where both `familyName` (trimmed) and `givenName` (trimmed) are non-empty. The `validationErrors` record SHALL include a `participants` key when this check fails. Save draft SHALL remain permissive and SHALL NOT be blocked by participant validation. When saving a participant, a locale with any non-empty field SHALL be kept; empty `familyName`/`givenName` in a kept locale SHALL be backfilled from the first locale providing a non-empty value for that field.

#### Scenario: Marking required fields in the UI

- **WHEN** the participant card is displayed
- **THEN** the `familyName` label includes a `*` marker
- **AND** the `givenName` label includes a `*` marker

#### Scenario: Publishing with a participant missing both names

- **WHEN** the user clicks Publish and a participant has empty `familyName` and `givenName` in all locales
- **THEN** `validationErrors` contains an entry for `participants`
- **AND** the publish is blocked

#### Scenario: Publishing with a participant having names in one locale

- **WHEN** a participant has `familyName` and `givenName` filled in the `ru` locale but not in `en`
- **THEN** the participant passes validation
- **AND** the publish is NOT blocked by this participant

#### Scenario: Empty participants list passes validation

- **WHEN** the user clicks Publish and the tournament has zero participants
- **THEN** validation passes (no `participants` error)

#### Scenario: Participant locale with incomplete names is preserved

- **WHEN** a participant has `familyName` and `givenName` filled in the `ru` locale and only `location` in the `en` locale, and the tournament is saved
- **THEN** the saved participant has both locales
- **AND** the `en` locale's `familyName` and `givenName` are backfilled from the `ru` locale

#### Scenario: Save draft is not blocked by participant validation

- **WHEN** the user clicks Save Draft with participants missing names
- **THEN** the save is NOT blocked
- **AND** the tournament draft is saved

### Requirement: Player-linking UI is hidden for regular users

The player-linking controls (link button, unlink button, edit-player modal trigger, familyName autocomplete popover) SHALL be visible only to users with `role === 'admin'` or `role === 'manager'`. For users with `role === 'user'`, the entire player-link row SHALL be hidden, the familyName autocomplete popover SHALL not appear, and `participant.player` SHALL remain `null`.

#### Scenario: Admin sees player-linking controls

- **WHEN** a user with role `admin` views a participant card
- **THEN** the player-link controls are visible
- **AND** the familyName autocomplete popover can appear

#### Scenario: Regular user does not see player-linking controls

- **WHEN** a user with role `user` views a participant card
- **THEN** the player-link row is not rendered
- **AND** the familyName autocomplete popover does not appear
- **AND** `participant.player` remains `null`

#### Scenario: Regular user can still edit participant fields

- **WHEN** a user with role `user` views a participant card
- **THEN** the familyName, givenName, rating, rank, nationality, location, residence, and title fields remain editable

### Requirement: Participant sort toolbar

The Participants section SHALL display a sort toolbar with four icon buttons above the participant cards when there are two or more participants. The buttons SHALL be: sort by family name ascending (`BsSortAlphaDown`), sort by family name descending (`BsSortAlphaDownAlt`), sort by rating ascending (`BsSortNumericDown`), and sort by rating descending (`BsSortNumericDownAlt`). Sorting SHALL reorder the `participants` array in form state so that the new order persists on save.

#### Scenario: Sort toolbar appears with 2+ participants

- **WHEN** the Participants section has 2 or more participants
- **THEN** the sort toolbar with 4 buttons is displayed above the cards

#### Scenario: Sort toolbar hidden with 0 or 1 participants

- **WHEN** the Participants section has 0 or 1 participants
- **THEN** the sort toolbar is not displayed

#### Scenario: Sort by family name ascending

- **WHEN** the user clicks the `BsSortAlphaDown` button
- **THEN** participants are sorted by `familyName` in the active locale, ascending (A→Z)
- **AND** the new order is reflected in the `participants` array in form state

#### Scenario: Sort by family name descending

- **WHEN** the user clicks the `BsSortAlphaDownAlt` button
- **THEN** participants are sorted by `familyName` in the active locale, descending (Z→A)
- **AND** the new order is reflected in the `participants` array in form state

#### Scenario: Sort by rating ascending

- **WHEN** the user clicks the `BsSortNumericDown` button
- **THEN** participants are sorted by `capturedRating.value` ascending
- **AND** participants with no rating are placed last

#### Scenario: Sort by rating descending

- **WHEN** the user clicks the `BsSortNumericDownAlt` button
- **THEN** participants are sorted by `capturedRating.value` descending
- **AND** participants with no rating are placed last

#### Scenario: Sort tooltips

- **WHEN** the user hovers over the family-name sort buttons
- **THEN** the tooltip reads «Сортировать по фамилии» / «Sort by family name»
- **WHEN** the user hovers over the rating sort buttons
- **THEN** the tooltip reads «Сортировать по рейтингу» / «Sort by rating»

#### Scenario: Sorted order persists on save

- **WHEN** the user sorts participants and then saves the tournament
- **THEN** the saved tournament's `participants` array reflects the sorted order