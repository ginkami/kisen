## MODIFIED Requirements

### Requirement: Country dropdown with flags
The country field SHALL be a dropdown that lists ISO 3166-1 alpha-2 country codes with their names and flag icons. The field SHALL occupy half the section width on large screens. The dropdown list SHALL provide a text search input pinned at the top of the scrollable list; typing in it filters the list by localized country name OR ISO code (case-insensitive substring match). When the dropdown opens, the search query SHALL reset to empty and the search input SHALL be focused. The "not selected" placeholder item SHALL be shown only when the search query is empty. When the filter matches no country, an empty-state hint SHALL be shown.

#### Scenario: Opening the country dropdown
- **WHEN** the user opens the country dropdown
- **THEN** each option shows a flag emoji and the localized country name

#### Scenario: Filtering by localized name
- **WHEN** the user types "Япо" into the search input while the UI locale is `ru`
- **THEN** the list shows only Japan (and any other localized names containing the substring)

#### Scenario: Filtering by ISO code
- **WHEN** the user types "jp" into the search input
- **THEN** the list shows the country with code JP regardless of the UI locale

#### Scenario: No matching countries
- **WHEN** the user types a query that matches no country name or code
- **THEN** the list shows an empty-state hint instead of country items

#### Scenario: Query resets on reopen
- **WHEN** the user types a query, selects a country or closes the dropdown, and opens it again
- **THEN** the search query is empty, the full list is shown, and the search input is focused

#### Scenario: Selecting a country closes the dropdown
- **WHEN** the user clicks a country in the dropdown list
- **THEN** the dropdown closes immediately
- **AND** the selected country is shown in the trigger button