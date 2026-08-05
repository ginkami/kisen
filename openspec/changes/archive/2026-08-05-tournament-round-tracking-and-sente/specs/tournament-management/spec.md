## ADDED Requirements

### Requirement: Tournament currentRound field

The tournament entity SHALL include a `currentRound` integer field representing the currently active round number. The domain schema (`tournamentSchema` in `src/domain/tournament.ts`) SHALL define it with a default of `0` so that existing Firestore documents without the field parse successfully. The `TournamentService.create` and `TournamentService.createDraft` methods SHALL initialize `currentRound` to `0` on newly created tournaments. The field SHALL round-trip through the Firestore repository mappers without mapper changes (serialized as part of the tournament object).

#### Scenario: New tournament is created with default currentRound

- **WHEN** a tournament is created via `TournamentService.create` or `TournamentService.createDraft`
- **THEN** the resulting tournament document has `currentRound` equal to `0`

#### Scenario: Existing document without currentRound parses successfully

- **WHEN** a Firestore tournament document lacking the `currentRound` field is loaded
- **THEN** the parsed tournament has `currentRound` equal to `0` (Zod default)

#### Scenario: currentRound is persisted and reloaded

- **WHEN** a tournament with `currentRound` set to a non-zero value is saved and then reloaded
- **THEN** the reloaded tournament has the same `currentRound` value

### Requirement: Tournament settings.considerSente field

The `tournamentSettings` object SHALL include a `considerSente` boolean field indicating whether player piece color ("sente" / first move) is taken into account when recording game results. The domain schema (`tournamentSettingsSchema`) SHALL define it with a default of `false` for backward compatibility with existing documents. The `defaultSettings()` helper in `TournamentService` SHALL initialize `considerSente` to `false`. The field SHALL round-trip through the Firestore repository mappers without mapper changes.

#### Scenario: New tournament is created with considerSente false

- **WHEN** a tournament is created via `TournamentService.create` or `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.considerSente` is `false`

#### Scenario: Existing document without considerSente parses successfully

- **WHEN** a Firestore tournament document whose `settings` lacks `considerSente` is loaded
- **THEN** the parsed tournament's `settings.considerSente` is `false` (Zod default)

#### Scenario: considerSente is persisted and reloaded

- **WHEN** a tournament with `settings.considerSente` set to `true` is saved and then reloaded
- **THEN** the reloaded tournament's `settings.considerSente` is `true`

### Requirement: considerSente toggle in tournament edit form

The tournament edit form (`TournamentEditForm.tsx`) SHALL render a dedicated "Advanced" (`Дополнительно`) section on the Settings tab containing a toggle bound to `settings.considerSente`. The toggle SHALL be labeled "Учитывать цвет в результатах партий" (ru) / "Consider piece color in game results" (en). The `useTournamentForm` hook SHALL provide an `updateConsiderSente(value: boolean)` updater that updates `formState.settings.considerSente` and marks the form as having unsaved changes. Changes to the toggle SHALL be included in the unsaved-changes detection and SHALL be persisted on save via the existing `settings` round-trip.

#### Scenario: User toggles considerSente on

- **WHEN** the user opens the Settings tab and switches the "Consider piece color" toggle from off to on
- **THEN** `formState.settings.considerSente` becomes `true`
- **AND** the form is marked as having unsaved changes

#### Scenario: User saves the tournament with considerSente enabled

- **WHEN** the user enables the toggle and clicks "Save Draft"
- **THEN** the persisted tournament document has `settings.considerSente` equal to `true`
- **AND** after reload the toggle reflects the enabled state

#### Scenario: considerSente defaults to off for a new draft

- **WHEN** a new tournament draft is opened in the edit form
- **THEN** the "Consider piece color" toggle is in the off position