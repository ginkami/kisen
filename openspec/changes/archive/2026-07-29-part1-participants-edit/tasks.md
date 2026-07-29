## 1. Shared helpers and search panel

- [x] 1.1 Create `src/hooks/playerFormHelpers.ts`: extract `playerToFormState`, `formStateToUpdateInput`, `validatePlayerForm`, `createEmptyFormState` from `usePlayerForm.ts` (pure functions, identical signatures).
- [x] 1.2 Refactor `src/hooks/usePlayerForm.ts` to import the helpers from `playerFormHelpers.ts`; keep behavior identical.
- [x] 1.3 Create `src/components/player/PlayerSearchPanel.tsx` (props: `query`, `onQueryChange`, `onSelect`, `locale`, `placeholder?`, `variant?`); uses `usePlayerSearch` and renders loading/empty/result list with `PlayerCard`.
- [x] 1.4 Refactor `src/components/AdminDrawer.tsx` to use `PlayerSearchPanel` for the player search section (preserve existing debounce/loading/empty/navigation behavior).

## 2. Tournament form participants state

- [x] 2.1 In `src/hooks/useTournamentForm.ts`: define `ParticipantRow` interface, add `participants: ParticipantRow[]` to `TournamentFormState`, map `tournament.participants` ↔ rows in `tournamentToFormState` (assign transient `rowId`).
- [x] 2.2 Implement `addParticipant(afterRowId?)`, `updateParticipant(rowId, patch)`, `removeParticipant(rowId)` callbacks (follow `addScheduleRow`/`updateScheduleRow`/`removeScheduleRow` patterns; new rows get `startingPoints: 0`).
- [x] 2.3 Include `participants` in `formStateToUpdateInput`: map rows back to `Participant[]` preserving existing `id` where possible; assign sequential `id` (1..N) only to new rows; always set `startingPoints` from row (0 default).

## 3. Participant UI components

- [x] 3.1 Create `src/components/tournament/ParticipantRow.tsx`: renders one card (player-link controls + familyName autocomplete + givenName + ratingValue + rank select + nationality CountrySelect + location input + residence ExpandableField + title ExpandableField); wires update callbacks via `updateParticipant`.
- [x] 3.2 Create `src/components/tournament/ParticipantsSection.tsx`: header ("Участники турнира" + `LocaleTabs`), list of `ParticipantRow` with add/remove buttons (tooltip pattern from Schedule), remove-confirmation modal state.
- [x] 3.3 In `src/components/tournament/TournamentEditForm.tsx`: replace the Participants placeholder with `<ParticipantsSection participants={formState.participants} activeLocale={...} onAdd/onUpdate/onRemove/onLocaleChange={...} />`.

## 4. Player linking flows

- [x] 4.1 In `ParticipantRow`: when `participant.player` is set, show flag + "FamilyName, GivenName" button (tooltip "Редактировать связанного игрока") opening `PlayerEditModal`; on modal save → "overwrite from player?" confirm.
- [x] 4.2 In `ParticipantRow`: unlink button (`BsFillPersonXFill`) → confirm → `updateParticipant({ player: null })` (keep other fields).
- [x] 4.3 In `ParticipantRow`: when `participant.player` is null, show `BsFillPersonPlusFill` button → opens search popover (`PlayerSearchPanel` in a `relative`/`absolute` container titled "Найти игрока в базе"); on select → link + "overwrite from player?" confirm.
- [x] 4.4 Create `src/components/player/PlayerEditModal.tsx`: loads player via `useQuery` + `playerService.getById`; holds local `PlayerFormState`; renders `PlayerInfoSection`; Save → `playerService.update(formStateToUpdateInput(...))`; exposes `onSaved(updatedPlayer)` callback; no router navigation, no outlet-context writes.

## 5. FamilyName autocomplete popover

- [x] 5.1 In `ParticipantRow`: wrap the familyName input in a `relative` container; show `PlayerSearchPanel` (variant `inline`, no title/search input) as `absolute` dropdown when query.length >= 3; on select → `updateParticipant` with player data + `player` set, NO confirm.

## 6. Translations

- [x] 6.1 Add translation keys under `tournament.edit.participants` to `src/locales/ru/translation.json` and `src/locales/en/translation.json` (title, add, remove, removeConfirm*, familyName, givenName, ratingValue, rank, country, location, residence, titleField, linkPlayer, unlinkPlayer, editPlayer, searchPlayerTitle, linkConfirm*, unlinkConfirm*).

## 7. Verification

- [x] 7.1 Run `npm run lint` and resolve any type/lint errors.
- [x] 7.2 Run `npm run build` to confirm the production build succeeds.
- [x] 7.3 (Manual) Verify the Participants tab renders, CRUD works, player link/unlink/edit and familyName autocomplete behave per spec.