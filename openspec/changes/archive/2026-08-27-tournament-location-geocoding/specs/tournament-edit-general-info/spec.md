## MODIFIED Requirements

### Requirement: General info layout
The "General info" tab SHALL be divided into an untitled locale-aware section followed by a "Binding" section. Labels SHALL appear above their fields. Standalone fields SHALL use a two-column layout on large screens and a single column on small screens. Required field labels SHALL display a red asterisk.

#### Scenario: Viewing the general info tab on desktop
- **WHEN** the user opens the "General info" tab on a wide viewport
- **THEN** the Location control with its confirm button spans the row width, with the venue field rendered alongside other standalone fields
- **AND** required labels include a red asterisk

#### Scenario: Viewing the general info tab on mobile
- **WHEN** the user opens the "General info" tab on a narrow viewport
- **THEN** every field spans the full width and stacks vertically

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

## ADDED Requirements

### Requirement: Location input with geocoding
The "General info" tab SHALL contain a single required «Локация» / "Location" control in place of the former Country and City fields. It SHALL consist of a text input (placeholder `53.903850, 27.587277`) with a `BsCheckLg` confirm button on its right. The pending text SHALL be committed when the user clicks the confirm button, presses Enter in the input, or the input loses focus. The venue field SHALL remain a locale-aware expandable field storing its value in `location.locales.<lang>.venue`.

When committed text parses as coordinates (`latitude, longitude`, decimal dot, optional sign and spaces, `latitude` in [-90, 90], `longitude` in [-180, 180]), the system SHALL reverse geocode them via the OpenStreetMap API and fill `location` with the coordinates, the resolved ISO country code, and settlement names for every supported locale (requested via `accept-language`). Otherwise the text SHALL be treated as a settlement name and searched via the OpenStreetMap API: when a match is found, its coordinates SHALL be reverse geocoded and `location` filled the same way; when no match is found, `location` SHALL remain unchanged and the info line SHALL show a localized "not found" message.

An info line below the input SHALL show, in order of precedence: a localized progress hint while resolving; the country flag, the country name in the current UI locale, and the settlement in the current UI locale when `location` is resolved; a localized "not found" message after a failed lookup; a localized hint inviting the user to enter coordinates or a settlement name when no location is set.

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

## REMOVED Requirements

### Requirement: Country and city defaults
**Reason**: The country and city fields are replaced by the single geocoded Location control; defaults are now coordinates-first (resolved from IP and reverse geocoded) and are covered by the "Location input with geocoding" requirement.
**Migration**: New drafts pre-fill the whole `location` object (coordinates, country, localized settlements) from IP geolocation. Behavior is specified in "Location input with geocoding".

### Requirement: Country dropdown with flags
**Reason**: The tournament form no longer has a separate country field; country is derived from the location coordinates via reverse geocoding. The shared `CountrySelect` component itself remains in use for associations, players, and tournament participants.
**Migration**: None for the tournament form. The country is displayed (flag + localized name) in the info line of the Location control.
