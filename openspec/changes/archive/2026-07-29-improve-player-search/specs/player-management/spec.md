## ADDED Requirements

### Requirement: Player family-name search across all locales

The player family-name search SHALL match the given prefix against `locales.<locale>.familyName` for every supported locale, regardless of the currently active UI locale. The `searchByFamilyName` repository/service method SHALL accept only a `prefix` parameter (no `locale` parameter) and SHALL return the union of matches from all supported locales. Duplicate players (matched in more than one locale) SHALL appear only once in the result. The displayed name for each result SHALL use the active UI locale when available; otherwise the system SHALL fall back to any non-empty locale.

#### Scenario: Match found only in a non-active locale

- **WHEN** the active UI locale is `ru`
- **AND** a player has `locales.en.familyName` starting with the prefix but no `locales.ru` entry
- **THEN** the search result SHALL include that player
- **AND** the displayed name SHALL fall back to the English locale data

#### Scenario: Match found in multiple locales for the same player

- **WHEN** a player's `locales.ru.familyName` and `locales.en.familyName` both start with the prefix
- **THEN** the player SHALL appear exactly once in the merged result set

#### Scenario: Display uses active locale when available

- **WHEN** the active UI locale is `ru`
- **AND** a matched player has a non-empty `locales.ru` entry
- **THEN** the displayed family/given name SHALL come from the `ru` locale

#### Scenario: Search API is locale-agnostic

- **WHEN** `searchByFamilyName(prefix)` is called
- **THEN** the repository/service method SHALL NOT accept a `locale` argument
- **AND** the hook `usePlayerSearch(query)` SHALL NOT pass a locale to the service layer

#### Scenario: Result size remains bounded

- **WHEN** the merged result set exceeds the configured maximum (20 players)
- **THEN** the returned array SHALL be truncated to that maximum