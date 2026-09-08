## MODIFIED Requirements

### Requirement: Player create/edit routes and placeholder page

The system SHALL provide routes `/players/new` (for creation) and `/players/:id/edit` (for editing) that render a `PlayerEditPage` component. The page SHALL display a full player edit form with all fields from the `Player` domain model. When the loaded player exists and the current user may not edit it according to the player editability rule (`player-edit-access` capability), the page SHALL render a localized access-denied state instead of the form.

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

#### Scenario: Editing a player the user may not edit

- **WHEN** the user navigates to `/players/:id/edit` and the loaded player is not editable by them (not an admin, not the creator, no managed affiliated association)
- **THEN** the page renders the localized access-denied message instead of the edit form
- **AND** no save or delete controls are rendered

#### Scenario: Form header updates reactively

- **WHEN** the user changes the familyName or givenName field
- **THEN** the h1 heading and document title update immediately to reflect the new name