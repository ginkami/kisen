## ADDED Requirements

### Requirement: Player repository and service layer

The system SHALL provide a `PlayerRepository` interface and `FirestorePlayerRepository` implementation following the existing repository pattern. The repository SHALL use `firestoreHelpers.ts` for Timestamp conversion. A `PlayerService` class SHALL wrap the repository with business logic.

#### Scenario: Fetching a player by ID

- **WHEN** `playerService.getById(id)` is called
- **THEN** the system queries Firestore `players` collection by document ID
- **AND** returns a `Player` object with all `Date` fields converted from Timestamps
- **OR** returns `null` if no document exists

#### Scenario: Creating a new player

- **WHEN** `playerService.create(input)` is called
- **THEN** a new document is created in the `players` collection
- **AND** the returned `Player` object contains a generated UUIDv7 `id`

#### Scenario: Searching players by family name prefix

- **WHEN** `playerService.searchByFamilyName(prefix, locale)` is called with a prefix of at least 3 characters
- **THEN** the system queries Firestore using range query `where('locales.{locale}.familyName', '>=', prefix)` and `where('locales.{locale}.familyName', '<=', prefix + '\uf8ff')`
- **AND** returns up to 20 matching `Player` objects

### Requirement: Player search hook with debounce

A `usePlayerSearch` hook SHALL wrap the player search functionality with a 300ms debounce and React Query caching. The search SHALL only activate when the query is at least 3 characters long.

#### Scenario: User types a search query

- **WHEN** the user types 3 or more characters in the player search input
- **THEN** after a 300ms debounce, the system calls `playerService.searchByFamilyName` with the current locale
- **AND** the results are cached for 30 seconds

#### Scenario: User types fewer than 3 characters

- **WHEN** the user has typed fewer than 3 characters in the search input
- **THEN** no search query is executed
- **AND** the search results area is empty

### Requirement: Player create/edit routes and placeholder page

The system SHALL provide routes `/players/new` (for creation) and `/players/:id/edit` (for editing) that render a `PlayerEditPage` component. The page SHALL display a minimal placeholder form.

#### Scenario: Navigating to create a new player

- **WHEN** the user navigates to `/players/new`
- **THEN** the system renders the `PlayerEditPage` with `playerId` undefined
- **AND** the page displays a placeholder "New Player" form

#### Scenario: Navigating to edit an existing player

- **WHEN** the user navigates to `/players/:id/edit`
- **THEN** the system renders the `PlayerEditPage` with the player ID from the URL
- **AND** the page displays a placeholder edit form for that player