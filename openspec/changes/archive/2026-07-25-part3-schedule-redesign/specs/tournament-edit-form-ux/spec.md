## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Dropdown round option uses static label and info styling

The first item in the schedule event combobox dropdown SHALL always display "Тур" / "Round" (without a round number). This item SHALL be visually distinguished from preset events using a `bg-info` background class.

#### Scenario: Viewing the round option in Russian

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is Russian
- **THEN** the first item displays "Тур" with a `bg-info` background

#### Scenario: Viewing the round option in English

- **WHEN** the user opens the schedule event combobox dropdown while the active locale is English
- **THEN** the first item displays "Round" with a `bg-info` background