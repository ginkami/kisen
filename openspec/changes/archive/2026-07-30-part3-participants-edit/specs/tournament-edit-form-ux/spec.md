## ADDED Requirements

### Requirement: Participant sort toolbar

The Participants section SHALL display a sort toolbar with four icon buttons above the participant cards when there are two or more participants. The buttons SHALL be: sort by family name ascending (`BsSortAlphaDown`), sort by family name descending (`BsSortAlphaDownAlt`), sort by rating ascending (`BsSortNumericDown`), and sort by rating descending (`BsSortNumericDownAlt`). Sorting SHALL reorder the `participants` array in form state so that the new order persists on save.

#### Scenario: Sort toolbar appears with 2+ participants

- **WHEN** the Participants section has 2 or more participants
- **THEN** the sort toolbar with 4 buttons is displayed above the cards

#### Scenario: Sort toolbar hidden with 0 or 1 participants

- **WHEN** the Participants section has 0 or 1 participants
- **THEN** the sort toolbar is not displayed

#### Scenario: Sort by family name ascending

- **WHEN** the user clicks the `BsSortAlphaDown` button
- **THEN** participants are sorted by `familyName` in the active locale, ascending (A→Z)
- **AND** the new order is reflected in the `participants` array in form state

#### Scenario: Sort by family name descending

- **WHEN** the user clicks the `BsSortAlphaDownAlt` button
- **THEN** participants are sorted by `familyName` in the active locale, descending (Z→A)
- **AND** the new order is reflected in the `participants` array in form state

#### Scenario: Sort by rating ascending

- **WHEN** the user clicks the `BsSortNumericDown` button
- **THEN** participants are sorted by `capturedRating.value` ascending
- **AND** participants with no rating are placed last

#### Scenario: Sort by rating descending

- **WHEN** the user clicks the `BsSortNumericDownAlt` button
- **THEN** participants are sorted by `capturedRating.value` descending
- **AND** participants with no rating are placed last

#### Scenario: Sort tooltips

- **WHEN** the user hovers over the family-name sort buttons
- **THEN** the tooltip reads «Сортировать по фамилии» / «Sort by family name»
- **WHEN** the user hovers over the rating sort buttons
- **THEN** the tooltip reads «Сортировать по рейтингу» / «Sort by rating»

#### Scenario: Sorted order persists on save

- **WHEN** the user sorts participants and then saves the tournament
- **THEN** the saved tournament's `participants` array reflects the sorted order