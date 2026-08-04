## Why

On the tournament edit page, the event picker modal (`EventPickerModal`) only shows events of the current month and has no month filter, and in the "Binding" section the selected event ("Registered under event") is not displayed if its `startYearMonth` differs from the current month. This degrades the UX when binding a tournament to an event.

## What Changes

- Add an independent month filter to `EventPickerModal` (like in the "Events" section of the admin panel) so the user can select an event from any month.
- Fix the display of the selected event in `BindingSection`: the title of the selected `parentEvent` should be loaded by ID directly, not looked up in the list of current-month events.

## Capabilities

### New Capabilities

### Modified Capabilities
<!-- Pure UI fix without changes to data/service requirements. No delta spec required. -->

## Impact

- `src/components/tournament/EventPickerModal.tsx` — add `<input type="month">` and pass the selected month to `useEventsForMonth(month)`.
- `src/components/tournament/TournamentEditForm.tsx` (`BindingSection`) — load the selected event via `useQuery` + `eventService.getById(parentEvent)` instead of searching the current-month list.
- No new i18n keys needed (`selectMonth`, `noEvents`, `noParentEvent` already exist).