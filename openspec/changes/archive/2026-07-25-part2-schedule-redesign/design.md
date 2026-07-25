## Context

The tournament edit form's "Schedule" tab currently only manages `schedule.rounds` via the `ScheduleSection` component in `src/components/tournament/TournamentEditForm.tsx`. It renders a simple list of rows with a round number input and a datetime input. The `schedule.events` array — which holds localized schedule items like "Participant registration", "Opening ceremony", etc. — is not editable through the UI at all.

The domain model (`src/domain/tournament.ts:37-53`) stores events and rounds as two separate arrays:
- `scheduleEventSchema`: `{ scheduledAt: Date, locales: localeSchema({ title: min(1) }) }`
- `scheduleRoundSchema`: `{ number: int ≥ 1, scheduledAt: Date }`

The form hook (`src/hooks/useTournamentForm.ts`) has handlers `addRound`, `updateRound`, `removeRound` but no event handlers. The `tournamentToFormState` and `formStateToUpdateInput` functions only round-trip the `rounds` array.

## Goals / Non-Goals

**Goals:**
- Present a single unified chronological feed mixing events and rounds.
- Allow locale-aware editing of event titles via a `LocaleTabs` switcher.
- Provide a custom combobox with free-text input and preset event options.
- Automatically sort the feed chronologically and renumber rounds when datetime changes.
- Filter out empty rows on save (no datetime + no title = not saved).

**Non-Goals:**
- Changing the Zod domain schemas — `scheduleEventSchema` and `scheduleRoundSchema` already support the needed shapes.
- Drag-and-drop reordering — sorting is automatic by datetime only.
- Editing event titles for multiple locales simultaneously in one view — the `LocaleTabs` switcher shows one locale at a time.
- Modifying Firestore security rules or indexes.

## Decisions

### Decision 1: Intermediate `ScheduleRow` type in the form hook

Introduce a `ScheduleRow` discriminated union in `useTournamentForm.ts`:
```ts
type ScheduleRow =
  | { kind: 'round'; id: string; scheduledAt: Date; number: number }
  | { kind: 'event'; id: string; scheduledAt: Date; locales: Record<SupportedLocale, { title: string }> }
```
- `id` is a temporary client-side identifier (crypto.randomUUID or incrementing counter) used as React key.
- `tournamentToFormState` merges `events` + `rounds` into `ScheduleRow[]`, sorted by `scheduledAt`.
- `formStateToUpdateInput` splits `ScheduleRow[]` back into `events[]` + `rounds[]`, filtering out empty rows (no `scheduledAt` or no `title` for events).

**Alternative considered:** Store events and rounds as separate arrays in form state and merge only in the UI. Rejected because sorting and renumbering across two arrays would be error-prone and require synchronization logic.

### Decision 2: Combobox as input + filtered dropdown

The custom combobox for the "Событие" field is composed of:
- A text `<input>` that shows the current event title (for the active locale) or "N-й тур" for round rows.
- A dropdown panel that appears on focus or when typing.
- Dropdown items:
  1. "N-й тур" (always present, where N = next available round number) — selecting converts the row to `kind: 'round'`.
  2. Preset event options filtered by the current input text (case-insensitive substring match against the active locale's title).
- When the user types: the row becomes (or stays) `kind: 'event'`, the typed text is stored in `locales[activeLocale].title`, and presets are filtered.
- When the user selects a preset: the row becomes `kind: 'event'`, the localized title is written to ALL locales, and the input text is replaced.
- When the user selects "N-й тур": the row becomes `kind: 'round'`, `number` is set to the next available number, and `locales` is cleared.

**Alternative considered:** Use a native `<select>` + separate text input. Rejected because the user needs to both type free text and select from presets in one field.

### Decision 3: Preset events written to all locales

When a preset event is selected, its localized title is written to `schedule.events.locales.ru.title` and `schedule.events.locales.en.title` simultaneously. The preset values are defined as a static map:
```ts
const SCHEDULE_PRESETS: Record<string, Record<SupportedLocale, string>> = {
  registration: { ru: 'Регистрация участников', en: 'Participant registration' },
  opening: { ru: 'Открытие турнира, жеребьёвка', en: 'Tournament opening, drawing' },
  award: { ru: 'Награждение, закрытие турнира', en: 'Award ceremony, closing' },
  break: { ru: 'Перерыв', en: 'Break' },
}
```
After writing, the user can still edit individual locales via `LocaleTabs` — editing one locale does not affect others.

### Decision 4: Sorting and renumbering on datetime change

When a `datetime-local` input loses focus (`onBlur`), the entire `ScheduleRow[]` array is sorted by `scheduledAt`. After sorting, all rows with `kind: 'round'` are renumbered sequentially (1, 2, 3...) based on their position in the sorted array.

Sorting is NOT triggered on every keystroke (to avoid focus loss and cursor jumps). It only happens on blur.

### Decision 5: Empty row handling

- If `ScheduleRow[]` is empty, the component renders one empty event row (with a new `id` and no `scheduledAt` or `title`).
- On save, rows where `scheduledAt` is null/invalid AND (for events) `title` is empty are filtered out.
- For events, the Zod schema requires `title: min(1)`, so empty-title events must be filtered before validation.

### Decision 6: Add/remove buttons with heroicons

- Add button: `PlusIcon` from `@heroicons/react/20/solid` (mini variant) — inserts a new empty row directly below the current row.
- Remove button: `XMarkIcon` from `@heroicons/react/20/solid` (mini variant) — removes the current row.
- Both are small icon-only buttons with `btn-ghost btn-sm btn-circle` styling.

## Risks / Trade-offs

- [Risk: Sorting on blur may cause visual jumps if the user is editing multiple rows] → Mitigation: sorting only happens on blur, not on every change, so the user finishes editing one row before it moves.
- [Risk: Round renumbering may confuse users who expect manual control] → Mitigation: rounds are always numbered chronologically — this matches tournament conventions where round order follows time.
- [Risk: Combobox accessibility (keyboard navigation, ARIA)] → Mitigation: use standard `<input>` with `role="combobox"`, `aria-expanded`, and a `<ul role="listbox">` for options. Support Enter to select and Escape to close.
- [Risk: Empty rows with partial data (datetime but no title)] → Mitigation: on save, filter rows where the event has no title in any locale, or where `scheduledAt` is missing.