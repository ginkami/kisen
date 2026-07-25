## Why

The tournament edit form's "Schedule" tab currently only manages `schedule.rounds` — a simple list of numbered rounds with datetime. It does not manage `schedule.events` (localized schedule items like "Participant registration", "Opening ceremony", "Award ceremony", etc.). Tournaments need a unified chronological program that mixes rounds and events in a single timeline, with locale-aware event titles and automatic reordering.

## What Changes

- **Rename section:** "Расписание" → "Программа соревнований" (Competition program).
- **Locale switcher:** Add `LocaleTabs` to the schedule section for editing locale-dependent event titles (`schedule.events.locales[lang].title`).
- **Unified schedule feed:** Replace the separate rounds-only list with a single chronological feed of rows. Each row is either a round or an event, containing:
  - `datetime-local` input (shared header "Дата и время")
  - Custom combobox "Событие" — a text input combined with a dropdown:
    - Free-text input for arbitrary locale-dependent event titles (`schedule.events.locales[lang].title`)
    - Dropdown option "N-й тур" (next available round number) — converts the row to a round type
    - Preset event options (localized): "Регистрация участников", "Открытие турнира, жеребьёвка", "Награждение, закрытие турнира", "Перерыв" — written to all locales at once
    - Incremental filtering: typing filters preset options; selecting a preset replaces the text
  - Add button (heroicons PlusIcon) — inserts a new row below
  - Remove button (heroicons XMarkIcon) — removes the row
- **Chronological sorting:** When a datetime value changes (on blur), the entire feed re-sorts chronologically by `scheduledAt`. Round numbers are re-sequenced (1, 2, 3…) based on chronological order.
- **Empty row handling:** If the tournament has no schedule, one empty row is displayed. Rows with no datetime and no title are not saved.
- **Preset locale behavior:** Selecting a preset event writes the localized title to ALL supported locales simultaneously.

## Capabilities

### New Capabilities

_(none — all changes modify existing capabilities)_

### Modified Capabilities

- `tournament-edit-form-ux`: The schedule section requirements are replaced with a unified chronological feed of events and rounds, locale-aware event titles, a custom combobox with preset options, and automatic chronological sorting with round renumbering.

## Impact

- **Affected code:**
  - `src/components/tournament/TournamentEditForm.tsx` — complete rewrite of `ScheduleSection`
  - `src/hooks/useTournamentForm.ts` — new `ScheduleRow` type, new schedule handlers, updated `formStateToUpdateInput` and `tournamentToFormState`
  - `src/locales/en/translation.json`, `src/locales/ru/translation.json` — new schedule-related keys
- **Domain schemas:** No changes to Zod schemas — `scheduleEventSchema` and `scheduleRoundSchema` already support the needed shapes.
- **Firestore:** No changes to `firestore.rules` or `firestore.indexes.json`.
- **Tests:** To be defined in tasks.