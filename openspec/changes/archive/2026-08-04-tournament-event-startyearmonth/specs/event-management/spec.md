## MODIFIED Requirements

### Requirement: Event startYearMonth synchronization

The `EventService` SHALL provide a `syncStartYearMonth(eventId)` method that recalculates the event's `startYearMonth` as the minimum `startYearMonth` across all tournaments with `parentEvent` equal to the given event id. If no tournaments are linked, it SHALL default to the current month.

#### Scenario: startYearMonth synced when tournament is linked

- **WHEN** a tournament's `parentEvent` is set to this event's id
- **THEN** the event's `startYearMonth` is recalculated as the minimum `startYearMonth` across all linked tournaments
- **AND** the event is updated in the repository

#### Scenario: startYearMonth recalculated when tournament is unlinked

- **WHEN** a tournament's `parentEvent` is changed away from this event's id
- **THEN** the event's `startYearMonth` is recalculated from remaining linked tournaments
- **AND** if no tournaments remain linked, `startYearMonth` defaults to the current month

### Requirement: Events section in admin drawer

The admin drawer's "Events" section SHALL render an independent month selector (with `BsCalendar2` icon), a role-gated "+ Мероприятие" create button, and a scrollable list of events available to the user for the selected month. The month selector SHALL be independent from the tournaments section month selector.

#### Scenario: Month selector filters events

- **WHEN** the user changes the month selector in the Events section
- **THEN** only events with matching `startYearMonth` are displayed