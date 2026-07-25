## 1. Form hook — ScheduleRow model and handlers

- [x] 1.1 Define `ScheduleRow` discriminated union type in `src/hooks/useTournamentForm.ts` (round | event with `id`, `scheduledAt`, `number`/`locales`)
- [x] 1.2 Update `tournamentToFormState` to merge `schedule.events` + `schedule.rounds` into `ScheduleRow[]` sorted by `scheduledAt`
- [x] 1.3 Update `formStateToUpdateInput` to split `ScheduleRow[]` back into `events[]` + `rounds[]`, filtering out empty rows (no `scheduledAt` or no title in any locale for events)
- [x] 1.4 Replace `addRound`/`updateRound`/`removeRound` with `addScheduleRow(id?)`, `updateScheduleRow(id, patch)`, `removeScheduleRow(id)`
- [x] 1.5 Implement `sortScheduleRows()` — sort by `scheduledAt` + renumber round rows sequentially

## 2. ScheduleSection component — complete rewrite

- [x] 2.1 Rename section title to "Программа соревнований" / "Competition program" and add `LocaleTabs` switcher
- [x] 2.2 Render unified schedule feed with shared column headers ("Дата и время", "Событие")
- [x] 2.3 Implement datetime input per row with `onBlur` triggering `sortScheduleRows()`
- [x] 2.4 Implement custom combobox component (text input + filtered dropdown with preset options and "N-й тур" option)
- [x] 2.5 Implement preset event selection — write localized title to ALL locales
- [x] 2.6 Implement "N-й тур" selection — convert row to round type with next available number
- [x] 2.7 Implement free-text typing — store in `locales[activeLocale].title`, filter presets incrementally
- [x] 2.8 Add row buttons: `PlusIcon` (insert below) and `XMarkIcon` (remove row) from `@heroicons/react/20/solid`
- [x] 2.9 Handle empty schedule — render one empty row if no schedule items exist

## 3. i18n

- [x] 3.1 Add schedule-related keys to `src/locales/en/translation.json` (title, dateTime, event, round, presets)
- [x] 3.2 Add schedule-related keys to `src/locales/ru/translation.json`

## 4. Tests

- [x] 4.1 Add tests for `ScheduleRow` merge/split logic (events + rounds → ScheduleRow[] → events + rounds)
- [x] 4.2 Add tests for empty row filtering on save
- [x] 4.3 Add tests for chronological sorting and round renumbering

## 5. Verification

- [x] 5.1 Run `npm run lint` — no new errors; ESLint on TournamentEditForm.tsx passes
- [x] 5.2 Run `npx tsc --noEmit` and tests — 8/8 pass; parse error fixed
