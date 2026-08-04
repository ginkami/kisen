## MODIFIED Requirements

### Requirement: Tournament startYearMonth computation

The `startYearMonth` field of a tournament SHALL be computed as the minimum `scheduledAt` date across both `schedule.rounds` and `schedule.events` arrays. If both arrays are empty, it SHALL default to the current month.

#### Scenario: startYearMonth considers both rounds and events

- **WHEN** a tournament has events in `schedule.events` but no rounds in `schedule.rounds`
- **THEN** `startYearMonth` is derived from the earliest `scheduledAt` in `schedule.events`

#### Scenario: startYearMonth with empty schedule

- **WHEN** a tournament has no rounds and no events in its schedule
- **THEN** `startYearMonth` defaults to the current month