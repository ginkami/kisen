## MODIFIED Requirements

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

## ADDED Requirements

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

The player edit form SHALL provide Save and Delete buttons following the same layout as the tournament edit form. Save creates or updates the player. Delete removes the player with confirmation.

#### Scenario: Saving a player

- **WHEN** the user clicks the Save button
- **THEN** the form validates required fields (familyName, givenName, nationality, location)
- **AND** on success, the player is saved and the lastSavedSnapshot is updated

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