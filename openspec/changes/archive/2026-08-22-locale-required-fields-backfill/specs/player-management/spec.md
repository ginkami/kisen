## MODIFIED Requirements

### Requirement: Player form field validation

The `usePlayerForm` hook SHALL validate the form state before saving. A save SHALL be blocked when: no locale has both `familyName` and `givenName` filled, or `nationality` (country) is empty. The hook SHALL expose a `validationErrors` record mapping field keys (`familyName`, `givenName`, `nationality`) to localized messages. When saving, a locale with any non-empty field SHALL be kept (not only locales with both names); any empty required `familyName` or `givenName` in a kept locale SHALL be backfilled from the first locale whose corresponding field is non-empty, so optional fields (location, club, title) entered for a locale without complete names are not lost.

#### Scenario: Missing all locale names

- **WHEN** the user clicks Save with all locale `familyName` and `givenName` fields empty
- **THEN** `validationErrors` contains entries for `familyName` and `givenName`
- **AND** the save is blocked

#### Scenario: Locale with location but incomplete names is preserved

- **WHEN** the user fills `familyName` and `givenName` in the `ru` locale and `location` in the `en` locale, leaving `en.familyName` and `en.givenName` empty, and saves
- **THEN** the saved player has both locales
- **AND** the `en` locale's `familyName` is backfilled from the `ru` locale's `familyName`
- **AND** the `en` locale's `givenName` is backfilled from the `ru` locale's `givenName`
- **AND** the `en` locale's `location` is preserved