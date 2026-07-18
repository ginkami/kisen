## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Online tournament flag
**Reason**: The online/offline distinction is no longer part of the MVP tournament model.
**Migration**: Remove all `isOnline` references from code, forms, and tests. Country selection is now always visible.

### Requirement: Multiple tournament arbiters
**Reason**: The MVP only needs a single chief arbiter name.
**Migration**: Replace `arbiters: Arbiter[]` with `arbiter: ChiefArbiter`. Remove the Arbiters tab from the tournament edit form.
