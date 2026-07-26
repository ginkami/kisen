## ADDED Requirements

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