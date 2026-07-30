## Context

The participants tab (parts 1–2) renders editable cards but has no sorting. Cards appear in insertion order. Organizers need alphabetical (by family name) and numerical (by rating) sorting to review the field.

## Goals / Non-Goals

**Goals:**
- Provide 4 sort buttons (name asc/desc, rating asc/desc) visible when 2+ participants exist.
- Sorting reorders `state.participants` in form state (persists on save).
- Use the active locale for name sorting.

**Non-Goals:**
- Multi-column or custom sorting.
- Persisting sort preference across sessions.

## Decisions

### Decision 1: `sortParticipants` callback in `useTournamentForm`

Add `sortParticipants(by: 'name' | 'rating', direction: 'asc' | 'desc', locale: SupportedLocale)` — follows the `sortScheduleRows` pattern: calls `updateForm` with a sorted copy of `state.participants`.

- **Name sort**: compare `row.locales[locale]?.familyName` case-insensitively (`localeCompare`).
- **Rating sort**: compare `Number(row.ratingValue)`; empty rating treated as `-Infinity` so unrated participants sort last in ascending order.
- **Locale parameter**: the hook doesn't know the active locale, so it's passed from the UI.

### Decision 2: Sort toolbar in `ParticipantsSection`

Add `onSort` prop. Render the toolbar (4 buttons) between the header and the card list, only when `participants.length >= 2`. Each button is a `btn btn-sm btn-ghost tooltip` with the appropriate icon and tooltip text.

### Decision 3: Wiring in `TournamentEditForm`

Pass `onSort={(by, direction) => sortParticipants(by, direction, scheduleLocale)}` to `ParticipantsSection`.

## Risks / Trade-offs

- **[Sort mutates form state]** — Intentional: the new order persists on save, matching the requirement. Undo is via editing/re-adding cards.
- **[Empty rating handling]** — Empty `ratingValue` treated as `-Infinity` in ascending sort (unrated last). In descending sort, unrated first. Acceptable for tournament use.