## Context

On the tournament edit page (`TournamentEditForm.tsx`), the `BindingSection` shows the selected parent event. The current implementation looks it up in `events` obtained from `useEventsForMonth()` without an argument — that is, only events of the **current month** (`formatDateToYearMonth(new Date())`). If `parentEvent` belongs to another month, its title is not found, and the button displays the "Not set" fallback even though a value exists in `formState.parentEvent`.

The `EventPickerModal` uses the same `useEventsForMonth()` without an argument: the user sees only current-month events and cannot select an event from another month. An independent month filter is already implemented in the "Events" section of the admin panel (`AdminDrawer`), but the modal does not have one.

Existing utilities (`src/utils/yearMonth.ts`) already contain converters:
- `formatDateToYearMonth(date)` → `YYYYMM` (`startYearMonth` DB format)
- `formatYearMonthToMonthInput(value)` → `YYYY-MM` (`<input type="month">` value)
- `parseMonthInputToYearMonth(value)` → `YYYYMM`

## Goals / Non-Goals

**Goals:**
- Let the user select an event from any month via the month filter in `EventPickerModal`.
- Guarantee that the title of the selected `parentEvent` is displayed in `BindingSection` regardless of its `startYearMonth`.
- Minimize changes: UI layer only, without touching services, repositories, domain models, or Firestore rules.

**Non-Goals:**
- Do not change the event/tournament data model or introduce new fields.
- Do not change the `parentEvent` saving logic in `useTournamentForm`.
- Do not add new i18n keys (the existing `selectMonth`, `noEvents`, `noParentEvent` suffice).
- Do not touch `syncStartYearMonth` or any other date synchronization.

## Decisions

### 1. Month filter in `EventPickerModal`

Local state `selectedMonth` in `YYYY-MM` format (the `<input type="month">` value), initialized with the current month: `formatYearMonthToMonthInput(formatDateToYearMonth(new Date()))`.

- UI: `<input type="month">` with a calendar icon (the `AdminDrawer` "Events" section pattern) above the event list.
- On change: `setSelectedMonth(value)`, and the hook is called with `parseMonthInputToYearMonth(selectedMonth)` → `useEventsForMonth(yearMonth)`.
- `useEventsForMonth` already accepts `yearMonth` and builds the queryKey `['events', 'month', yearMonth]` — caching works automatically.

**Alternatives considered:**
- "Show all events without a filter" (calling `useEventsForMonth` without an argument plus a separate query for all events): contradicts the monthly data model of `events.startYearMonth` and worsens UX with a large list.
- A dropdown selector of months of existing events: requires a separate query and does not cover empty months; `<input type="month">` is simpler and consistent with `AdminDrawer`.

### 2. Displaying the selected event in `BindingSection`

Replace the current-month list lookup with loading the event by ID via `useQuery` + `eventService.getById(formState.parentEvent)`:

```ts
const { data: selectedEvent } = useQuery({
  queryKey: ['event', 'byId', formState.parentEvent],
  queryFn: () => eventService.getById(formState.parentEvent!),
  enabled: !!formState.parentEvent,
})
```

- `selectedEventTitle` is built from `selectedEvent` (locale title by the current `i18n.language`, fallback to `slug`); if `null`/missing — `noParentEvent`.
- The `useEventsForMonth()` call is removed from `BindingSection` — the current-month event list is no longer needed there.
- `queryKey: ['event', 'byId', id]` is consistent with the project's cache style (e.g., `[TOURNAMENT_QUERY_KEY, id]`).

**Alternatives considered:**
- Filtering by `startYearMonth === getTournamentStartYearMonth(...)` inside `BindingSection` and showing only the tournament month's events: does not solve the problem if the event is in a different month altogether and the user needs a general filter; duplicates filtering logic.
- A separate `useEventById` hook: an over-abstraction for a single use site; an inline `useQuery` is simpler and follows the project pattern.

## Risks / Trade-offs

- [The modal opens with `startYearMonth` of the bound tournament's event possibly differing from the current month] → The user sees a month filter and can switch; when the modal opens, the month is initialized to the current one, as in `AdminDrawer`.
- [Loading an event by ID is an extra request in `BindingSection`] → Small volume (one document), cached by TanStack Query; the request only runs when `parentEvent` is present.
- [queryKey `['event', id]` may conflict with existing keys] → A single place for key storage in `queryClient.ts`; during implementation check whether such a key already exists, and if there is a conflict use a specific one (`['selectedEvent', id]`).

## Migration Plan

- No data migration is required — changes are frontend-only.
- Rollback: revert the changes to the two components; behavior returns to the status quo.

## Open Questions

- No open questions — the plan is agreed with the user.