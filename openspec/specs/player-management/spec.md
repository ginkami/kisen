## Purpose

Player entities and their management: creation/edit routes and the player edit form, form state management, information and rating sections, player cards and duplicate merging, CSV bulk import in the admin drawer, and locale-agnostic family-name search.

## Requirements

### Requirement: Player create/edit routes and placeholder page

The system SHALL provide routes `/players/new` (for creation) and `/players/:id/edit` (for editing) that render a `PlayerEditPage` component. The page SHALL display a full player edit form with all fields from the `Player` domain model.

#### Scenario: Creating a new player

- **WHEN** the user navigates to `/players/new`
- **THEN** the system renders the `PlayerEditPage` with `playerId` undefined
- **AND** the page displays an empty player edit form
- **AND** the h1 heading shows "Новый игрок" / "New player"
- **AND** the document title shows "Новый игрок — Редактирование | shogi·world"

#### Scenario: Editing an existing player

- **WHEN** the user navigates to `/players/:id/edit`
- **THEN** the system loads the player data and populates the form
- **AND** the h1 heading shows "{familyName}, {givenName}" from the active locale
- **AND** the document title shows "{familyName}, {givenName} — Редактирование | shogi·world"

#### Scenario: Form header updates reactively

- **WHEN** the user changes the familyName or givenName field
- **THEN** the h1 heading and document title update immediately to reflect the new name

### Requirement: Player form state management

A `usePlayerForm` hook SHALL manage the player edit form state following the same patterns as `useTournamentForm`: `useQuery` for loading, `useState` for form state, JSON-snapshot dirty tracking, `useMutation` for save/delete, and `setHasUnsavedChanges` via outlet context.

#### Scenario: Loading a player for editing

- **WHEN** the `usePlayerForm` hook is called with a valid player ID
- **THEN** it loads the player via `playerService.getById`
- **AND** converts domain fields to form state (rating value to string, birthDate to ISO string)
- **AND** sets `lastSavedSnapshot` for dirty detection

#### Scenario: Dirty detection

- **WHEN** the user modifies any form field
- **THEN** `isDirty` becomes `true`
- **AND** `setHasUnsavedChanges(true)` is called on the outlet context

#### Scenario: Saving a new player

- **WHEN** the user clicks Save on a new player form
- **THEN** the hook calls `playerService.create` with the form data
- **AND** navigates to `/players/:id/edit` on success

#### Scenario: Saving an existing player

- **WHEN** the user clicks Save on an existing player form
- **THEN** the hook calls `playerService.update` with the form data
- **AND** updates the lastSavedSnapshot on success

### Requirement: Player information section

A `PlayerInfoSection` component SHALL display all player fields in a card with locale switcher, following the same layout as the tournament edit form's general info section. The section SHALL be a separate component for reuse in modals.

#### Scenario: Rendering required fields

- **WHEN** the player info section is displayed
- **THEN** familyName and givenName inputs are always visible with `*` markers on labels
- **AND** country (CountrySelect) and location inputs are always visible with `*` markers

#### Scenario: Rendering optional fields with ExpandableField

- **WHEN** an optional field (residence, club, gender, birthDate) is empty
- **THEN** it is hidden behind a `+ Label` button using `ExpandableField`
- **WHEN** the user clicks the `+ Label` button
- **THEN** the field expands and shows the input control

#### Scenario: Grouped rating fields

- **WHEN** rating value, rank, and title are all empty
- **THEN** a single `+ Рейтинг` button is displayed
- **WHEN** the user clicks it
- **THEN** three fields expand in a grid: rating (number input), rank (select), title (text input)

### Requirement: Player association management

The player info section SHALL display associated organizations as badges. The first association badge maps to `primaryAssociation` (only if the current user is the player's creator). All subsequent associations map to `secondaryAssociations`. For users with role `user`, the association block is disabled (read-only).

#### Scenario: Adding an association as the player's creator

- **WHEN** the creator of a player with no associations clicks the association button and selects an organization
- **THEN** the organization is set as `primaryAssociation`
- **AND** a badge with the organization name is displayed

#### Scenario: Adding a secondary association

- **WHEN** a user adds an association to a player that already has a `primaryAssociation`
- **THEN** the new association is appended to `secondaryAssociations`
- **AND** an additional badge is displayed

#### Scenario: Removing an association badge

- **WHEN** the user clicks the × button on an association badge
- **THEN** if it is the primary association and the user is the creator, `primaryAssociation` is cleared
- **AND** if it is a secondary association, it is removed from `secondaryAssociations`

#### Scenario: Regular user cannot edit associations

- **WHEN** a user with role `user` views the player form
- **THEN** the association badges are displayed in read-only mode
- **AND** the add/remove buttons are not shown

### Requirement: Player save and delete operations

The player edit form SHALL provide Save and Delete buttons following the same layout as the tournament edit form. Save creates or updates the player. Delete removes the player with confirmation. Save SHALL validate required fields before calling the service and SHALL block the save when validation fails.

#### Scenario: Saving a player with valid data

- **WHEN** the user clicks the Save button and all required fields are filled
- **THEN** the form passes validation
- **AND** the player is saved via `playerService.create` or `playerService.update`
- **AND** the lastSavedSnapshot is updated on success

#### Scenario: Saving a player with empty required fields

- **WHEN** the user clicks the Save button and one or more required fields are empty
- **THEN** the form SHALL NOT call the player service
- **AND** the invalid fields SHALL be highlighted with an error style
- **AND** a localized "Обязательное поле" / "Required field" message SHALL appear under each invalid field

#### Scenario: Deleting a player

- **WHEN** the user clicks the Delete button
- **THEN** a confirmation modal is displayed
- **AND** on confirmation, the player is deleted and the user is redirected to `/`

#### Scenario: Delete button visibility

- **WHEN** the player is new (not yet saved)
- **THEN** the Delete button is not displayed

### Requirement: Player form i18n

All labels, placeholders, buttons, and messages in the player edit form SHALL be localized using i18n keys under the `player` namespace in both `ru` and `en` translation files.

#### Scenario: Russian locale

- **WHEN** the active locale is Russian
- **THEN** all form labels display in Russian (Фамилия, Имя, Страна, etc.)

#### Scenario: English locale

- **WHEN** the active locale is English
- **THEN** all form labels display in English (Family name, Given name, Country, etc.)

### Requirement: Player form field validation

The `usePlayerForm` hook SHALL validate the form state before saving. A save SHALL be blocked when: no locale has both `familyName` and `givenName` filled, or `nationality` (country) is empty. The hook SHALL expose a `validationErrors` record mapping field keys (`familyName`, `givenName`, `nationality`) to localized messages. When saving, a locale with any non-empty field SHALL be kept (not only locales with both names); any empty required `familyName` or `givenName` in a kept locale SHALL be backfilled from the first locale whose corresponding field is non-empty, so optional fields (location, club, title) entered for a locale without complete names are not lost.

#### Scenario: Missing all locale names

- **WHEN** the user clicks Save with all locale `familyName` and `givenName` fields empty
- **THEN** `validationErrors` contains entries for `familyName` and `givenName`
- **AND** the save is blocked

#### Scenario: Missing only one name in the active locale

- **WHEN** the user fills `familyName` but leaves `givenName` empty in the active locale and no other locale has both names filled
- **THEN** `validationErrors` contains an entry for `givenName`
- **AND** the save is blocked

#### Scenario: Missing nationality

- **WHEN** the user clicks Save without selecting a country
- **THEN** `validationErrors` contains an entry for `nationality`
- **AND** the save is blocked

#### Scenario: Validation errors clear on edit

- **WHEN** validation errors are displayed and the user modifies any form field
- **THEN** all `validationErrors` are cleared
- **AND** the field error styles and messages are removed

#### Scenario: Locale with location but incomplete names is preserved

- **WHEN** the user fills `familyName` and `givenName` in the `ru` locale and `location` in the `en` locale, leaving `en.familyName` and `en.givenName` empty, and saves
- **THEN** the saved player has both locales
- **AND** the `en` locale's `familyName` is backfilled from the `ru` locale's `familyName`
- **AND** the `en` locale's `givenName` is backfilled from the `ru` locale's `givenName`
- **AND** the `en` locale's `location` is preserved

### Requirement: Player form error dismissal

The player edit form SHALL allow dismissing error alert blocks. Each error alert SHALL include a close button. The `usePlayerForm` hook SHALL expose `clearSaveError` and `clearDeleteError` functions that reset the corresponding mutation state. The hook SHALL also reset the mutation before each new save or delete attempt.

#### Scenario: Dismissing a save error

- **WHEN** a save error alert is displayed and the user clicks the close button
- **THEN** the alert disappears
- **AND** `saveError` becomes `null`

#### Scenario: Dismissing a delete error

- **WHEN** a delete error alert is displayed and the user clicks the close button
- **THEN** the alert disappears
- **AND** `deleteError` becomes `null`

#### Scenario: Error cleared before retry

- **WHEN** a save error is displayed and the user clicks Save again
- **THEN** the previous error is cleared before the new save attempt begins

### Requirement: Player service schema validation

`PlayerService.create` and `PlayerService.update` SHALL validate the player object against `playerSchema` (Zod) before persisting to the repository. If validation fails, the service SHALL throw the Zod error and SHALL NOT write to the repository.

#### Scenario: Service rejects invalid player

- **WHEN** `PlayerService.create` is called with a player that has empty `locales`
- **THEN** `playerSchema.parse()` throws
- **AND** the repository `create` method is not called

#### Scenario: Service accepts valid player

- **WHEN** `PlayerService.create` is called with a player that satisfies `playerSchema`
- **THEN** the player is persisted via the repository

### Requirement: Player form locale filter completeness

The `usePlayerForm` hook SHALL only include a locale in the save payload when both `familyName` and `givenName` are non-empty (after trimming). A locale with only one name filled SHALL NOT be included, preventing a schema violation on the `locales` field.

#### Scenario: Locale with only family name

- **WHEN** the user fills `familyName` but leaves `givenName` empty in a locale
- **AND** another locale has both names filled
- **THEN** only the complete locale is included in the save payload
- **AND** the partial locale is omitted

#### Scenario: All locales empty

- **WHEN** all locales have empty names
- **THEN** the `locales` object in the payload is empty
- **AND** validation blocks the save before the service is called

### Requirement: Form hooks use query callbacks instead of effects

The `usePlayerForm` hook SHALL load player data into form state via the `useQuery` `onSuccess` callback (or equivalent derived-state pattern) instead of a `useEffect` that calls `setState` synchronously. This eliminates the `react-hooks/set-state-in-effect` ESLint error. The behavior (form state initialization, dirty detection, lastSavedSnapshot) SHALL remain identical.

#### Scenario: Loading player into form on query success

- **WHEN** the `usePlayer` query resolves with player data
- **THEN** `formState` is populated with `playerToFormState(player)`
- **AND** `lastSavedSnapshot` is set to the JSON string of the initial state
- **AND** no cascading render occurs (no synchronous setState in useEffect body)

### Requirement: Player CSV bulk import

`PlayerService` SHALL provide an `importFromCsv(file: File, createdBy: string)` method that parses a `;`-delimited CSV file, validates each row, deduplicates against existing players, and creates or updates players. The method SHALL return an `ImportResult` object with `added`, `updated`, `invalid` counts and an `errors` array describing why each invalid row was rejected.

#### Scenario: Importing valid CSV with new players

- **WHEN** `importFromCsv` is called with a valid CSV file containing 3 new players
- **THEN** all 3 players are created via `repository.create`
- **AND** `ImportResult.added` is 3, `updated` is 0, `invalid` is 0

#### Scenario: Importing CSV with existing players

- **WHEN** a CSV row has familyName + givenName that exactly match an existing player in any locale
- **THEN** the existing player is updated via `repository.update`
- **AND** `ImportResult.updated` increments

#### Scenario: Importing CSV with invalid rows

- **WHEN** a CSV row has no locale with both familyName and givenName filled
- **THEN** the row is counted as invalid
- **AND** the reason is recorded in `ImportResult.errors`

#### Scenario: Importing CSV with invalid nationality

- **WHEN** a CSV row has a nationality field that is not exactly 2 characters
- **THEN** the row is counted as invalid

#### Scenario: Importing CSV with invalid rank format

- **WHEN** a CSV row has a rank field that does not match `N Dan` (N=1-9) or `N Kyu` (N=1-20)
- **THEN** the row is counted as invalid

#### Scenario: Rank conversion

- **WHEN** a CSV row has rank `"5 Dan"`
- **THEN** the player's `currentRating.rank` is set to `"5d"`
- **WHEN** a CSV row has rank `"3 Kyu"`
- **THEN** the player's `currentRating.rank` is set to `"3k"`

#### Scenario: Deduplication logic

- **WHEN** processing a CSV row
- **THEN** the system loads all existing players via `listAll`
- **AND** builds an index by (familyName, givenName) per locale
- **AND** if any locale of the CSV row matches an existing player, that player is updated
- **AND** if no match is found, a new player is created

### Requirement: Player repository listAll method

`PlayerRepository` SHALL expose a `listAll(): Promise<Player[]>` method that returns all players. The Firestore implementation SHALL query the entire `players` collection.

#### Scenario: Fetching all players for deduplication

- **WHEN** `listAll` is called
- **THEN** all player documents are returned from Firestore

### Requirement: Bulk import button in admin panel

The AdminDrawer Players section SHALL display a bulk-import button (visible only to users with role `admin`) containing the icons `BsPeople`, `BsFiletypeCsv`, `BsPlus`. The button SHALL support both file-picker selection and drag-and-drop of `.csv` files. During processing, the button content SHALL be replaced with a loading spinner. Results SHALL be shown in a `BulkImportResultModal`.

#### Scenario: Admin views bulk import button

- **WHEN** a user with role `admin` opens the Players section
- **THEN** a bulk import button with three icons is visible

#### Scenario: Non-admin cannot see bulk import button

- **WHEN** a user with role `manager` or `user` opens the Players section
- **THEN** the bulk import button is not displayed

#### Scenario: Selecting a CSV file

- **WHEN** the admin clicks the bulk import button and selects a `.csv` file
- **THEN** the file is processed via `importFromCsv`
- **AND** the button shows a loading spinner during processing

#### Scenario: Dragging a CSV file onto the button

- **WHEN** the admin drags a `.csv` file onto the bulk import button and releases
- **THEN** the file is processed via `importFromCsv`

#### Scenario: Showing import results

- **WHEN** the import completes
- **THEN** a `BulkImportResultModal` is displayed
- **AND** it shows counts of added, updated, and invalid rows
- **AND** it lists reasons for each invalid row

#### Scenario: Import error handling

- **WHEN** the import fails due to an unreadable file, network error, or Firestore error
- **THEN** the modal displays an error message describing the failure

### Requirement: Player family-name search across all locales

The player family-name search SHALL match the given prefix against `locales.<locale>.familyName` for every supported locale, regardless of the currently active UI locale. The `searchByFamilyName` repository/service method SHALL accept only a `prefix` parameter (no `locale` parameter) and SHALL return the union of matches from all supported locales. Duplicate players (matched in more than one locale) SHALL appear only once in the result. The displayed name for each result SHALL use the active UI locale when available; otherwise the system SHALL fall back to any non-empty locale.

#### Scenario: Match found only in a non-active locale

- **WHEN** the active UI locale is `ru`
- **AND** a player has `locales.en.familyName` starting with the prefix but no `locales.ru` entry
- **THEN** the search result SHALL include that player
- **AND** the displayed name SHALL fall back to the English locale data

#### Scenario: Match found in multiple locales for the same player

- **WHEN** a player's `locales.ru.familyName` and `locales.en.familyName` both start with the prefix
- **THEN** the player SHALL appear exactly once in the merged result set

#### Scenario: Display uses active locale when available

- **WHEN** the active UI locale is `ru`
- **AND** a matched player has a non-empty `locales.ru` entry
- **THEN** the displayed family/given name SHALL come from the `ru` locale

#### Scenario: Search API is locale-agnostic

- **WHEN** `searchByFamilyName(prefix)` is called
- **THEN** the repository/service method SHALL NOT accept a `locale` argument
- **AND** the hook `usePlayerSearch(query)` SHALL NOT pass a locale to the service layer

#### Scenario: Result size remains bounded

- **WHEN** the merged result set exceeds the configured maximum (20 players)
- **THEN** the returned array SHALL be truncated to that maximum
