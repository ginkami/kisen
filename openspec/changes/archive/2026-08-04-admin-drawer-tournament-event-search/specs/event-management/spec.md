## ADDED Requirements

### Requirement: Event title search in admin drawer

The `EventRepository` SHALL provide a `searchByTitle(prefix: string): Promise<Event[]>` method that performs server-side prefix matching on `locales.<locale>.title` across all supported locales. The `EventService` SHALL expose this method as a passthrough. The admin drawer's "Events" section SHALL provide a search input field above the month datepicker. When the search field contains 3 or more characters, the datepicker SHALL be disabled, and matching event cards (from the entire collection, not limited by month) SHALL be displayed. Search SHALL be debounced (300ms). The search SHALL cover all supported locales.

#### Scenario: User searches for an event by title

- **WHEN** the user types 3 or more characters in the event search field
- **THEN** the month datepicker becomes disabled
- **AND** the system performs a server-side search across all locales after a 300ms debounce
- **AND** matching event cards from any month are displayed

#### Scenario: User clears the event search field

- **WHEN** the event search field contains fewer than 3 characters
- **THEN** the month datepicker becomes active again
- **AND** the events for the selected month are displayed as before

#### Scenario: Search covers all locales

- **WHEN** an event has a title in `en` locale that matches the search prefix but the `ru` locale title does not
- **THEN** the event is included in the search results

#### Scenario: Search with no results

- **WHEN** the user types a prefix that matches no event title in any locale
- **THEN** a "no events found" message is displayed
- **AND** the datepicker remains disabled

#### Scenario: Repository searchByTitle implementation

- **WHEN** `searchByTitle` is called with a prefix
- **THEN** the repository issues Firestore range queries (`>=` prefix, `<=` prefix + `\uf8ff`) on `locales.<locale>.title` for each supported locale in parallel
- **AND** results are deduplicated by document id
- **AND** the result set is limited to 20 items