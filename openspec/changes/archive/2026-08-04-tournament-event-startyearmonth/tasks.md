## 1. Utils

- [x] 1.1 In `src/utils/yearMonth.ts`, update `getTournamentStartYearMonth()` to consider both `schedule.rounds` and `schedule.events` arrays (minimum date across all).

## 2. Event service

- [x] 2.1 In `src/services/eventService.ts`, add `syncStartYearMonth(eventId)` method: query tournaments with `parentEvent = eventId`, compute min `startYearMonth`, update event.

## 3. Tournament service

- [x] 3.1 In `src/services/tournamentService.ts`, in `update()`, after saving: if `parentEvent` changed, call `eventService.syncStartYearMonth()` for old and new event ids.

## 4. Admin drawer

- [x] 4.1 In `src/components/AdminDrawer.tsx`, add a separate `selectedEventYearMonth` state and `<input type="month">` in the Events section (independent from tournaments month selector).

## 5. Verification

- [x] 5.1 Run `npx tsc -b --noEmit` and resolve any type errors.
