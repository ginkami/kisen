## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Player form field validation

The `usePlayerForm` hook SHALL validate the form state before saving. A save SHALL be blocked when: no locale has both `familyName` and `givenName` filled, or `nationality` (country) is empty. The hook SHALL expose a `validationErrors` record mapping field keys (`familyName`, `givenName`, `nationality`) to localized messages.

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