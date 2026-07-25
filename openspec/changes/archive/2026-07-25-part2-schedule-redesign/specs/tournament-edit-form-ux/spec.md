## ADDED Requirements

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

Each schedule row SHALL contain a `datetime-local` input and a custom combobox for the event/round type. The combobox SHALL consist of a text input and a dropdown panel. The text input SHALL display the current event title (for the active locale) or "N-й тур" for round rows.

#### Scenario: Editing a datetime field

- **WHEN** the user changes the datetime value in a row
- **THEN** the `scheduledAt` of that row is updated

#### Scenario: Typing free text in the combobox

- **WHEN** the user types text into the event combobox input
- **THEN** the row becomes or stays an event type
- **AND** the typed text is stored in `locales[activeLocale].title`
- **AND** the dropdown filters preset options to those containing the typed text (case-insensitive)

#### Scenario: Selecting a preset event

- **WHEN** the user selects a preset event option from the dropdown
- **THEN** the row becomes an event type
- **AND** the localized title is written to ALL supported locales simultaneously
- **AND** the input text is replaced with the preset's title for the active locale

#### Scenario: Selecting "N-й тур" from the dropdown

- **WHEN** the user selects the "N-й тур" option from the dropdown
- **THEN** the row becomes a round type
- **AND** the round number is set to the next available number (one more than the current count of round rows)
- **AND** any event locale data is cleared

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

The schedule combobox SHALL offer four preset event options with localized titles for all supported locales: "Регистрация участников" / "Participant registration", "Открытие турнира, жеребьёвка" / "Tournament opening, drawing", "Награждение, закрытие турнира" / "Award ceremony, closing", "Перерыв" / "Break".

#### Scenario: Viewing preset options in Russian locale

- **WHEN** the active locale is Russian and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Регистрация участников", "Открытие турнира, жеребьёвка", "Награждение, закрытие турнира", "Перерыв"

#### Scenario: Viewing preset options in English locale

- **WHEN** the active locale is English and the user opens the combobox dropdown
- **THEN** the preset options are displayed as "Participant registration", "Tournament opening, drawing", "Award ceremony, closing", "Break"