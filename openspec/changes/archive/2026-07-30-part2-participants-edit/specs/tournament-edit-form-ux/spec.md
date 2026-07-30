## ADDED Requirements

### Requirement: Participant names are required and validated on publish

The participant `familyName` and `givenName` fields SHALL be marked as required (`*`) in the UI. The tournament publish validation SHALL block when any participant lacks at least one locale where both `familyName` (trimmed) and `givenName` (trimmed) are non-empty. The `validationErrors` record SHALL include a `participants` key when this check fails. Save draft SHALL remain permissive and SHALL NOT be blocked by participant validation.

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