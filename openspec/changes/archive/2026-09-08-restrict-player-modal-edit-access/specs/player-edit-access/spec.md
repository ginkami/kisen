## MODIFIED Requirements

### Requirement: Player edit page blocks unauthorized direct access

When `/players/:id/edit` loads an existing player that the current user may not edit according to the player editability rule, the page SHALL render a localized access-denied alert instead of the player edit form, and no form fields, save, or delete controls SHALL be rendered. While the user's managed-associations query is still loading, the page SHALL keep rendering the loading state so the access verdict cannot flash incorrectly. The creation route (`/players/new`) SHALL NOT be affected by the guard. The page guard SHALL be implemented via the shared `usePlayerEditAccess` hook.

#### Scenario: Manager opens an unauthorized player edit page by URL

- **WHEN** a manager navigates directly to `/players/:id/edit` of a player they may not edit
- **THEN** the page shows the localized "no access" message instead of the edit form

#### Scenario: Authorized user opens an editable player

- **WHEN** the current user may edit the loaded player
- **THEN** the page renders the full edit form as before

#### Scenario: Associations still loading

- **WHEN** the player has loaded but the user's managed-associations query is in flight
- **THEN** the page keeps showing the loading spinner and does not render the access-denied state

## ADDED Requirements

### Requirement: Player edit modal blocks unauthorized editing

The `PlayerEditModal` shown from a tournament participant row SHALL render its player edit form only when the current user may edit the loaded player according to the player editability rule. If the loaded player is not editable by the current user, the modal SHALL render a localized access-denied alert instead of the form and SHALL NOT offer any save control; Cancel and the header close button SHALL remain available so the dialog can always be dismissed. While the player or the user's managed-associations query is still loading, the modal SHALL keep rendering its loading state. Player linking in participant rows (search, autocomplete, link/unlink) SHALL NOT be filtered by editability.

#### Scenario: Manager opens the modal for an unaffiliated participant player

- **WHEN** a manager opens the participant-row edit modal for a player they may not edit
- **THEN** the modal shows the localized "no access" message instead of the edit form
- **AND** no save/confirm button is rendered
- **AND** Cancel and the close button still dismiss the dialog

#### Scenario: Manager opens the modal for a player they may edit

- **WHEN** the modal loads a player created by the current user or affiliated with a managed association
- **THEN** the modal renders the full edit form with the save control as before

#### Scenario: Admin opens the modal for any participant player

- **WHEN** an admin opens the participant-row edit modal for any linked player
- **THEN** the modal renders the full edit form with the save control

#### Scenario: Data still loading

- **WHEN** the player or the user's managed-associations query is in flight
- **THEN** the modal shows its loading spinner and does not render the access-denied state