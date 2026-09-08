## Purpose

Publish-time validation feedback for the tournament edit form: the publish validator requires program round start times, the Publish button surfaces validation problems before the confirmation dialog by switching to the first failing tab, and the schedule section highlights untimed rounds with inline hints.

## Requirements

### Requirement: Publish validation includes round start times

The tournament publish validator SHALL report a `roundTime` error when the program contains at least one round row but not every round row has a `scheduledAt` value. It SHALL report a `rounds` error when the program contains no round rows at all. Both errors block publishing.

#### Scenario: Rounds without start times block publishing

- **WHEN** the program has round rows and at least one of them has no `scheduledAt`
- **THEN** the validator reports the `roundTime` error
- **AND** publishing does not proceed

#### Scenario: Program without rounds blocks publishing

- **WHEN** the program has no round rows
- **THEN** the validator reports the `rounds` error

#### Scenario: Complete program passes

- **WHEN** every round row has a `scheduledAt`
- **THEN** the validator reports no `rounds` or `roundTime` error

### Requirement: Publish button surfaces validation problems before confirmation

When the user clicks Publish and the publish validation fails, the confirmation dialog SHALL NOT open. Instead, the validation errors SHALL be set on the form and the form SHALL switch to the tab of the first failing area: general info for title, location, arbiter, or slug problems; the schedule tab for `rounds` or `roundTime` problems; the participants tab for participant name problems. When validation passes, the existing confirmation dialog SHALL open as before.

#### Scenario: Publish clicked with untimed rounds

- **WHEN** the user clicks Publish while a program round has no start time
- **THEN** the confirmation dialog does not open
- **AND** the form switches to the schedule tab

#### Scenario: Publish clicked with an untitled tournament

- **WHEN** the user clicks Publish while the title is missing
- **THEN** the confirmation dialog does not open
- **AND** the form switches to the general info tab

#### Scenario: Publish clicked with a valid tournament

- **WHEN** the user clicks Publish and all publish validations pass
- **THEN** the existing confirmation dialog opens

### Requirement: Schedule section highlights missing round times

When a `roundTime` or `rounds` validation error is present, the schedule section SHALL mark the time inputs of round rows without a `scheduledAt` value with the error style and SHALL show an inline hint above the rows: a `roundTimeRequired` hint when `roundTime` is set and a `roundRequired` hint when `rounds` is set. Both the highlighting and the hints SHALL disappear when the user edits the form.

#### Scenario: Untimed round inputs are highlighted with a hint

- **WHEN** the `roundTime` error is present and a round row has no start time
- **THEN** that row's time input is shown with the error style
- **AND** the schedule section shows the localized "set round start times" hint

#### Scenario: Missing rounds show the add-rounds hint

- **WHEN** the `rounds` error is present
- **THEN** the schedule section shows the localized "add at least one round" hint

#### Scenario: Hints disappear on edit

- **WHEN** the user edits any form field after the errors were shown
- **THEN** the validation errors, highlighting, and hints are cleared