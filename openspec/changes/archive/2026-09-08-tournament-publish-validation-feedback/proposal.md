## Why

Publishing a tournament whose program rounds have no start time fails silently from the user's perspective: the publish pre-validation does not check round times, `splitSchedule` drops untimed rows, the published schema then rejects the empty rounds array, and the only feedback is a generic error alert at the top of the page — the user stays on the current tab with no highlighted fields.

## What Changes

- Extend `validateTournamentPublishForm`: add a `roundTime` error when program rounds exist but some lack `scheduledAt` (`rounds` stays for "no rounds at all"); export the validator for component-level pre-checks; expose `setValidationErrors` from the hook.
- Publish button pre-check: when validation fails, the confirmation dialog does not open — `validationErrors` are set and the form switches to the tab of the first failing area (general info / schedule / participants).
- `ScheduleSection`: highlights round time inputs missing a value (`input-error`) and shows inline hints (`roundTimeRequired` / `roundRequired`) when the corresponding validation errors are present; hints disappear on edit (existing `updateForm` behavior).
- New locale keys `tournament.edit.program.roundTimeRequired` and `tournament.edit.program.roundRequired` (ru/en). The generic `publishError` alert remains as a fallback for server-side failures.

## Capabilities

### New Capabilities

- `tournament-publish-validation`: publish-time validation feedback — round-time validation, tab-switching pre-check, and inline schedule highlighting.

### Modified Capabilities

- (none)

## Impact

- `src/hooks/useTournamentForm.ts` (validator + exposed setter), `src/components/tournament/TournamentEditForm.tsx` (pre-check, tab switch, ScheduleSection highlighting), `src/locales/ru/translation.json` + `en`.
- No domain schema, Firestore rules, or index changes — the validator now matches what `publishedTournamentScheduleSchema` already requires (every round must have `scheduledAt`).