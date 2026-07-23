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
