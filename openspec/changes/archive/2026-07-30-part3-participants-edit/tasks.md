## 1. Sort callback

- [x] 1.1 In `src/hooks/useTournamentForm.ts`, add `sortParticipants(by: 'name' | 'rating', direction: 'asc' | 'desc', locale: SupportedLocale)` callback: sorts `state.participants` in-place via `updateForm`; name sort uses `localeCompare` on `familyName` in the given locale; rating sort uses `Number(ratingValue)` with empty treated as `-Infinity`; export from hook return.

## 2. Sort toolbar UI

- [x] 2.1 In `src/components/tournament/ParticipantsSection.tsx`, add `onSort` prop; render a sort toolbar (4 icon buttons: `BsSortAlphaDown`, `BsSortAlphaDownAlt`, `BsSortNumericDown`, `BsSortNumericDownAlt`) between header and card list when `participants.length >= 2`; each button has a tooltip.
- [x] 2.2 In `src/components/tournament/TournamentEditForm.tsx`, pass `onSort={(by, direction) => sortParticipants(by, direction, scheduleLocale)}` to `ParticipantsSection`.

## 3. Translations

- [x] 3.1 Add `sortByName` and `sortByRating` keys under `tournament.edit.participants` in `src/locales/ru/translation.json` and `src/locales/en/translation.json`.

## 4. Verification

- [x] 4.1 Run `npx tsc -b --noEmit` and resolve any type errors.