## MODIFIED Requirements

### Requirement: Tournament basic information
The tournament entity SHALL represent its location as a single `location` object containing decimal `latitude` and `longitude` coordinates, an optional ISO 3166-1 alpha-2 `country` code, and a `locales` map (at least one locale) with optional `settlement` and `venue` strings. The schema SHALL NOT contain a top-level `country` field, `locales.<lang>.location`, or `locales.<lang>.venue`. The tournament entity SHALL NOT contain an online/offline flag. The tournament entity SHALL represent the chief arbiter as a single optional localized name object. The tournament entity SHALL hold a `regulations` array of regulation id references (UUIDv7, default empty): old tournament documents without the field parse with an empty array; updates persist the array through `UpdateTournamentInput.regulations`; the edit form round-trips it with dirty tracking. Old tournament documents stored with the legacy location fields SHALL be remapped on read into the `location` object (without coordinates); the next save persists the new shape and drops the legacy fields.

#### Scenario: Creating a draft tournament
- **WHEN** a user creates a new tournament draft
- **THEN** the system pre-fills `location` from the user's IP address: the resolved coordinates are enriched with the `country` code and localized `settlement` names via reverse geocoding
- **AND** the draft document contains no `isOnline` field
- **AND** the draft document contains an optional `arbiter` field with localized `familyName` and `givenName`
- **AND** the draft document contains `regulations: []`

#### Scenario: Publishing a tournament
- **WHEN** a user publishes a tournament
- **THEN** the system rejects the publish action unless `location` is present with a numeric `latitude` in [-90, 90] and `longitude` in [-180, 180]

#### Scenario: Existing tournament without the regulations field

- **WHEN** a tournament document created before this change (no `regulations` field) is loaded
- **THEN** it parses with `regulations` equal to an empty array

#### Scenario: Legacy tournament document with old location fields

- **WHEN** a tournament document with a top-level `country` and `locales.<lang>.location` / `locales.<lang>.venue` (no `location` object) is loaded
- **THEN** it parses with `location.country`, `location.locales.<lang>.settlement`, and `location.locales.<lang>.venue` remapped from those legacy fields and no coordinates
- **AND** saving the tournament persists the new `location` shape without the legacy fields

### Requirement: Removed features
The tournament entity SHALL NOT provide an online/offline flag. The tournament entity SHALL NOT support multiple arbiters. The tournament entity SHALL NOT provide a separate country field or a locale-dependent free-text city field.

#### Scenario: Online flag absent
- **WHEN** a tournament is created or updated
- **THEN** no `isOnline` field is stored or exposed
- **AND** the location input is always visible in the tournament edit form

#### Scenario: Single arbiter
- **WHEN** a tournament is created or updated
- **THEN** only a single optional `arbiter` with localized `familyName` and `givenName` is stored
- **AND** no "Arbiters" tab appears in the tournament edit form
