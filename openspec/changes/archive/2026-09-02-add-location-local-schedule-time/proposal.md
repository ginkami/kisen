## Why

Tournament schedule datetimes (`schedule.events[]` / `schedule.rounds[].scheduledAt`) are currently captured via a `datetime-local` input that is parsed in the **editor's browser timezone** and stored as a UTC instant. The resulting instant silently depends on where the editor was sitting, not on where the tournament takes place. A tournament created in Moscow for a venue in Tokyo shows the wrong start time for everyone; moving the tournament to another location does not correct stored times, and legacy documents cannot be reinterpreted later because the original wall-clock intent was never persisted.

## What Changes

- Add optional `scheduledAtLocal` (`{ year, month, day, hour, minute }`) to `scheduleEventSchema` and `scheduleRoundSchema` as the **source of truth** (the wall-clock time the organizer entered).
- Add optional `timeZone` (IANA name, e.g. `Europe/Moscow`) to `tournamentLocationSchema`, resolved from location coordinates via `@photostructure/tz-lookup` (offline lookup, no network calls).
- Derive `scheduledAt: Date` (UTC instant) from `scheduledAtLocal` + location `timeZone` at every save/publish, so all existing instant-based consumers (sorting, status computation, `tournamentStart`) keep working unchanged.
- Migrate legacy documents on read in the repository (`fromFirestore`): backfill `scheduledAtLocal` by interpreting the stored instant's wall clock in the location timezone and backfill `location.timeZone` from coordinates.
- Group the public meta date range (`tournamentScheduleDays` / day-range formatting) and format schedule datetimes (public schedule list, admin drawer) in the **location timezone** instead of the browser/UTC timezone.
- Public schedule list rows show a richer datetime: prominent local `hh:mm` with a "local venue time" info tooltip, smaller weekday/day/month/year line, and the UTC time with an inserted `dd/MM` when the UTC day differs from the local day.
- The schedule editor's "Date and time" label gets an info tooltip explaining that the time is the venue's local time.
- Add i18n keys (ru/en) for the venue-local-time tooltip and UTC label.
- When the timezone cannot be determined (no coordinates, lookup failure), fall back to current behavior (browser-local formatting, no tooltip icon).

## Capabilities

### New Capabilities

- `tournament-schedule-local-time`: Location-timezone-aware storage and handling of tournament schedule datetimes - local wall-clock source of truth, derived UTC instant, IANA timezone on the location, write-time derivation, and legacy document migration.

### Modified Capabilities

- `tournament-public-page`: Meta date-range lines and the schedule list now display datetimes in the venue's timezone (day grouping by venue-local days, UTC time with day-shift annotation, info tooltip) instead of the browser timezone.

## Impact

- **Domain**: `src/domain/tournament.ts` - `scheduleEventSchema`, `scheduleRoundSchema`, `tournamentLocationSchema` gain optional fields (backward compatible, no breaking schema change).
- **Services**: `firestoreTournamentRepository.fromFirestore` - legacy migration; `tournamentService` schedule write path stays instant-based (no change); read-side status computations unchanged.
- **Hooks**: `useTournamentForm` - `ScheduleRow` carries `scheduledAtLocal`; `splitSchedule` derives instants from local parts + timezone; save/publish recompute on every write.
- **Utils**: new `src/utils/scheduleTime.ts` (`resolveTimeZone`, `zonedWallClockToUtc`, `utcToZonedWallClock`); `src/utils/dateTime.ts` gets a schedule-datetime formatter; `src/utils/tournamentDisplay.ts` day grouping becomes timezone-aware.
- **Components**: `TournamentEditForm.tsx` (schedule section, label tooltip), `view/TournamentScheduleList.tsx` (rich datetime display), `AdminDrawer.tsx` (venue-timezone formatting).
- **Locales**: `ru/translation.json`, `en/translation.json` - tooltip and UTC label keys.
- **Dependencies**: add `@photostructure/tz-lookup` (offline lat/lng -> IANA timezone).
- **Tests**: unit tests for timezone utilities and the formatter, repository migration test, updates to `useTournamentForm` tests for the new `ScheduleRow` shape.
