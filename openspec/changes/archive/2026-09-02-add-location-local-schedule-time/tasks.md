## 1. Timezone utilities

- [x] 1.1 Install `@photostructure/tz-lookup` and add it to `package.json`
- [x] 1.2 Create `src/utils/scheduleTime.ts` with `LocalTime` type, `resolveTimeZone(lat, lng)` (tz-lookup wrapper, try/catch to `null`), `zonedWallClockToUtc(local, timeZone)` (two-pass `Intl` offset computation), `utcToZonedWallClock(date, timeZone)` (`formatToParts`)
- [x] 1.3 Add unit tests `src/test/scheduleTime.test.ts`: Europe/Moscow fixed offset, Europe/Berlin summer and winter (DST), UTC roundtrip, Tokyo conversion

## 2. Domain schemas

- [x] 2.1 Add optional `scheduledAtLocal` (`{ year, month, day, hour, minute }`) to `scheduleEventSchema` and `scheduleRoundSchema` in `src/domain/tournament.ts`
- [x] 2.2 Add optional `timeZone` to `tournamentLocationSchema` in `src/domain/tournament.ts`
- [x] 2.3 Verify legacy documents (without new fields) still parse via existing domain tests

## 3. Repository migration (read path)

- [x] 3.1 In `firestoreTournamentRepository.fromFirestore` (next to `remapLegacyRounds`): backfill `location.timeZone` from coordinates when missing (tz-lookup), backfill `scheduledAtLocal` for entries without it by interpreting the instant wall clock in the location timezone; no Firestore writes
- [x] 3.2 Add repository migration tests: legacy entry gets local components, timezone backfill from coordinates, unresolvable timezone leaves fields unset

## 4. Form hook and write path

- [x] 4.1 Extend `ScheduleRow` in `useTournamentForm` with `scheduledAtLocal`; parse `datetime-local` input into local parts (pure parser, no `new Date` interpretation); keep derived `scheduledAt` for sorting
- [x] 4.2 Update `tournamentToFormState` / `mergeSchedule` to derive `scheduledAtLocal` from the instant + location timezone
- [x] 4.3 Update `splitSchedule` to emit `scheduledAtLocal` and recompute `scheduledAt` instants from local parts + timezone; use it in save and publish mutations
- [x] 4.4 Update `buildLocationForSave` to resolve and persist `location.timeZone` from coordinates when missing
- [x] 4.5 Update `useTournamentForm` tests for the new `ScheduleRow` shape and derivation logic (location change shifts instants, local times preserved)

## 5. Display (timezone-aware formatting)

- [x] 5.1 Add schedule datetime formatter to `src/utils/dateTime.ts` returning local `hh:mm`, weekday short + `dd.mm.yyyy`, and UTC time with inserted `dd/MM` when the UTC day differs; unit tests for ru/en locales and day-shift cases
- [x] 5.2 Make `TournamentMeta` day-range grouping (`tournamentScheduleDays` / day-range formatting) use the location timezone when known (fallback: current behavior)
- [x] 5.3 Update `TournamentScheduleList.tsx`: prominent local `hh:mm` + `BsInfoCircleFill` tooltip «По локальному времени места проведения», smaller weekday/date line, UTC time with day-shift annotation; no icon when timezone unknown
- [x] 5.4 Update `AdminDrawer.tsx` to format schedule dates in the location timezone when known

## 6. Edit form UI and i18n

- [x] 6.1 Add `BsInfoCircleFill` info icon with daisyUI tooltip to the «Дата и время» label in `TournamentEditForm.tsx` schedule section
- [x] 6.2 Add i18n keys to `ru/translation.json` and `en/translation.json`: venue-local-time tooltip (`tournament.edit.program.localTimeHint`) and UTC label

## 7. Validation

- [x] 7.1 Run `npm run typecheck` (`tsc -b`) with exit code 0
- [x] 7.2 Run full `npm run test:run` and fix regressions
- [x] 7.3 Run `npm run build` with exit code 0
- [x] 7.4 Verify bundle impact of tz-lookup; switch to dynamic import on the write path if it affects the main bundle
