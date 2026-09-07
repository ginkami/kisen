## Purpose

The General info section of the tournament edit form: its layout and locale switcher, optional field expansion, ru-to-en value mirroring, geocoded location input, chief arbiter field, slug binding, and parent-event and host-association pickers.

## Requirements

### Requirement: General info layout
The "General info" tab SHALL be divided into an untitled locale-aware section followed by a "Binding" section. Labels SHALL appear above their fields. Standalone fields SHALL use a two-column layout on large screens and a single column on small screens. Required field labels SHALL display a red asterisk.

#### Scenario: Viewing the general info tab on desktop
- **WHEN** the user opens the "General info" tab on a wide viewport
- **THEN** the Location control with its confirm button spans the row width, with the venue field rendered alongside other standalone fields
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

### Requirement: Location input with geocoding
The "General info" tab SHALL contain a single required «Локация» / "Location" control in place of the former Country and City fields. It SHALL consist of a text input (placeholder `53.903850, 27.587277`) with a `BsCheckLg` confirm button on its right. The pending text SHALL be committed when the user clicks the confirm button, presses Enter in the input, or the input loses focus. The venue field SHALL remain a locale-aware expandable field storing its value in `location.locales.<lang>.venue`.

When committed text parses as coordinates (`latitude, longitude`, decimal dot, optional sign and spaces, `latitude` in [-90, 90], `longitude` in [-180, 180]), the system SHALL reverse geocode them via the OpenStreetMap API and fill `location` with the coordinates, the resolved ISO country code, and settlement names for every supported locale (requested via `accept-language`). Otherwise the text SHALL be treated as a settlement name and searched via the OpenStreetMap API: when a match is found, its coordinates SHALL be reverse geocoded and `location` filled the same way; when no match is found, `location` SHALL remain unchanged and the info line SHALL show a localized "not found" message. An info line below the input SHALL show the country flag, the localized country name, and the settlement in the active locale when resolved; a resolving hint while a request is in flight; a "not found" message on failure; and a hint to enter coordinates or a settlement name when no location is set.

When the user saves or publishes with missing coordinates (empty or uncommitted input), the system SHALL first attempt to resolve the location from the user's IP address (coordinates plus reverse geocoding); if that fails, the `location` field SHALL be flagged as required. When a new draft is created, or a tournament whose `location` has no coordinates is loaded into the form, the system SHALL fill the coordinates from the user's IP geolocation and enrich them via reverse geocoding.

#### Scenario: Committing valid coordinates

- **WHEN** the user types `53.903850, 27.587277` into the location input and presses Enter
- **THEN** the system reverse geocodes the coordinates via the OpenStreetMap API
- **AND** `location` is filled with the coordinates, the country code, and settlement names in all supported locales

#### Scenario: Committing a settlement name

- **WHEN** the user types `Минск` into the location input and clicks the confirm button
- **THEN** the system searches the settlement via the OpenStreetMap API
- **AND** `location` is filled from the found coordinates via reverse geocoding

#### Scenario: Unknown settlement

- **WHEN** the user commits text that matches no settlement and parses as no coordinates
- **THEN** `location` remains unchanged
- **AND** the info line shows a localized "not found" message

#### Scenario: Commit triggers

- **WHEN** the user commits pending text via the confirm button, the Enter key, or input blur
- **THEN** the resolution flow runs identically for all three triggers

#### Scenario: Info line for a resolved location

- **WHEN** `location` is resolved with country `BY` and settlement «Минск» while the UI locale is `ru`
- **THEN** the info line shows the Belarus flag, «Беларусь», and «Минск»

#### Scenario: Info line while resolving

- **WHEN** a resolution request is in flight
- **THEN** the info line shows a localized progress hint and the input is disabled with a spinner on the confirm button

#### Scenario: IP fallback on publish

- **WHEN** the user clicks Publish and the location input has no committed coordinates
- **THEN** the system attempts to resolve the location from the user's IP address
- **AND** on success the publish proceeds with the resolved location
- **AND** on failure `validationErrors` contains an entry for `location` and the publish is blocked

#### Scenario: Loading a tournament without coordinates

- **WHEN** a tournament whose `location` has no coordinates (including a legacy-schema document) is loaded into the edit form
- **THEN** the system fills the coordinates from the user's IP geolocation enriched via reverse geocoding

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

The "General info" section SHALL highlight invalid required fields when `validationErrors` are present. The title, location, and arbiter given/family name inputs SHALL apply the `input-error` DaisyUI class and display a localized "Обязательное поле" / "Required field" message below the input when their corresponding validation error key is set.

#### Scenario: Title field highlighted on publish attempt

- **WHEN** the user clicks Publish and the `title` validation error is set
- **THEN** the title input in the active locale applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: Location field highlighted on publish attempt

- **WHEN** the user clicks Publish and the `location` validation error is set
- **THEN** the location text input applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: Arbiter name fields highlighted on publish attempt

- **WHEN** the user clicks Publish and the `arbiter.givenName` or `arbiter.familyName` validation error is set
- **THEN** the corresponding arbiter input in the active locale applies the `input-error` class
- **AND** a "Обязательное поле" / "Required field" message appears below the input

#### Scenario: No error styling when validation passes

- **WHEN** no `validationErrors` are present for a field
- **THEN** the field renders without `input-error` or `select-error` classes
- **AND** no error message is displayed
