## ADDED Requirements

### Requirement: Browser tab title follows the tournament edit page format
The system SHALL set the browser tab title to `{title} — {managementPanel} | shogi·world` when the user is on the tournament edit page, where `title` is the tournament title in the current UI locale and `managementPanel` is the localized management-panel label.

#### Scenario: Title updates while editing
- **WHEN** the user changes the tournament title in the active locale
- **THEN** the browser tab title updates to reflect the new title without a full page reload

#### Scenario: Title uses localized management panel label
- **WHEN** the tournament edit page renders
- **THEN** the browser tab title includes the translation of `tournament.edit.managementPanel` for the current locale
