## ADDED Requirements

### Requirement: Tournament publish field validation

The `useTournamentForm` hook SHALL validate required fields before publishing. A publish SHALL be blocked when: no locale has a non-empty `title`, no locale has a non-empty `location`, `country` is empty, no locale has both arbiter `givenName` and `familyName` filled, or the schedule has zero rounds. The hook SHALL expose a `validationErrors` record mapping field keys (`title`, `location`, `country`, `arbiter.givenName`, `arbiter.familyName`, `rounds`) to localized messages. Save draft SHALL remain permissive and SHALL NOT be blocked by validation.

#### Scenario: Publishing with empty title

- **WHEN** the user clicks Publish and all locale `title` fields are empty
- **THEN** `validationErrors` contains an entry for `title`
- **AND** the publish is blocked
- **AND** the title input is highlighted with an error style

#### Scenario: Publishing with empty location

- **WHEN** the user clicks Publish and all locale `location` fields are empty
- **THEN** `validationErrors` contains an entry for `location`
- **AND** the publish is blocked

#### Scenario: Publishing with empty country

- **WHEN** the user clicks Publish and `country` is empty
- **THEN** `validationErrors` contains an entry for `country`
- **AND** the publish is blocked

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