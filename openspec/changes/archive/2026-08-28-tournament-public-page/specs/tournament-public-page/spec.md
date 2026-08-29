## ADDED Requirements

### Requirement: Tournament page routing and visibility

The system SHALL serve the read-only tournament page for both `/tournaments/{UUID}` and `/tournaments/{slug}` addresses using the existing `/tournaments/:slug` route. The page SHALL detect whether the route param is a UUID (then load the tournament by id) or a slug (then load it by slug). Only tournaments with `isPublic == true` SHALL be displayed on either address; a non-public or missing tournament SHALL render a localized "not found" state.

#### Scenario: Opening a public tournament by slug

- **WHEN** the user opens `/tournaments/{slug}` and a tournament with that slug exists and `isPublic` is true
- **THEN** the page loads the tournament by slug and renders the tournament view

#### Scenario: Opening a public tournament by UUID

- **WHEN** the user opens `/tournaments/{UUID}` and the tournament with that id exists and `isPublic` is true
- **THEN** the page loads the tournament by id and renders the tournament view

#### Scenario: Opening a draft tournament by UUID

- **WHEN** the user opens `/tournaments/{UUID}` and the tournament exists but `isPublic` is false
- **THEN** the page renders the localized "not found" state and no tournament data is displayed

#### Scenario: Opening a nonexistent tournament

- **WHEN** the user opens `/tournaments/{slugOrUuid}` and no tournament matches
- **THEN** the page renders the localized "not found" state

#### Scenario: Loading states

- **WHEN** the tournament query is in flight
- **THEN** the page renders a centered loading spinner
- **WHEN** the tournament query fails
- **THEN** the page renders a localized load-error alert

### Requirement: Event header block

When the tournament has a `parentEvent`, the page SHALL render the event's localized title as the top-level heading (`h1`), followed by a `tabs-lift` tab panel and the tournament title as a second-level heading (`h2`). The tab panel SHALL contain one tab per every public tournament of the same parent event, sorted left-to-right by tournament start time (first round's `scheduledAt` → earliest `schedule.events[].scheduledAt` → `updatedAt` fallback cascade). Each non-active tab SHALL be a link to that tournament's slug address; the active tab (current tournament) SHALL have no link. When the tournament has no `parentEvent`, the block SHALL be skipped and the tournament title SHALL be the `h1`.

#### Scenario: Tournament within an event

- **WHEN** the tournament has a `parentEvent` with three public tournaments in total
- **THEN** the event title renders as `h1`
- **AND** the tab panel shows three tabs sorted by tournament start time
- **AND** the active tab shows the current tournament title without a link
- **AND** the other tabs link to their tournaments' slug addresses
- **AND** the tournament title renders as `h2`

#### Scenario: Standalone tournament

- **WHEN** the tournament has no `parentEvent`
- **THEN** no event heading or tab panel is rendered
- **AND** the tournament title renders as `h1`

#### Scenario: Sibling sorting fallback

- **WHEN** two sibling tournaments have no rounds and no events, and one has an earlier `updatedAt`
- **THEN** the tournament with the earlier `updatedAt` renders first in the tab panel

### Requirement: Tournament meta lines

The page SHALL render, directly under the tournament title, one line per characteristic, each with a leading icon: (1) `BsCalendar3` + the tournament dates in compact range format; (2) country flag + full country name in the current locale + localized settlement; (3) `BsGeoAlt` + localized venue — rendered only when the venue is non-empty; (4) `HiOutlineUserGroup` + number of participants; (5) `BsHourglassSplit` + short time control; (6) `BsPlayFill` + round count; (7) `PiGavelLight` + arbiter name as «familyName, givenName». The dates SHALL be computed from the unique calendar days of `schedule.rounds[].scheduledAt` and `schedule.events[].scheduledAt` (fallback: the day of `updatedAt`) and formatted as: single day «10 августа 2026»; consecutive days joined by an en dash «10–11 августа 2026»; days with gaps listed comma-separated «10, 12, 25 августа 2026», with a month name repeated whenever the month changes «10, 12 августа, 3 сентября 2026», including cross-month ranges «25 августа – 5 сентября 2026»; the year SHALL appear once at the end.

#### Scenario: Single-day tournament

- **WHEN** all schedule dates fall on the same calendar day
- **THEN** the dates line shows that single day with month and year (e.g. «10 августа 2026»)

#### Scenario: Consecutive days

- **WHEN** the schedule days are August 10 and August 11 of the same year
- **THEN** the dates line shows «10–11 августа 2026»

#### Scenario: Days with gaps across months

- **WHEN** the schedule days are August 10, August 12, and September 3 of the same year
- **THEN** the dates line shows «10, 12 августа, 3 сентября 2026»

#### Scenario: Continuous range across months

- **WHEN** every day from August 25 to September 5 is covered by schedule entries
- **THEN** the dates line shows «25 августа – 5 сентября 2026»

#### Scenario: Location line

- **WHEN** the tournament location has country `BY` and settlement «Минск» while the UI locale is `ru`
- **THEN** the location line shows the Belarus flag, «Беларусь», and «Минск»

#### Scenario: Venue line is conditional

- **WHEN** `location.locales.<lang>.venue` is empty or undefined
- **THEN** no venue line is rendered

#### Scenario: Time control short format

- **WHEN** the time control is byoyomi with 40 main minutes, 30 byoyomi seconds, and 3 periods
- **THEN** the time control line shows «40 минут + 30 секунд × 3 (Бёёми)» in the `ru` locale

#### Scenario: No schedule dates

- **WHEN** the tournament has no rounds and no events scheduled
- **THEN** the dates line falls back to the day of `updatedAt`

### Requirement: Content tab navigation

The page SHALL render a `tabs-box` tablist with five tabs in this order: «Описание» (`BsJournalText`), «Расписание» (`BsClock`), «Игроки» (`HiOutlineUserGroup`), «Результаты» (`Bs123`), «Таблица» (`BsGrid3X2`). Clicking a tab SHALL switch the visible content section. Only one tab's content SHALL be visible at a time. Tab labels SHALL be localized.

#### Scenario: Switching tabs

- **WHEN** the user clicks the «Расписание» tab
- **THEN** the schedule section becomes visible and the previously visible section is hidden

#### Scenario: Default tab

- **WHEN** the page loads
- **THEN** the «Описание» tab is active and its (placeholder) content is visible

### Requirement: Schedule list section

The «Расписание» section SHALL render a read-only list of schedule rows (rounds and events merged), sorted chronologically by `scheduledAt`. Each row SHALL show the date and time in the current locale followed by a «Тур {n}» badge for round rows, or the localized event title for event rows. No inputs, buttons, or other editable controls SHALL be present.

#### Scenario: Mixed rounds and events

- **WHEN** the schedule contains a round on August 10 at 12:00 and an event «Открытие» on August 10 at 10:00
- **THEN** the list shows the «Открытие» row first, followed by the «Тур 1» row, each with the formatted date and time

### Requirement: Players table section

The «Игроки» section SHALL render a table with the first six columns of the crosstable: № (row number), nationality flag, rank badge (with title crown tooltip when present), player name as «familyName, givenName», location (with residence flag when it differs from nationality), and rating value. Players SHALL be sorted by rating descending (players without a rating last), with a stable tie-break by family name. No inputs, buttons, or other editable controls SHALL be present.

#### Scenario: Sorting by rating

- **WHEN** the section renders players with ratings 1800, 2100, and no rating
- **THEN** the player with 2100 renders first, 1800 second, and the unrated player last

#### Scenario: Row numbering

- **WHEN** the players table renders
- **THEN** the № column shows sequential row numbers starting from 1, independent of standings

### Requirement: Read-only crosstable section

The «Таблица» section SHALL render the crosstable based on the same standings computation as the edit form (`computeStandings` with the tournament's tie-breaks): place, nationality flag, rank badge, name, location, rating, one column per round with read-only result cells (result symbol with opponent place, sente mark when `considerSente`, handicap badge when set), followed by tie-break columns. Cells SHALL be plain text without any buttons or inputs. The starting-points column SHALL render as read-only text and SHALL be present only when at least one participant has `startingPoints > 0`.

#### Scenario: Result cell without controls

- **WHEN** a participant has a recorded win against the player at place 3 in round 2
- **THEN** the round 2 cell for that participant shows the win symbol with the opponent's place number and no clickable elements

#### Scenario: Starting points column visibility

- **WHEN** no participant has `startingPoints > 0`
- **THEN** the starting-points column is not rendered

#### Scenario: Starting points shown read-only

- **WHEN** one participant has `startingPoints` of 2 and the rest have 0
- **THEN** the starting-points column renders showing each participant's value as plain text

### Requirement: Placeholder sections

The «Описание» and «Результаты» sections SHALL render as empty placeholders with no content in this iteration.

#### Scenario: Placeholder tabs

- **WHEN** the user opens the «Описание» or «Результаты» tab
- **THEN** the section area renders empty with no controls
