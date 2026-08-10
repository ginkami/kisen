## 1. Unlock editing after publication

- [ ] 1.1 In `PairingsBoard.tsx`: remove `isPublished` gate from `handleDragEnd` (keep `if (!over) return`)
- [ ] 1.2 In `PairingsBoard.tsx`: remove `safeRound !== safeCurrentRound` gate from `handleResultCycle`
- [ ] 1.3 In `PairingsBoard.tsx`: remove `isPublished` gate from `handleForfeitToggle`
- [ ] 1.4 In `PairingsBoard.tsx` Row component: set `resultDisabled = false` (always enabled)
- [ ] 1.5 In `PairingsBoard.tsx` Row component: set `isDraggable = true` (always draggable, even with result)

## 2. Unpublish draw button

- [ ] 2.1 Add `unpublishDraw()` action to `useTournamentForm.ts`: decrement `currentRound` (min 0), delete games for `currentRound + 1`
- [ ] 2.2 Export `unpublishDraw` from the hook's return object
- [ ] 2.3 Add `unpublishDraw` prop to `PairingsSection.tsx`
- [ ] 2.4 Render "Отменить жеребьёвку" button left of publish button, visible only when `safeActiveRound === safeCurrentRound && safeCurrentRound > 0`
- [ ] 2.5 Wire button click to `unpublishDraw()`
- [ ] 2.6 Pass `unpublishDraw` from `TournamentEditForm.tsx` to `PairingsSection`

## 3. Cumulative points calculation

- [ ] 3.1 Add `calculateParticipantPoints(games, participantId, upToRound, startingPoints)` to `pairingsModel.ts`
- [ ] 3.2 In `PairingsBoard.tsx`: compute points per participant via `calculateParticipantPoints` and pass to `SortableCard` as `points` prop
- [ ] 3.3 Pass `startingPoints` from participants to `PairingsBoard` (needed for calculation)
- [ ] 3.4 Add unit tests for `calculateParticipantPoints` (win, draw, bye, forfeit, accumulation)

## 4. StartingPoints inline editing

- [ ] 4.1 Add `startingPoints?: number` and `onStartingPointsChange?: (value: number) => void` props to `PlayerCard.tsx`
- [ ] 4.2 Wire the existing input in `PlayerCard.tsx` to `startingPoints`/`onStartingPointsChange` (display value, onChange callback)
- [ ] 4.3 When `startingPoints`/`onStartingPointsChange` are absent, hide both the input and points badge
- [ ] 4.4 Add `updateStartingPoints(participantId, value)` action to `useTournamentForm.ts`
- [ ] 4.5 Export `updateStartingPoints` from the hook's return object
- [ ] 4.6 In `PairingsBoard.tsx`: pass `startingPoints` and `onStartingPointsChange` to `SortableCard` → `PlayerCard`
- [ ] 4.7 In `PairingsSection.tsx` → `TournamentEditForm.tsx`: pass `updateStartingPoints` down to `PairingsBoard`

## 5. i18n

- [ ] 5.1 Add `pairings.unpublishDraw` and `pairings.startingPoints` keys to `src/locales/ru/translation.json`
- [ ] 5.2 Add the matching keys to `src/locales/en/translation.json`

## 6. Verification

- [ ] 6.1 Run `tsc -b` and resolve type errors
- [ ] 6.2 Run unit tests for `pairingsModel.ts` (including new `calculateParticipantPoints`)