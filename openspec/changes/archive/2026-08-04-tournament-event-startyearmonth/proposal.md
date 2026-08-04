## Why

The `startYearMonth` field in tournaments and events is used for fast month-based filtering in Firestore queries. Current computation is incomplete:

- **Tournaments**: `getTournamentStartYearMonth()` only considers `schedule.rounds`, ignoring `schedule.events`. If events exist but rounds don't, `startYearMonth` defaults to the current month instead of the actual event date.
- **Events**: `startYearMonth` is set at creation time (current month) but never recalculated when linked tournaments change their `parentEvent`.
- **AdminDrawer**: The Events section lacks its own month selector — it reuses the tournaments' selector.

## What Changes

- **`getTournamentStartYearMonth`**: consider minimum date across both `schedule.rounds` and `schedule.events`.
- **`eventService.syncStartYearMonth(eventId)`**: recalculate from minimum `startYearMonth` of all tournaments with `parentEvent = eventId`.
- **`tournamentService.update()`**: call `syncStartYearMonth` when `parentEvent` changes.
- **`AdminDrawer`**: add independent month selector for Events section.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-management`: `startYearMonth` considers `schedule.events`.
- `event-management`: `startYearMonth` syncs with linked tournaments; Events section gets its own month selector.

## Impact

- **Code**:
  - Modified: `src/utils/yearMonth.ts`, `src/services/eventService.ts`, `src/services/tournamentService.ts`, `src/components/AdminDrawer.tsx`.
- **Dependencies**: none.