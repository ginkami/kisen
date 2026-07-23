## MODIFIED Requirements

### Requirement: Locale switcher uses localized labels

The locale switcher SHALL display the Russian locale button as `РУ` and the English locale button as `EN`. This SHALL apply to every locale switcher in the application, including the one in the site header and the one inside the tournament edit form.

#### Scenario: Header language switcher

- **WHEN** the header `LanguageSwitcher` is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

#### Scenario: Tournament form locale switcher

- **WHEN** the `LocaleTabs` switcher inside the tournament edit form is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

### Requirement: Optional fields collapse when empty

Optional form fields (description and venue) SHALL be hidden behind a `+ <Label>` button when their current value is empty. The field label SHALL also be hidden while the field is collapsed. Expanding the field SHALL reveal the label and input controls. The arbiter section is NOT optional and therefore SHALL NOT use this collapsing behavior.

#### Scenario: Empty optional field

- **WHEN** an optional field has no value
- **THEN** the form displays a button containing a plus icon and the field label

#### Scenario: Expanding an optional field

- **WHEN** the user clicks the `+ <Label>` button
- **THEN** the button is replaced by the field label and the corresponding input controls

#### Scenario: Non-empty optional field

- **WHEN** an optional field already contains a value
- **THEN** the label and input controls are visible immediately

### Requirement: New drafts prefill arbiter from the current user

When a new tournament draft is created, the system SHALL initialize the arbiter's given name and family name from the authenticated user's profile for every supported locale. If the user profile is not loaded, the system SHALL fall back to the information available in the Firebase Auth account.

#### Scenario: Creating a tournament as a logged-in user with a loaded profile

- **WHEN** a user creates a new tournament draft
- **THEN** the arbiter fields are initialized with the user's `givenName` and `familyName` from `user.locales.ru` and `user.locales.en`

#### Scenario: Existing arbiter data is preserved

- **WHEN** a tournament already has stored arbiter data
- **THEN** the existing values are loaded unchanged

## ADDED Requirements

### Requirement: Arbiter is a required tournament field

The tournament domain model SHALL require a chief arbiter. The `arbiter.locales.[lang].familyName` and `arbiter.locales.[lang].givenName` fields SHALL NOT be empty. The tournament edit form SHALL always render the arbiter given/family name inputs and SHALL mark them as required.

#### Scenario: Rendering the general-info form

- **WHEN** the general-info section of the tournament edit form is displayed
- **THEN** the arbiter given name and family name inputs are visible without a collapse/expand button

#### Scenario: Validating the arbiter fields

- **WHEN** the user clears an arbiter name field
- **THEN** the form reports a validation error for the empty arbiter name

#### Scenario: Publishing a tournament without an arbiter

- **WHEN** a tournament is published or updated
- **THEN** the operation fails validation if any arbiter locale name is missing

## REMOVED Requirements

- None.
