## ADDED Requirements

### Requirement: Home page lists published tournaments by phase

The home page SHALL render the heading «Турниры» and a tab panel (`tabs-border`) with three tabs — «Архив», «Идут», «Анонсы» — each labeled with the number of tournaments in that section. Each tab SHALL render the list of published tournaments (`isPublic === true` with status `finished`, `ongoing`, or `upcoming` respectively; `draft`, `canceled`, and `proposed_for_removing` tournaments SHALL NOT be listed). Loading, empty («Турниров не найдено»), and error states SHALL be handled per section.

#### Scenario: Sections and counts

- **WHEN** the home page loads
- **THEN** the three phase tabs are shown, each labeled with its section's tournament count
- **AND** the active tab renders that section's tournament cards

#### Scenario: Only published tournaments are listed

- **WHEN** the application contains draft, canceled, or proposed-for-removing tournaments
- **THEN** none of them appears in any section

### Requirement: Sections order by start time and paginate by 30

Tournaments in each section SHALL be ordered by the tournament start time (`startAt`): «Архив» and «Идут» — most recent first, «Анонсы» — soonest first. Each section SHALL load tournaments in pages of 30 via cursor pagination. When a section has more tournaments to show, a text button «Показать следующие 30 турниров» SHALL be rendered at the bottom of the section; clicking it SHALL load the next page showing a spinner while loading.

#### Scenario: Upcoming tournaments are ordered soonest first

- **WHEN** the «Анонсы» section lists tournaments
- **THEN** they are ordered by start time ascending

#### Scenario: Finished tournaments are ordered recent first

- **WHEN** the «Архив» section lists tournaments
- **THEN** they are ordered by start time descending

#### Scenario: Loading the next page

- **WHEN** the user clicks «Показать следующие 30 турниров» in a section with more results
- **THEN** the next page of up to 30 tournaments is appended with a spinner during loading

#### Scenario: No more pages

- **WHEN** all tournaments of a section are loaded
- **THEN** the "show more" button is not rendered

### Requirement: Tournament filter form

The home page SHALL render a fixed filter form on the left with: a title search input, a date range (from/to), a country select, and a city text input, plus «Применить» (with a funnel icon) and «Отмена» buttons. «Применить» SHALL apply the draft filter values so that the section lists and tab counts update accordingly (country and date range server-side; title and city as client-side substring filters over the loaded lists). «Отмена» SHALL clear the form and restore the unfiltered lists.

#### Scenario: Applying filters

- **WHEN** the user fills the filter fields and clicks «Применить»
- **THEN** the section lists and tab counts reflect the filter values

#### Scenario: Cancelling filters

- **WHEN** the user clicks «Отмена»
- **THEN** the form fields are cleared and the lists render unfiltered

#### Scenario: Country and date filters narrow the server query

- **WHEN** a country and/or a date range is applied
- **THEN** the section queries filter by `location.country` and the `startAt` range

### Requirement: Tournament card on the home page

Each tournament card SHALL render: an `h2` heading with the localized tournament title as a link to the tournament page; below it, when the tournament belongs to an event, the localized event title as a smaller link to the event page; in the top-right corner, an edit icon link (`BsPencilSquare`) to the tournament edit page only when the current user may edit the tournament (admin, creator, or manager of the host association). Below, one metadata row SHALL show: dates of the tournament (locale-formatted day ranges with the location timezone), the time control in short format, the participants count, the rounds count on the left; and on the right: the host association title badge in the current locale, and the country flag with the localized country name and settlement.

#### Scenario: Card links

- **WHEN** a card's title or parent event title is clicked
- **THEN** the tournament or event page opens respectively

#### Scenario: Edit icon respects permissions

- **WHEN** a user who may edit the tournament views the card
- **THEN** the edit icon link is shown in the card's top-right corner
- **AND** for visitors and users without edit rights it is not shown

#### Scenario: Card metadata row

- **WHEN** a tournament card renders
- **THEN** the meta row shows the locale-formatted date range, short time control, participants count, rounds count, the host association badge, and the flag with country name and settlement
