## 1. EventPickerModal — month filter

- [x] 1.1 Add local state `selectedMonth` (`YYYY-MM` format) to `src/components/tournament/EventPickerModal.tsx`, initialized with the current month via `formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))`.
- [x] 1.2 Add `<input type="month">` with a calendar icon (the `AdminDrawer` "Events" section pattern) above the event list; value — `selectedMonth`, on change — `setSelectedMonth(value)`.
- [x] 1.3 Pass `parseMonthInputToYearMonth(selectedMonth)` to `useEventsForMonth` instead of calling it without an argument.

## 2. BindingSection — displaying the selected event

- [x] 2.1 In `src/components/tournament/TournamentEditForm.tsx` (`BindingSection`), replace `useEventsForMonth()` with `useQuery` using `queryKey: ['event', 'byId', formState.parentEvent]`, `queryFn: () => eventService.getById(formState.parentEvent!)`, `enabled: !!formState.parentEvent`.
- [x] 2.2 Build `selectedEventTitle` from `selectedEvent` (title by the current `i18n.language`, fallback to `slug`; if `null`/missing — `noParentEvent`), remove the current-month list lookup.
- [x] 2.3 Remove the unused `useEventsForMonth` import from `BindingSection` (verify it is not used in other sections of the file).

## 3. Verification

- [x] 3.1 Check that queryKey `['event', 'byId', id]` does not conflict with existing keys (`['event', 'slugExists', ...]` is used in `useEventForm.ts`).
- [x] 3.2 Run the build (`npm run build`) and confirm there are no type errors.