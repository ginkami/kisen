
## Purpose

Define the read-only public tournament view page served at /tournaments/{UUID} and /tournaments/{slug} for public tournaments only: routing/visibility gate, event header block with sibling tournament tabs, tournament meta lines, content tab navigation, and read-only schedule, players, and crosstable sections.

## Requirements

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
- **THEN** the «Описание» tab is active and its content is visible

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

The «Описание» section SHALL render the tournament description content defined by the «Description tab content» requirement and SHALL NOT be a placeholder anymore. The «Результаты» section SHALL NOT be a placeholder anymore and SHALL render the results view defined by the «Results round tabs», «Results table», and «Results table headers» requirements.

#### Scenario: Description tab is no longer a placeholder

- **WHEN** the user opens the «Описание» tab of a tournament that has a description
- **THEN** the section area renders the description content instead of an empty placeholder

#### Scenario: Results tab is no longer a placeholder

- **WHEN** the user opens the «Результаты» tab of a tournament with at least one published round
- **THEN** the section area renders the rounds heading, round tabs, and the results table for the active round

### Requirement: Results round tabs

The «Результаты» section SHALL render a second-level heading («Туры»/«Rounds») and one tab per published round. Published rounds SHALL be the rounds numbered `1..min(roundCount, currentRound)` where `roundCount` is `schedule.rounds.length` and `currentRound` equals the number of published draws. Tabs for rounds greater than the last published round SHALL NOT be rendered. The default active round SHALL be the last published round. When no round is published (`currentRound == 0`), the section SHALL render the heading, a localized empty-state message, and no tabs or table.

#### Scenario: Published rounds only

- **WHEN** a tournament has 7 scheduled rounds and `currentRound == 3`
- **THEN** the section renders exactly three round tabs (1, 2, 3) with round 3 active

#### Scenario: No published rounds

- **WHEN** a tournament has scheduled rounds but `currentRound == 0`
- **THEN** the section renders the «Туры» heading and a localized empty-state message, and no tabs or table

#### Scenario: Switching rounds

- **WHEN** the user selects a different published round tab
- **THEN** the results table re-renders for the selected round

### Requirement: Results table content and ordering

For the active round, the «Результаты» section SHALL render a read-only table whose pair and bye rows SHALL be the games returned by `containersFromGames` for that round — the same boards, in the same pair-strength order, as displayed by the pairings board in the edit form — followed by one trailing row per forfeit game of that round. Each row SHALL start with a sequential pair number (1-based over all rendered rows). For each player the row SHALL render, in order: the country flag with a tooltip showing the country name in the current UI locale, the rank badge with the player's captured rating rank colorized per the crosstable color scale and a crown icon with a tooltip showing the title when the player has one, the player name as «familyName, givenName» picked for the current locale with fallback to `ru` then `en`, the captured rating value, and a badge with the points accumulated strictly before the active round (including `startingPoints`, excluding the active round itself). Bye rows SHALL leave all player-2 cells empty. Forfeit rows SHALL render only the forfeiting player and no player-2 cells.

#### Scenario: Boards match the pairings board order

- **WHEN** the pairings board for the active round lists boards sorted by descending pair strength
- **THEN** the results table lists the same boards in the same order, and forfeit games appear as rows after all pair and bye rows

#### Scenario: Points before the round

- **WHEN** a player has 2 points after round 1 and starting points 0, and round 2 is active
- **THEN** the player's points badge in the round-2 table shows 2

#### Scenario: Bye row

- **WHEN** the active round contains a bye game for a player
- **THEN** the row renders the player in the player-1 cells and all player-2 cells are empty

#### Scenario: Forfeit row

- **WHEN** the active round contains a forfeit game
- **THEN** the table renders a trailing row with only the forfeiting player's cells populated

### Requirement: Results result symbols

The result cell between the two players SHALL render: `? : ?` when the game has no result (including live, adjourned, and not-started games), `+ : -` when player 1 won, `- : +` when player 2 won, `= : =` for a draw, `+` for a bye (or `=` when the bye result is a draw, consistent with the crosstable), and `-` for a forfeit row.

#### Scenario: Outcome symbols

- **WHEN** the active round contains, respectively, a game without a result, a player-1 win, a player-2 win, and a draw
- **THEN** the result cells render `? : ?`, `+ : -`, `- : +`, and `= : =`

#### Scenario: Bye and forfeit symbols

- **WHEN** the active round contains a bye game won by its player and a forfeit game
- **THEN** the bye row's result cell renders `+` and the forfeit row's result cell renders `-`

### Requirement: Results table headers

The table header SHALL contain, left to right: an empty pair-number column; per player an empty flag column, an empty rank column, a name column header showing ☗ for player 1 and ☖ for player 2 when `settings.considerSente` is true (otherwise empty), a «Рейтинг»/«Rating» column header, and an «Очки»/«Pts» column header; and a result column header showing the localized round label («{{n}}-й тур»/«Round {{n}}») with the active round number.

#### Scenario: Sente-aware headers

- **WHEN** `settings.considerSente` is true
- **THEN** the player-1 name column header shows ☗ and the player-2 name column header shows ☖

#### Scenario: Headers without sente tracking

- **WHEN** `settings.considerSente` is false
- **THEN** both name column headers are empty

#### Scenario: Result column header

- **WHEN** round 2 is active
- **THEN** the result column header renders «2-й тур» in the `ru` locale and «Round 2» in the `en` locale

### Requirement: Description tab content

The «Описание» section SHALL render Markdown content assembled from localized description sources in this exact order: the parent event's description, the tournament's description, the parent event's regulations' descriptions, the tournament's regulations' descriptions. Sources SHALL be included only when the tournament has a `parentEvent` (event description and event regulations) and only when the corresponding localized description is non-empty. When the tournament has no `parentEvent`, only the tournament's description and the tournament's regulations' descriptions SHALL be rendered. Regulations SHALL be represented solely by their Markdown description content; regulation titles SHALL NOT be rendered. A regulation attached to both the tournament and its parent event SHALL be rendered exactly once, using the tournament's copy. Localized content SHALL be picked for the current locale with a fallback to the `ru` locale. When no source yields content, the section SHALL render nothing.

#### Scenario: Tournament within an event with all sources

- **WHEN** a tournament with a `parentEvent` has a description, the event has a description, and each has one attached regulation with a description
- **THEN** the section renders, in order: the event description, the tournament description, the event regulation's description, the tournament regulation's description

#### Scenario: Standalone tournament

- **WHEN** a tournament has no `parentEvent` but has a description and one attached regulation with a description
- **THEN** the section renders only the tournament description followed by the tournament regulation's description

#### Scenario: Regulation attached to both tournament and event

- **WHEN** the same regulation id is present in both the tournament's and the parent event's regulation lists
- **THEN** the regulation's description renders exactly once, positioned among the tournament regulations

#### Scenario: Locale fallback for content

- **WHEN** the current locale is `en` and a source provides only a `ru` description
- **THEN** the `ru` description is rendered

#### Scenario: Empty sources

- **WHEN** the tournament has no description, no regulations, no `parentEvent`
- **THEN** the section area renders empty with no controls and no empty-state message

### Requirement: Description tab uses safe Markdown rendering

All content of the «Описание» section SHALL be rendered through the `markdown-rendering` capability: Markdown with raw HTML disabled and link schemes restricted to the allow-list, with headings split into collapsible sections as defined by that capability.

#### Scenario: Unsafe link in description

- **WHEN** a tournament description contains a Markdown link with a `javascript:` URL
- **THEN** the element renders without a usable link target (no `javascript:` navigation is possible)
