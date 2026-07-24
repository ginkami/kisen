## Purpose

TBD

## Requirements

### Requirement: Locale editing is isolated

The tournament edit form SHALL update only the active locale when the user types into a localized field. It SHALL NOT copy values from one locale to another.

#### Scenario: Typing in the Russian locale

- **WHEN** the user enters text into a localized field while the `ru` locale is active
- **THEN** only the `ru` locale value changes; the `en` locale value remains unchanged

#### Scenario: Typing in the English locale

- **WHEN** the user enters text into a localized field while the `en` locale is active
- **THEN** only the `en` locale value changes; the `ru` locale value remains unchanged

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

### Requirement: Locale switcher uses localized labels

The locale switcher SHALL display the Russian locale button as `РУ` and the English locale button as `EN`. This SHALL apply to every locale switcher in the application, including the one in the site header and the one inside the tournament edit form.

#### Scenario: Header language switcher

- **WHEN** the header `LanguageSwitcher` is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

#### Scenario: Tournament form locale switcher

- **WHEN** the `LocaleTabs` switcher inside the tournament edit form is rendered
- **THEN** the button for the `ru` locale reads `РУ` and the button for the `en` locale reads `EN`

### Requirement: Country selector shows SVG flags

The country selector SHALL render each country option with an SVG flag from the `country-flag-icons` package inside a custom DaisyUI dropdown.

#### Scenario: Opening the country dropdown

- **WHEN** the user opens the country selector dropdown
- **THEN** each option displays the SVG flag for that country alongside the localized country name

#### Scenario: Selected country

- **WHEN** a country is selected
- **THEN** the closed selector displays the selected country's SVG flag and name

### Requirement: New drafts prefill arbiter from the current user

When a new tournament draft is created, the system SHALL initialize the arbiter's given name and family name from the authenticated user's profile for every supported locale. If the user profile is not loaded, the system SHALL fall back to the information available in the Firebase Auth account.

#### Scenario: Creating a tournament as a logged-in user with a loaded profile

- **WHEN** a user creates a new tournament draft
- **THEN** the arbiter fields are initialized with the user's `givenName` and `familyName` from `user.locales.ru` and `user.locales.en`

#### Scenario: Existing arbiter data is preserved

- **WHEN** a tournament already has stored arbiter data
- **THEN** the existing values are loaded unchanged

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

### Requirement: Multiple Buchholz cut tie-breaks with configurable cut count

The tie-breaks section of the tournament edit form SHALL allow adding multiple `buchholz_cut` tie-break entries, each with its own `cutCount` value. When `buchholz_cut` is the selected tie-break type in the add control, a numeric input for `cutCount` SHALL be displayed. Other tie-break types SHALL remain unique — only one instance per type SHALL be allowed.

#### Scenario: Adding a Buchholz cut tie-break with a custom cut count

- **WHEN** the user selects `buchholz_cut` from the tie-break type dropdown and enters `2` in the `cutCount` input, then clicks "Add"
- **THEN** a new `buchholz_cut` tie-break with `cutCount: 2` is appended to the tie-breaks list

#### Scenario: Adding multiple Buchholz cut tie-breaks

- **WHEN** the user adds a `buchholz_cut` tie-break with `cutCount: 1` and then adds another `buchholz_cut` tie-break with `cutCount: 2`
- **THEN** both entries appear in the tie-breaks list, displayed as "Buchholz cut (1)" and "Buchholz cut (2)"

#### Scenario: Buchholz cut remains available after being added

- **WHEN** the user adds a `buchholz_cut` tie-break
- **THEN** `buchholz_cut` remains in the available types dropdown for further additions

#### Scenario: Non-cut tie-break types are unique

- **WHEN** the user adds a `buchholz` tie-break and it is already in the list
- **THEN** `buchholz` is removed from the available types dropdown and cannot be added again

#### Scenario: Cut count input is hidden for non-cut types

- **WHEN** the selected tie-break type is anything other than `buchholz_cut`
- **THEN** the `cutCount` numeric input is not displayed

### Requirement: New tournament drafts default to byoyomi time control

When `TournamentService.createDraft` creates a new tournament draft, the `settings.timeControl` SHALL be initialized to a `byoyomi` time control with `mainTime: 0`, `byoyomiTime: 0`, and `byoyomiPeriods: 1`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.timeControl.type` is `byoyomi`
- **AND** `byoyomiTime` is `0`
- **AND** `byoyomiPeriods` is `1`

### Requirement: New tournament drafts default to standard tie-break sequence

When `TournamentService.createDraft` creates a new tournament draft, the `settings.tieBreaks` SHALL be initialized to `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }]`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.tieBreaks` contains exactly three entries
- **AND** the first entry has `type: 'points'`
- **AND** the second entry has `type: 'buchholz'`
- **AND** the third entry has `type: 'sonneborn_berger'`