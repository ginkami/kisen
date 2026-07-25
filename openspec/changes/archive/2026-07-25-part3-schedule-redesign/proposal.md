## Why

The schedule section's "Event" combobox in the tournament edit form has two UX issues and one data bug:

1. **Round rows are confusing** — when the user selects "N-й тур" from the dropdown, the combobox remains editable as a text input, allowing accidental edits. Round rows should be a distinct, non-editable badge since a "round" is a structural concept, not free text.
2. **Dropdown label is misleading** — the first dropdown item reads "1-й тур" (or "2-й тур"), but the number is a _future_ round count, not the actual row's round number. It should simply say "Тур" (Round) to avoid confusion.
3. **Preset localization bug** — when selecting a preset event (e.g., "Регистрация участников"), the same string (from the current i18n language) is written to all locale slots. Each locale should receive its own localized title.

## What Changes

- The first dropdown item in the event combobox changes from "N-й тур" to simply "Тур" (Round), styled with `.bg-info` background.
- When the user selects "Тур" from the dropdown, the row becomes a `kind: 'round'` row. Instead of the combobox, a non-editable `<span className="badge badge-info">N-й тур</span>` badge is displayed (N = chronological position among round rows). The row can only be deleted, not edited.
- Text input or selecting any other preset always maps the row to `schedule.events`, regardless of what text the user types (even if they type "какой-угодно тур").
- Preset event selection writes each locale's own localized title using `i18n.getFixedT(locale)` instead of the active language's `t()`.

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
- `tournament-edit-form-ux`: The schedule section requirements are changing — round rows become non-editable badges, the dropdown item for rounds changes label and style, and preset events must localize per-locale.

## Impact

- `src/components/tournament/TournamentEditForm.tsx` — `ScheduleEventCombobox` component and `ScheduleSection` rendering logic
- `src/locales/ru/translation.json` — new key `program.roundOption`
- `src/locales/en/translation.json` — new key `program.roundOption`
- No changes to domain models, service layer, or repository layer