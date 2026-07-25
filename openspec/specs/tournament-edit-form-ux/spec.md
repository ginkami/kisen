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

### Requirement: Schedule section displays unified chronological program

The schedule section of the tournament edit form SHALL display a single chronological feed that merges `schedule.events` and `schedule.rounds` into one list of rows. Each row SHALL be either an event (with locale-dependent title) or a round (with a number). The section SHALL be titled "Программа соревнований" (Competition program). If the tournament has no schedule items, one empty row SHALL be displayed.

#### Scenario: Loading a tournament with existing events and rounds

- **WHEN** a tournament with both events and rounds is loaded into the edit form
- **THEN** the schedule section displays all events and rounds as a single list sorted by `scheduledAt`

#### Scenario: Loading a tournament with no schedule

- **WHEN** a tournament with no events and no rounds is loaded
- **THEN** the schedule section displays one empty row ready for input

### Requirement: Schedule section has a locale switcher

The schedule section SHALL include a `LocaleTabs` switcher that controls which locale's event title is displayed in the event combobox. Switching locales SHALL update the displayed title for all event rows without affecting the data of other locales.

#### Scenario: Switching from Russian to English locale

- **WHEN** the user clicks the "EN" tab in the schedule section
- **THEN** all event combobox inputs display their `locales.en.title` values
- **AND** the `locales.ru.title` values remain unchanged

### Requirement: Schedule row has datetime and event combobox

Each schedule row SHALL contain a `datetime-local` input. For event-type rows, a custom combobox SHALL be displayed for event selection. The combobox SHALL consist of a text input and a dropdown panel. The text input SHALL display the current event title (for the active locale). For round-type rows, instead of the combobox, a non-editable badge SHALL be displayed with the text "N-й тур" / "Round N" (where N is the chronological round number). The badge SHALL use the `badge-info` DaisyUI class. Round rows SHALL NOT be editable — they can only be deleted.

#### Scenario: Editing a datetime field

- **WHEN** the user changes the datetime value in a row
- **THEN** the `scheduledAt` of that row is updated

#### Scenario: Typing free text in the combobox

- **WHEN** the user types text into the event combobox input
- **THEN** the row remains or becomes an event type
- **AND** the typed text is stored in `locales[activeLocale].title`
- **AND** the dropdown filters preset options to those containing the typed text (case-insensitive)

#### Scenario: Selecting a preset event

- **WHEN** the user selects a preset event option from the dropdown
- **THEN** the row becomes an event type
- **AND** the localized title is written to ALL supported locales simultaneously
- **AND** the input text is replaced with the preset's title for the active locale

#### Scenario: Selecting "Тур" from the dropdown

- **WHEN** the user selects the "Тур" option from the dropdown
- **THEN** the row becomes a round type
- **AND** all round rows in the schedule are renumbered sequentially (1, 2, 3…) based on their current chronological position
- **AND** any event locale data is cleared
- **AND** the combobox is replaced with a non-editable `badge-info` badge showing "N-й тур" / "Round N"

#### Scenario: Round row displays as a badge

- **WHEN** a schedule row has `kind === 'round'`
- **THEN** the row displays a `badge badge-info` element with text "N-й тур" / "Round N" instead of the event combobox
- **AND** the badge number N reflects the chronological position of this round among all round rows

#### Scenario: Round row cannot be edited

- **WHEN** a schedule row has `kind === 'round'`
- **THEN** there is no text input for the event field
- **AND** the user can only delete the row using the remove button

#### Scenario: Text input always produces event rows

- **WHEN** the user types text into the combobox input on an event row
- **THEN** the row remains an event type regardless of the typed content
- **AND** the text is stored in `locales[activeLocale].title`

### Requirement: Schedule row add and remove buttons

Each schedule row SHALL have an add button (PlusIcon) and a remove button (XMarkIcon). Clicking the add button SHALL insert a new empty row directly below the current row. Clicking the remove button SHALL remove the current row from the feed.

#### Scenario: Adding a row below an existing row

- **WHEN** the user clicks the add button on row N
- **THEN** a new empty row is inserted at position N+1

#### Scenario: Removing a row

- **WHEN** the user clicks the remove button on a row
- **THEN** the row is removed from the feed
- **AND** if the removed row was a round, subsequent round numbers are NOT renumbered until the next sort

### Requirement: Schedule auto-sorts chronologically on datetime blur

When a `datetime-local` input in any schedule row loses focus (`onBlur`), the entire schedule feed SHALL be re-sorted chronologically by `scheduledAt`. After sorting, all round-type rows SHALL be renumbered sequentially (1, 2, 3…) based on their position in the sorted array.

#### Scenario: Changing a datetime causes reordering

- **WHEN** the user changes the datetime of row N to an earlier time and the input loses focus
- **THEN** the feed is re-sorted so that row N moves to its correct chronological position
- **AND** all round rows are renumbered based on their new chronological order

#### Scenario: Blurring without datetime change

- **WHEN** the user focuses and then blurs a datetime input without changing its value
- **THEN** no re-sorting or renumbering occurs

### Requirement: Empty schedule rows are not saved

On save, schedule rows where `scheduledAt` is missing AND (for events) the title is empty in all locales SHALL be filtered out and not persisted. Event rows with a missing title in some but not all locales SHALL be saved with the non-empty locales only.

#### Scenario: Saving with an empty row

- **WHEN** the user saves a tournament that has an empty row (no datetime, no title)
- **THEN** that row is not included in `schedule.events` or `schedule.rounds`

#### Scenario: Saving with a partially filled event row

- **WHEN** the user saves a tournament with an event row that has a datetime but no title in any locale
- **THEN** that row is not included in `schedule.events`

### Requirement: Preset event options are localized

The schedule combobox SHALL offer four preset event options with localized titles for all supported locales: "Регистрация участников" / "Participant registration", "Открытие турнира, жеребьёвка" / "Tournament opening, drawing", "Награждение, закрытие турнира" / "Award ceremony, closing", "Перерыв" / "Break". When a preset is selected, each locale SHALL receive its own correctly localized title (not the same string repeated for all locales).

#### Scenario: Viewing preset options in Russian locale

- **WHEN** the active locale is Russian and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Регистрация участников", "Открытие турнира, жеребьёвка", "Награждение, закрытие турнира", "Перерыв"

#### Scenario: Viewing preset options in English locale

- **WHEN** the active locale is English and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Participant registration", "Tournament opening, drawing", "Award ceremony, closing", "Break"

#### Scenario: Selecting a preset writes per-locale translations

- **WHEN** the user selects a preset event option while the active locale is Russian
- **THEN** the `ru` locale slot receives the Russian translation of the preset
- **AND** the `en` locale slot receives the English translation of the same preset

### Requirement: Dropdown round option uses static label and info styling

The first item in the schedule event combobox dropdown SHALL always display "Тур" / "Round" (without a round number). This item SHALL be visually distinguished from preset events using a `bg-info` background class.

#### Scenario: Viewing the round option in Russian

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is Russian
- **THEN** the first item displays "Тур" with a `bg-info` background

#### Scenario: Viewing the round option in English

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is English
- **THEN** the first item displays "Round" with a `bg-info` background
