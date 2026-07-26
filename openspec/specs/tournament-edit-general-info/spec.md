## Purpose

TBD

## Requirements

### Requirement: General info layout
The "General info" tab SHALL be divided into an untitled locale-aware section followed by a "Binding" section. Labels SHALL appear above their fields. Standalone fields SHALL use a two-column layout on large screens and a single column on small screens. Required field labels SHALL display a red asterisk.

#### Scenario: Viewing the general info tab on desktop
- **WHEN** the user opens the "General info" tab on a wide viewport
- **THEN** fields such as Country and City appear side by side
- **AND** required labels include a red asterisk

#### Scenario: Viewing the general info tab on mobile
- **WHEN** the user opens the "General info" tab on a narrow viewport
- **THEN** every field spans the full width and stacks vertically

### Requirement: Locale switcher
Locale-dependent fields in the "General info" tab SHALL be edited through a language tab switcher (ru / en). The switcher SHALL control `name`, `description`, `venue`, and the chief arbiter's `givenName` and `familyName`.

#### Scenario: Switching locale
- **WHEN** the user clicks the "en" language tab
- **THEN** the same form fields show the English values for the current tournament

### Requirement: Optional field expansion
Optional empty fields `description` and `venue` SHALL be hidden behind a text button labelled "+ <field label>". Clicking the button SHALL reveal the corresponding input. The button SHALL NOT appear once the field has a non-empty value.

#### Scenario: Adding a description
- **WHEN** the tournament has no description
- **THEN** the form shows a "+ Description" button
- **AND** clicking it reveals the description textarea

### Requirement: Ru-to-en value mirroring
When the active locale is `ru`, the system SHALL copy the entered value to the `en` locale if the `en` value is empty. For `name`, `description`, and `venue` the value SHALL be copied as-is. For `arbiter.givenName` and `arbiter.familyName` the value SHALL be transliterated from Cyrillic to Latin.

#### Scenario: Typing a tournament name in Russian
- **WHEN** the user types "Кубок Весны" into the Russian name field
- **AND** the English name field is empty
- **THEN** the English name field becomes "Кубок Весны"

#### Scenario: Typing an arbiter name in Russian
- **WHEN** the user types "Иван" into the Russian given name field
- **AND** the English given name field is empty
- **THEN** the English given name field becomes "Ivan"

#### Scenario: English value already set
- **WHEN** the English name field already contains text
- **THEN** typing in the Russian name field does not overwrite it

### Requirement: Country and city defaults
When a new tournament draft is created, the system SHALL pre-fill `country` and `city` from the user's IP geolocation. If detection fails, `country` SHALL default to "BY" and `city` SHALL default to an empty string.

#### Scenario: Creating a draft with successful geolocation
- **WHEN** a user creates a new tournament draft and IP detection returns "JP" / "Tokyo"
- **THEN** the country dropdown shows Japan and the city input shows "Tokyo"

### Requirement: Country dropdown with flags
The country field SHALL be a dropdown that lists ISO 3166-1 alpha-2 country codes with their names and flag icons. The field SHALL occupy half the section width on large screens.

#### Scenario: Opening the country dropdown
- **WHEN** the user opens the country dropdown
- **THEN** each option shows a flag emoji and the localized country name

### Requirement: Chief arbiter in general info
The chief arbiter fields SHALL appear inside the "General info" tab, not on a separate tab. They SHALL consist of two half-width text inputs with placeholders "Given Name" and "Family Name", localized per language tab.

#### Scenario: Filling the arbiter section
- **WHEN** the user is on the "General info" tab
- **THEN** two inputs for given name and family name are visible
- **AND** no separate "Arbiter" tab exists

### Requirement: Slug binding field
The "Binding" section SHALL contain a required URL-identifier (`slug`) field. The field SHALL normalize input to lowercase latin letters, digits, and hyphens.

#### Scenario: Entering a slug
- **WHEN** the user types "Cup of Spring 2025" into the slug field
- **THEN** the displayed value becomes "cup-of-spring-2025"

### Requirement: Parent event picker
The "Binding" section SHALL contain a `parentEvent` field. It SHALL display "Не указано" when no event is selected, or the selected event's localized title as a text button. A MagnifyingGlass icon button SHALL open a modal listing events of the current month sorted by `updatedAt`, with "Не указано" as the first option.

#### Scenario: Selecting a parent event
- **WHEN** the user clicks the MagnifyingGlass icon
- **THEN** a modal opens showing events for the current month
- **AND** selecting an event updates the field to show its title

#### Scenario: Clearing a parent event
- **WHEN** the user selects "Не указано" in the modal
- **THEN** the parentEvent field becomes null
- **AND** the display returns to "Не указано"

### Requirement: Host association picker
The "Binding" section SHALL contain a `hostAssociation` field, visible only to managers and admins. It SHALL display "Не указана" when no association is selected, or the selected association's localized title as a text button. A MagnifyingGlass icon button SHALL open a modal listing only associations where the current user is the creator or a manager.

#### Scenario: Manager views binding section
- **WHEN** a manager opens the "Binding" section
- **THEN** the host association field is visible

#### Scenario: Regular user views binding section
- **WHEN** a regular user opens the "Binding" section
- **THEN** the host association field is hidden

#### Scenario: Selecting a host association
- **WHEN** the user opens the association picker modal
- **THEN** only associations managed by the current user are listed
- **AND** selecting one updates the field to show its title

### Requirement: General info field error highlighting

The "General info" section SHALL highlight invalid required fields when `validationErrors` are present. The title, location, country, and arbiter given/family name inputs SHALL apply the `input-error` or `select-error` DaisyUI class and display a localized "Обязательное поле" / "Required field" message below the input when their corresponding validation error key is set.

#### Scenario: Title field highlighted on publish attempt

- **WHEN** the user clicks Publish and the `title` validation error is set
- **THEN** the title input in the active locale applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: Location field highlighted on publish attempt

- **WHEN** the user clicks Publish and the `location` validation error is set
- **THEN** the location input in the active locale applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: Country field highlighted on publish attempt

- **WHEN** the user clicks Publish and the `country` validation error is set
- **THEN** the country selector applies the `select-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the selector

#### Scenario: Arbiter name fields highlighted on publish attempt

- **WHEN** the user clicks Publish and the `arbiter.givenName` or `arbiter.familyName` validation error is set
- **THEN** the corresponding arbiter input in the active locale applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: No error styling when validation passes

- **WHEN** no `validationErrors` are present for a field
- **THEN** the field renders without `input-error` or `select-error` classes
- **AND** no error message is displayed
