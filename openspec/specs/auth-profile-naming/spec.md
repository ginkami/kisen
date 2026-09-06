## Purpose

How profile locale data (givenName, familyName, displayName) is derived during email registration and provider (Google) sign-in profile creation.

## Requirements

### Requirement: Profile naming from auth flows

The system SHALL derive profile locale data from the real display name in both auth flows: email registration and provider sign-in profile creation. The display name SHALL be trimmed and split by whitespace into at most two tokens — the first token becomes `givenName`, the second becomes `familyName`; a single token fills only `givenName` and an empty name yields empty values. No 'Placeholder' names SHALL ever be stored. The real display name SHALL be stored as `displayName` in every locale (for provider sign-in — the Firebase display name).

#### Scenario: Registration with a two-word name

- **WHEN** a user registers with the display name «Иван Иванов»
- **THEN** the created profile stores givenName «Иван», familyName «Иванов» and displayName «Иван Иванов» in every locale

#### Scenario: Registration with a single-word name

- **WHEN** a user registers with the display name «Иван»
- **THEN** the created profile stores givenName «Иван», an empty familyName and displayName «Иван»

#### Scenario: Google sign-in creates the profile from the Firebase display name

- **WHEN** a first-time Google user with the Firebase display name «Иван Иванов» signs in
- **THEN** the created profile stores givenName «Иван», familyName «Иванов» and displayName «Иван Иванов» in every locale, with no 'Placeholder' values
