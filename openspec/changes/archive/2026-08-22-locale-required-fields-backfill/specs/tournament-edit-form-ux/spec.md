## MODIFIED Requirements

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

### Requirement: Tournament publish field validation

The `useTournamentForm` hook SHALL validate required fields before publishing. A publish SHALL be blocked when: no locale has a non-empty `title`, no locale has a non-empty `location`, `country` is empty, no locale has both arbiter `givenName` and `familyName` filled, or the schedule has zero rounds. The hook SHALL expose a `validationErrors` record mapping field keys (`title`, `location`, `country`, `arbiter.givenName`, `arbiter.familyName`, `rounds`) to localized messages. Save draft SHALL remain permissive and SHALL NOT be blocked by validation. Before publishing, the hook SHALL backfill empty `title`/`location` (tournament locales) and `givenName`/`familyName` (arbiter locales) from the first locale providing a non-empty value, so that `publishedTournamentSchema` validation passes for every present locale when at least one locale provides the required value.

#### Scenario: Publishing with empty title

- **WHEN** the user clicks Publish and all locale `title` fields are empty
- **THEN** `validationErrors` contains an entry for `title`
- **AND** the publish is blocked
- **AND** the title input is highlighted with an error style

#### Scenario: Publishing with one locale filled succeeds via backfill

- **WHEN** the user fills `title` and `location` in the `ru` locale only and clicks Publish
- **THEN** the `en` locale's `title` and `location` are backfilled from the `ru` locale
- **AND** the publish succeeds (no Zod parse error)

### Requirement: Participant names are required and validated on publish

The participant `familyName` and `givenName` fields SHALL be marked as required (`*`) in the UI. The tournament publish validation SHALL block when any participant lacks at least one locale where both `familyName` (trimmed) and `givenName` (trimmed) are non-empty. The `validationErrors` record SHALL include a `participants` key when this check fails. Save draft SHALL remain permissive and SHALL NOT be blocked by participant validation. When saving a participant, a locale with any non-empty field SHALL be kept; empty `familyName`/`givenName` in a kept locale SHALL be backfilled from the first locale providing a non-empty value for that field.

#### Scenario: Participant locale with incomplete names is preserved

- **WHEN** a participant has `familyName` and `givenName` filled in the `ru` locale and only `location` in the `en` locale, and the tournament is saved
- **THEN** the saved participant has both locales
- **AND** the `en` locale's `familyName` and `givenName` are backfilled from the `ru` locale