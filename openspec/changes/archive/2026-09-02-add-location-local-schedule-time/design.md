## Context

Schedule datetimes are stored as UTC instants (`scheduledAt: Date`). The edit form uses a `datetime-local` input parsed by `localDatetimeInputValueToUtcDate` (`new Date(y, m, d, h, min)`), which interprets the wall clock in the **browser timezone of whoever is editing**. All consumers work with the instant: admin-drawer sorting and status computation in `tournamentService` (`editTime >= firstRound.scheduledAt`), `tournamentStart`, meta day ranges (`tournamentScheduleDays` / `formatDayRanges`, currently grouped by UTC days in `TournamentMeta`), the public schedule list, and `AdminDrawer` date formatting (browser timezone).

The location (`tournamentLocationSchema`) has coordinates (`latitude`/`longitude`) but no timezone. There is no tz-lookup dependency in the project. A read-side legacy migration precedent exists: `remapLegacyRounds()` inside `firestoreTournamentRepository.fromFirestore()`.

## Goals / Non-Goals

**Goals:**

- Persist the organizer's wall-clock intent so it survives browser-timezone differences, location moves, and later re-derivation.
- Display schedule times in the venue's timezone everywhere datetimes are shown to humans (public page, edit form, admin drawer).
- Keep every instant-based consumer (sorting, statuses, queries) working unchanged.
- Migrate legacy documents transparently on read.

**Non-Goals:**

- Backfilling/migrating documents in Firestore (converges on next save).
- Per-entry timezone overrides (one timezone per tournament location).
- Historical timezone-rule precision for dates before the current IANA rules (acceptable for future/near-past events).
- Server-side rendering changes or Firestore rules changes.

## Decisions

**D1. Local wall-clock is the source of truth; `scheduledAt` stays as a derived instant.**
`scheduleEventSchema` / `scheduleRoundSchema` gain optional `scheduledAtLocal: { year, month, day, hour, minute }`; the existing `scheduledAt: Date` remains and is recomputed from local parts + timezone at every save/publish. Alternatives rejected: string "18.07.2026 15:30" (locale-dependent parsing, not type-safe); local-only with on-the-fly derivation (timezone math in hot paths: sorting, status computation, day grouping); Date-only with location-change correction (cannot distinguish legacy "browser-timezone" values from corrected ones, loses intent if a save is interrupted).

**D2. IANA timezone persisted on the location, resolved only at write time.**
`tournamentLocationSchema` gains optional `timeZone` (IANA name). `buildLocationForSave` resolves it from coordinates via `@photostructure/tz-lookup` (offline, no network, maintained; chosen over `geo-tz` for smaller size). All read paths are pure `Intl` formatting against the stored name - no lookup on read.

**D3. Offset computation via two-pass `Intl`, no new timezone library.**
`zonedWallClockToUtc` guesses the offset, formats the resulting instant in the target zone with `Intl.DateTimeFormat`, measures the discrepancy, and re-applies once (the standard two-pass trick). `utcToZonedWallClock` uses `formatToParts`. No luxon/date-fns-tz dependency; unit-tested against known cases (Europe/Moscow fixed offset, Europe/Berlin DST transitions, roundtrips).

**D4. Legacy migration on read, in the repository.**
In `fromFirestore` (next to `remapLegacyRounds`): for entries without `scheduledAtLocal`, interpret the stored instant's wall clock in `location.timeZone` (backfilled from coordinates via tz-lookup when missing; `null` when unresolvable). Documented limitation: exact recovery only when the creator's browser timezone matched the venue timezone (the common case); otherwise the shift is irrecoverable because the original intent was never stored.

**D5. Fallback preserves current behavior.**
When `location.timeZone` cannot be determined (no coordinates, lookup failure, event without location), display falls back to the current behavior: day grouping/formatting as today and no "venue local time" tooltip icon. The write path still stores instants (wall clock interpreted as UTC is NOT used; the instant from the input stays untouched in this case).

**D6. Form rows carry both representations.**
`ScheduleRow` keeps `scheduledAt: Date | null` (for onBlur sorting and display) and adds `scheduledAtLocal: LocalTime | null` (edited by the `datetime-local` input via a pure parser). The instant is refreshed from local parts + timezone when possible.

## Risks / Trade-offs

- [DST fall-back produces ambiguous local times] -> Two-pass derivation picks the first (standard) occurrence; documented, matches user expectations for future events.
- [tz-lookup adds ~70 KB of data tables] -> Only imported on the write/migration path; evaluated at implementation time, dynamic import if it measurably affects the main bundle.
- [Legacy recovery is best-effort] -> Covered by D4 limitation; after the first save every document converges to the new model.
- [`Intl` formatting depends on runtime ICU] -> Modern browsers/Node ship full ICU; covered by unit tests on both ru and en locales.
- [Existing `useTournamentForm` tests break with the new `ScheduleRow` shape] -> Planned updates in tasks; form-state JSON snapshots change shape only for new rows.

## Migration Plan

1. Ship schema + write-path changes (new fields are optional, old documents keep parsing).
2. Read-side migration in `fromFirestore` makes legacy documents display correctly immediately.
3. No Firestore write migration: documents converge to the new model on their next save.
4. Rollback: revert the release; new fields are ignored by the old code, which keeps reading `scheduledAt` instants.

## Open Questions

None. (`absolute` time control suffix confirmed as suffix-less; main-time decomposition already shipped separately.)
