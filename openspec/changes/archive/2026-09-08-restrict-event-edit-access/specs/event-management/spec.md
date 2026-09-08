## MODIFIED Requirements

### Requirement: Events section in admin drawer

The admin drawer's "Events" section SHALL render an independent month selector (with `BsCalendar2` icon), a "+ Мероприятие" create button, and a scrollable list of events available to the user for the selected month. The month selector SHALL be independent from the tournaments section month selector. The section SHALL be available to every authenticated user: any user may create events (owner-based, like tournaments), and the month list SHALL show the events the user may edit — events they created plus events under associations they manage (all events for admins) — filtered client-side to the selected month. Event title search results SHALL be filtered to the events the user may edit; when nothing editable matches, the existing "no search results" message SHALL be shown.

#### Scenario: Admin views events for a month

- **WHEN** a user with role `admin` opens the Events section and selects a month
- **THEN** all events for that month are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Manager views created and managed events

- **WHEN** a user with role `manager` opens the Events section and selects a month
- **THEN** events they created plus events under associations they manage are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Regular user views own events

- **WHEN** a user with role `user` opens the Events section and selects a month
- **THEN** events they created for that month are listed
- **AND** the "+ Мероприятие" button is visible so they can create new events

#### Scenario: Selecting a different month

- **WHEN** the user changes the month selector
- **THEN** the list updates to show events for the newly selected month

#### Scenario: Month selector filters events

- **WHEN** the user changes the month selector in the Events section
- **THEN** only events with matching `startYearMonth` are displayed

#### Scenario: Search results filtered to editable events

- **WHEN** the user searches by title and a matching event has no relation to them
- **THEN** that event is not displayed in the search results
- **WHEN** every matching event is unrelated to the user
- **THEN** the "no search results" message is displayed

#### Scenario: Navigating to event edit page

- **WHEN** the user clicks an event in the list
- **THEN** the application navigates to `/events/:id/edit`

#### Scenario: Creating a new event

- **WHEN** the user clicks the "+ Мероприятие" button
- **THEN** the application navigates to `/events/new`