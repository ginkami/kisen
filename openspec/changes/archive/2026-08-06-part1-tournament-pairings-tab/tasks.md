## 1. Setup

- [x] 1.1 Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` via `npm i`
- [x] 1.2 Verify the installed versions are React 19 compatible (`npm ls @dnd-kit/core`)

## 2. Service layer

- [x] 2.1 Add optional `currentRound?: number` to `UpdateTournamentInput` in `src/services/tournamentService.ts`
- [x] 2.2 Thread `input.currentRound` into the `updated` object inside `TournamentService.update` (fall back to `existing.currentRound`)

## 3. Form state hook (`src/hooks/useTournamentForm.ts`)

- [x] 3.1 Add `games: Game[]` and `currentRound: number` to `TournamentFormState`
- [x] 3.2 Initialize both fields in `tournamentToFormState` from `tournament.games` / `tournament.currentRound`
- [x] 3.3 Pass `games` and `currentRound` through `formStateToUpdateInput` (include `currentRound` in the update input object)
- [x] 3.4 Add `updateGames(round: number, gamesForRound: Game[])` updater that replaces all games for the given round (preserve other rounds' games)
- [x] 3.5 Add `publishDraw(round: number)` updater that sets `currentRound = round`
- [x] 3.6 Export `updateGames` and `publishDraw` from the hook's return object

## 4. `PlayerCard` controllable toggle (`src/components/player/PlayerCard.tsx`)

- [x] 4.1 Add optional props `toggleChecked?: boolean`, `onToggleChange?: (checked: boolean) => void`, `toggleTooltip?: string`
- [x] 4.2 When `toggleChecked`/`onToggleChange` are provided, render a controlled toggle; otherwise keep the existing decorative always-checked toggle
- [x] 4.3 Render `toggleTooltip` as a DaisyUI `tooltip` on the toggle element when provided
- [x] 4.4 Verify `PlayerSearchPanel` (existing call site) still renders unchanged

## 5. Pairings domain helpers (new module)

- [x] 5.1 Create `src/components/tournament/pairings/pairingsModel.ts` with pure helpers:
  - `gamesForRound(games, round): Game[]`
  - `containersFromGames(games, participants, round): { unpaired, players1, players2 }`
  - `withParticipantDropped(games, round, participantId, container, index): Game[]`
  - `withResultCycled(games, round, gameId): Game[]`
  - `withForfeit(games, round, participantId, forfeit): Game[]`
  - `isRoundComplete(games, participants, round): boolean`
  - `participantRowToPlayerLike(row, locale): Player` adapter
- [x] 5.2 Add `vitest` unit tests for the helpers covering: bye creation, pair completion, dissolve → unpaired, reorder, result cycle, forfeit on/off, publish eligibility

## 6. PairingsBoard component (new)

- [x] 6.1 Create `src/components/tournament/PairingsBoard.tsx` rendering three `@dnd-kit` drop containers (`unpaired`, `players1`, `players2`)
- [x] 6.2 Derive container contents from `games` + `participants` via `containersFromGames` (no local position state)
- [x] 6.3 Implement DnD handlers that compute new `games[]` via `withParticipantDropped` and call `onGamesChange`
- [x] 6.4 Render the per-row result button between `players1`/`players2`; cycle via `withResultCycled`; disable when `round !== currentRound`
- [x] 6.5 Disable dragging of cards whose pair has a non-null `result`
- [x] 6.6 Render the forfeit toggle on each card (`showToggle`, `toggleChecked`, `onToggleChange`, `toggleTooltip="Техническое поражение"`); wire toggle to `withForfeit`
- [x] 6.7 Make the board read-only when `round <= currentRound` (DnD and edits disabled for already-published rounds)

## 7. PairingsSection component (new)

- [x] 7.1 Create `src/components/tournament/PairingsSection.tsx` with the "Туры" header and right-aligned "Опубликовать жеребьёвку" button
- [x] 7.2 Render round sub-tabs `1..schedule.rounds.length`; disable sub-tabs `> currentRound + 1`
- [x] 7.3 Compute publish-button state: disabled until `isRoundComplete` for the active round; labeled "Жеребьёвка опубликована" when `activeRound === currentRound`
- [x] 7.4 On enabled publish click, call `publishDraw(activeRound)`
- [x] 7.5 Render `PairingsBoard` for the active round; pass `onGamesChange = (games) => updateGames(round, games)`
- [x] 7.6 Handle empty state when `schedule.rounds.length === 0`

## 8. TournamentEditForm wiring

- [x] 8.1 Add `pairings` to the `TabId` union and the `tabs` array with the `Bs123` icon and `tabs.pairings` label
- [x] 8.2 Track active round as local state inside the pairings tab (lift into `PairingsSection`)
- [x] 8.3 Render `<PairingsSection />` when `activeTab === 'pairings'`, passing `games`, `currentRound`, `participants`, `schedule.rounds`, `considerSente`, `updateGames`, `publishDraw`, and active locale

## 9. i18n

- [x] 9.1 Add keys to `src/locales/ru/translation.json` under `tournament.edit.tabs.pairings` and `tournament.edit.pairings.*` (`title`, `publishDraw`, `drawPublished`, `forfeit`, result labels)
- [x] 9.2 Add the matching keys to `src/locales/en/translation.json`
- [x] 9.3 Verify all new user-facing strings have both `ru` and `en` entries

## 10. Verification

- [x] 10.1 Run `npm run lint` and resolve any issues
- [x] 10.2 Run `tsc -b` and resolve type errors
- [x] 10.3 Run `vite build` and confirm a successful production build
- [x] 10.4 Run unit tests for `pairingsModel.ts` helpers
