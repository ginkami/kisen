## Why

Participants on the tournament edit form have no sorting — cards appear in insertion order only. Organizers need to quickly reorder participants by family name (alphabetical) or by rating (numerical) to review the field and prepare pairings.

## What Changes

- Add a sort toolbar above the participant cards (visible only when there are 2+ participants) with four icon buttons:
  - `BsSortAlphaDown` — sort by family name (active locale), ascending. Tooltip: «Сортировать по фамилии».
  - `BsSortAlphaUpAlt` — sort by family name (active locale), descending. Tooltip: «Сортировать по фамилии».
  - `BsSortNumericDown` — sort by rating value (`capturedRating.value`), ascending. Tooltip: «Сортировать по рейтингу».
  - `BsSortNumericUpAlt` — sort by rating value, descending. Tooltip: «Сортировать по рейтингу».
- Sorting reorders the `participants` array in form state (not just UI), so the new order persists on save.
- Add `sortParticipants(by, direction, locale)` callback to `useTournamentForm`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-edit-form-ux`: participants can now be sorted by family name or rating via a sort toolbar.

## Impact

- **Code**: `src/hooks/useTournamentForm.ts` (new `sortParticipants` callback), `src/components/tournament/ParticipantsSection.tsx` (sort toolbar + `onSort` prop), `src/components/tournament/TournamentEditForm.tsx` (pass `onSort`).
- **i18n**: 2 new keys (`sortByName`, `sortByRating`) in `ru` and `en`.
- **Dependencies**: none.