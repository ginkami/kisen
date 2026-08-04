## Context

The `startYearMonth` field is stored as a `yyyyMM` string (length 6) and used for Firestore month-based filtering. For tournaments, it is computed from `schedule.rounds[0].scheduledAt`. For events, it is set to the current month at creation time. A cross-entity link exists: a tournament can reference an event via its `parentEvent` field.

## Goals / Non-Goals

**Goals:**
- Tournament: `startYearMonth` is computed from the minimum date across both `schedule.rounds` and `schedule.events`.
- Event: `startYearMonth` is synced with the minimum `startYearMonth` of all linked tournaments.
- AdminDrawer: Events section has its own independent month selector.

**Non-Goals:**
- Changing the domain schema.

## Decisions

### Decision 1: getTournamentStartYearMonth — consider events

Update the function in `src/utils/yearMonth.ts` to collect dates from both `schedule.rounds` and `schedule.events`, returning the minimum. If both arrays are empty, fall back to the current month.

### Decision 2: syncStartYearMonth — cross-entity synchronization

Add `eventService.syncStartYearMonth(eventId)`:
- Query all tournaments with `parentEvent === eventId`
- If none found — set `startYearMonth` to the current month
- If found — take the minimum `startYearMonth` across all matching tournaments
- Update the event in the repository

### Decision 3: Trigger synchronization from tournamentService

In `tournamentService.update()`, after saving the tournament:
- If `existing.parentEvent !== updated.parentEvent`:
  - If `existing.parentEvent` was set → `eventService.syncStartYearMonth(existing.parentEvent)`
  - If `updated.parentEvent` is set → `eventService.syncStartYearMonth(updated.parentEvent)`

### Decision 4: Independent month selector in AdminDrawer

Add a separate `selectedEventYearMonth` state variable and an `<input type="month">` element in the Events section of `AdminDrawer.tsx`, independent from the tournaments month selector.

## Risks / Trade-offs

- **[Cross-entity writes]** — Updating a tournament triggers an additional write to the linked event. Acceptable since this operation is rare and targeted.
- **[Cache invalidation]** — The event update may require cache invalidation. Use `queryClient.invalidateQueries({ queryKey: ['events'] })`.