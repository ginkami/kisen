## ADDED Requirements

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