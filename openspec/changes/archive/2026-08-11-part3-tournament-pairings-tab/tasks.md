## 1. Auto-forfeit for late joiners

- [x] 1.1 In `useTournamentForm.ts` `addParticipant`: generate participant id immediately (use counter) and store in `ParticipantRow.id`
- [x] 1.2 Update `rowsToParticipants` to preserve `id > 0` values (don't reassign)
- [x] 1.3 In `addParticipant`: when `state.currentRound > 0`, create forfeit games (`status='forfeit'`, `result='player2_won'`) for rounds `1..currentRound` with `player1` = new participant id
- [ ] 1.4 Add unit tests for auto-forfeit creation

## 2. Persistent forfeit across rounds

- [x] 2.1 Verify `containersFromGames` already preserves forfeit games (no changes needed)
- [ ] 2.2 Add unit test: participant with forfeit in round N appears in unpaired for round N+1
- [x] 2.3 Verify `withForfeit` works correctly in the new round context

## 3. Sort unpaired by points and rating

- [x] 3.1 Inline sort logic in `containersFromGames` for the `unpaired` array (no separate function)
- [x] 3.2 Unpaired sorted by descending cumulative points, then descending `capturedRating.value`
- [ ] 3.3 Add unit tests for unpaired sorting

## 4. Sort paired rows by max points and rating

- [x] 4.1 Add `sortRoundGamesByPairStrength(allGames, participants, round)` to `pairingsModel.ts`
- [x] 4.2 Call `sortRoundGamesByPairStrength` in `handleDragEnd` after `withParticipantDropped` (not in `containersFromGames` — to avoid breaking DnD)
- [x] 4.3 Sorting excludes bye-plays in current round via `excludeByesInRound` parameter in `calculateParticipantPoints`
- [ ] 4.4 Add unit tests for paired row sorting

## 5. DnD architecture

- [x] 5.1 Pairing rows (`p1-row-N`, `p2-row-N`) use `DropZone` (useDroppable only, no SortableContext)
- [x] 5.2 `unpaired` container uses `SortableContainer` (useDroppable + SortableContext)
- [x] 5.3 Drop in occupied slot appends new row instead of swap

## 6. Verification

- [x] 6.1 Run `tsc -b` and resolve type errors
- [x] 6.2 Run unit tests for `pairingsModel.ts` (39/39 pass)