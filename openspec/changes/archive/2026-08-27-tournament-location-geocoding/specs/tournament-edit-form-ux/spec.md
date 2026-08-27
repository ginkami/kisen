## MODIFIED Requirements

### Requirement: Tournament publish field validation

The `useTournamentForm` hook SHALL validate required fields before publishing. A publish SHALL be blocked when: no locale has a non-empty `title`, `location` has no coordinates (`location.latitude`/`location.longitude` not set), no locale has both arbiter `givenName` and `familyName` filled, or the schedule has zero rounds. The hook SHALL expose a `validationErrors` record mapping field keys (`title`, `location`, `arbiter.givenName`, `arbiter.familyName`, `rounds`) to localized messages. Before validating, when `location` has no coordinates, the hook SHALL attempt to resolve the location from the user's IP address (coordinates plus reverse geocoding); the `location` error SHALL only be set when that fallback fails. Save draft SHALL remain permissive and SHALL NOT be blocked by validation (the IP fallback SHALL still be attempted). Before publishing, the hook SHALL backfill empty `title` (tournament locales), `givenName`/`familyName` (arbiter locales), and `settlement` (location locales) from the first locale providing a non-empty value, so that `publishedTournamentSchema` validation passes for every present locale when at least one locale provides the required value.

#### Scenario: Publishing with empty title

- **WHEN** the user clicks Publish and all locale `title` fields are empty
- **THEN** `validationErrors` contains an entry for `title`
- **AND** the publish is blocked
- **AND** the title input is highlighted with an error style

#### Scenario: Publishing with unresolved location

- **WHEN** the user clicks Publish, `location` has no coordinates, and the IP-based fallback fails
- **THEN** `validationErrors` contains an entry for `location`
- **AND** the publish is blocked

#### Scenario: Publishing resolves location via IP fallback

- **WHEN** the user clicks Publish and `location` has no coordinates but the IP-based fallback resolves them
- **THEN** the resolved location is used for the publish
- **AND** no `location` validation error is set

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

#### Scenario: Publishing with one locale filled succeeds via backfill

- **WHEN** the user fills `title` in the `ru` locale only and clicks Publish
- **THEN** the `en` locale's `title` is backfilled from the `ru` locale
- **AND** the publish succeeds (no Zod parse error)

#### Scenario: Validation errors clear on edit

- **WHEN** validation errors are displayed and the user modifies any form field
- **THEN** all `validationErrors` are cleared
- **AND** the field error styles and messages are removed

#### Scenario: Save draft is not blocked by validation

- **WHEN** the user clicks Save Draft with empty required fields
- **THEN** the save is NOT blocked by validation
- **AND** the tournament draft is saved via `tournamentService.update`
