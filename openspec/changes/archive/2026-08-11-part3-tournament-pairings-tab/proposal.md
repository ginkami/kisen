## Why

Parts 1 and 2 delivered the pairings tab with drag-and-drop, publish/unpublish, cumulative points, and startingPoints editing. However, real tournament workflows require automatic forfeit assignment for late joiners, persistent forfeit across rounds, and automatic sorting of unpaired/paired cards by points and rating — all of which are currently manual or absent.

## What Changes

- **Auto-forfeit for new participants in past rounds:** When a new participant is added and `currentRound > 0`, automatically create `forfeit` games (`result = 'player2_won'`, `status = 'forfeit'`) for that participant in all rounds `1..currentRound`.
- **Persistent forfeit in unpaired:** When a participant with a forfeit game in the previous round appears in the unpaired container of the next round, they retain the forfeit game (it is not deleted). The forfeit game persists in `games` for the current round.
- **Sort unpaired by points and rating:** The unpaired container cards are automatically sorted by descending cumulative points (primary) and descending `capturedRating.value` (secondary).
- **Sort paired rows by max points and rating:** Paired rows are automatically sorted by descending max cumulative points of the pair (primary) and descending max `capturedRating.value` of the pair (secondary).
- Add i18n keys if needed (likely none — purely behavioral).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-management`: auto-forfeit for late joiners, persistent forfeit in unpaired, automatic sorting of unpaired and paired containers.

## Impact

- **Form state hook** (`src/hooks/useTournamentForm.ts`): `addParticipant` creates forfeit games for past rounds when `currentRound > 0`.
- **Pairings domain helpers** (`src/components/tournament/pairings/pairingsModel.ts`): `containersFromGames` sorts unpaired and paired arrays by points/rating; new `sortUnpaired` and `sortPairedRows` helpers.
- **PairingsBoard** (`src/components/tournament/PairingsBoard.tsx`): no changes needed (sorting is in `containersFromGames`).