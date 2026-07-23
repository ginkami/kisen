## ADDED Requirements

### Requirement: Locale editing is isolated

The tournament edit form SHALL update only the active locale when the user types into a localized field. It SHALL NOT copy values from one locale to another.

#### Scenario: Typing in the Russian locale

- **WHEN** the user enters text into a localized field while the `ru` locale is active
- **THEN** only the `ru` locale value changes; the `en` locale value remains unchanged

#### Scenario: Typing in the English locale

- **WHEN** the user enters text into a localized field while the `en` locale is active
- **THEN** only the `en` locale value changes; the `ru` locale value remains unchanged

### Requirement: Optional fields collapse when empty

Optional form fields (description, venue, and arbiter) SHALL be hidden behind a `+ <Label>` button when their current value is empty. The field label SHALL also be hidden while the field is collapsed. Expanding the field SHALL reveal the label and input controls.

#### Scenario: Empty optional field

- **WHEN** an optional field has no value
- **THEN** the form displays a button containing a plus icon and the field label

#### Scenario: Expanding an optional field

- **WHEN** the user clicks the `+ <Label>` button
- **THEN** the button is replaced by the field label and the corresponding input controls

#### Scenario: Non-empty optional field

- **WHEN** an optional field already contains a value
- **THEN** the label and input controls are visible immediately

### Requirement: Locale switcher uses localized labels

The locale switcher SHALL display the Russian locale button as `РУ` and the English locale button as `EN`.

#### Scenario: Russian interface

- **WHEN** the locale switcher is rendered
- **THEN** the button for the `ru` locale reads `РУ`

#### Scenario: English interface

- **WHEN** the locale switcher is rendered
- **THEN** the button for the `en` locale reads `EN`

### Requirement: Country selector shows SVG flags

The country selector SHALL render each country option with an SVG flag from the `country-flag-icons` package inside a custom DaisyUI dropdown.

#### Scenario: Opening the country dropdown

- **WHEN** the user opens the country selector dropdown
- **THEN** each option displays the SVG flag for that country alongside the localized country name

#### Scenario: Selected country

- **WHEN** a country is selected
- **THEN** the closed selector displays the selected country's SVG flag and name

### Requirement: New drafts prefill arbiter from the current user

When a new tournament draft is created, the form SHALL prefill the arbiter's given name and family name from the authenticated user's profile for every supported locale.

#### Scenario: Creating a tournament as a logged-in user

- **WHEN** a user creates a new tournament draft
- **THEN** the arbiter fields are initialized with the user's `givenName` and `familyName` from `user.locales.ru` and `user.locales.en`

#### Scenario: Existing arbiter data is preserved

- **WHEN** a tournament already has stored arbiter data
- **THEN** the existing values are loaded unchanged
