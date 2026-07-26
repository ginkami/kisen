## ADDED Requirements

### Requirement: Players section in admin panel

The admin panel accordion SHALL include a "Players" section between the "Tournaments" and "Events" sections. This section SHALL display a search input with a magnifying glass icon and a "+ Player" button. Search results SHALL appear as cards below the input, limited to 20 results with a scrollbar if needed.

#### Scenario: Admin opens the Players section

- **WHEN** an admin or manager user opens the admin panel and clicks the "Players" accordion header
- **THEN** the section expands showing a search input with MagnifyingGlassIcon and a "+ Player" button

#### Scenario: Regular user views the Players section

- **WHEN** a user with role `user` views the admin panel
- **THEN** the "Players" section is visually disabled (opacity-50, pointer-events-none)
- **AND** the section cannot be opened

### Requirement: Player search in admin panel

The Players section SHALL include a search input that triggers a player search when at least 3 characters are typed. Search results SHALL display as cards showing player name, nationality flag, location (if available), and current rating/rank.

#### Scenario: Searching for a player

- **WHEN** the user types at least 3 characters in the search input
- **THEN** after 300ms debounce, the system searches players by familyName prefix in the active locale
- **AND** results are displayed as cards below the input

#### Scenario: Player card displays player information

- **WHEN** a player card is rendered in search results
- **THEN** it shows: familyName and givenName (active locale), nationality flag (via country-flag-icons), location (if exists), currentRating.value (if exists), currentRating.rank (if exists)

#### Scenario: Clicking a player card

- **WHEN** the user clicks a player card
- **THEN** the main view navigates to `/players/:id/edit`
- **AND** the card is visually highlighted (active state)

### Requirement: New Player button

The "+ Player" button SHALL navigate to `/players/new` when clicked. This button SHALL only be enabled for users with admin or manager role.

#### Scenario: Admin clicks "+ Player"

- **WHEN** an admin user clicks the "+ Player" button
- **THEN** the main view navigates to `/players/new`
- **AND** a new player edit form is displayed

### Requirement: Player routes

The application SHALL support routes `/players/new` and `/players/:id/edit` that render the `PlayerEditPage` component.

#### Scenario: Navigating to player creation

- **WHEN** the user navigates to `/players/new`
- **THEN** the PlayerEditPage renders with `playerId` undefined

#### Scenario: Navigating to player edit

- **WHEN** the user navigates to `/players/:id/edit`
- **THEN** the PlayerEditPage renders with the player ID from the URL