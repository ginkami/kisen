## Purpose

TBD

## Requirements

### Requirement: Tournament basic information
The tournament entity SHALL represent the organizing country as a required ISO 3166-1 alpha-2 code. The tournament entity SHALL NOT contain an online/offline flag. The tournament entity SHALL represent the chief arbiter as a single optional localized name object.

#### Scenario: Creating a draft tournament
- **WHEN** a user creates a new tournament draft
- **THEN** the system pre-fills `country` and `locales.*.location` from the user's IP address
- **AND** the draft document contains no `isOnline` field
- **AND** the draft document contains an optional `arbiter` field with localized `familyName` and `givenName`

#### Scenario: Publishing a tournament
- **WHEN** a user publishes a tournament
- **THEN** the system rejects the publish action unless `country` is a valid 2-letter code
- **AND** the system rejects the publish action unless every locale has a non-empty `location`

### Requirement: Tournament startYearMonth computation

The `startYearMonth` field of a tournament SHALL be computed as the minimum `scheduledAt` date across both `schedule.rounds` and `schedule.events` arrays. If both arrays are empty, it SHALL default to the current month.

#### Scenario: startYearMonth considers both rounds and events

- **WHEN** a tournament has events in `schedule.events` but no rounds in `schedule.rounds`
- **THEN** `startYearMonth` is derived from the earliest `scheduledAt` in `schedule.events`

#### Scenario: startYearMonth with empty schedule

- **WHEN** a tournament has no rounds and no events in its schedule
- **THEN** `startYearMonth` defaults to the current month

### Requirement: Removed features
The tournament entity SHALL NOT provide an online/offline flag. The tournament entity SHALL NOT support multiple arbiters.

#### Scenario: Online flag absent
- **WHEN** a tournament is created or updated
- **THEN** no `isOnline` field is stored or exposed
- **AND** country selection is always visible in the tournament edit form

#### Scenario: Single arbiter
- **WHEN** a tournament is created or updated
- **THEN** only a single optional `arbiter` with localized `familyName` and `givenName` is stored
- **AND** no "Arbiters" tab appears in the tournament edit form

### Requirement: Tournament title search in admin drawer

The `TournamentRepository` SHALL provide a `searchByTitle(prefix: string): Promise<Tournament[]>` method that performs server-side prefix matching on `locales.<locale>.title` across all supported locales. The `TournamentService` SHALL expose this method as a passthrough. The admin drawer's "Tournaments" section SHALL provide a search input field above the month datepicker. When the search field contains 3 or more characters, the datepicker SHALL be disabled, and matching tournament cards (from the entire collection, not limited by month) SHALL be displayed. Search SHALL be debounced (300ms). The search SHALL cover all supported locales.

#### Scenario: User searches for a tournament by title

- **WHEN** the user types 3 or more characters in the tournament search field
- **THEN** the month datepicker becomes disabled
- **AND** the system performs a server-side search across all locales after a 300ms debounce
- **AND** matching tournament cards from any month are displayed

#### Scenario: User clears the tournament search field

- **WHEN** the tournament search field contains fewer than 3 characters
- **THEN** the month datepicker becomes active again
- **AND** the tournaments for the selected month are displayed as before

#### Scenario: Search covers all locales

- **WHEN** a tournament has a title in `ru` locale that matches the search prefix but the `en` locale title does not
- **THEN** the tournament is included in the search results

#### Scenario: Search with no results

- **WHEN** the user types a prefix that matches no tournament title in any locale
- **THEN** a "no tournaments found" message is displayed
- **AND** the datepicker remains disabled

#### Scenario: Repository searchByTitle implementation

- **WHEN** `searchByTitle` is called with a prefix
- **THEN** the repository issues Firestore range queries (`>=` prefix, `<=` prefix + `\uf8ff`) on `locales.<locale>.title` for each supported locale in parallel
- **AND** results are deduplicated by document id
- **AND** the result set is limited to 20 items
