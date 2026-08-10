## Why

Part 1 (`part1-tournament-pairings-tab`) delivered the pairings tab with drag-and-drop pairing, publish draw, result entry, and forfeit toggle. However, several usability gaps remain: arbiters cannot edit pairings after publication, cannot undo a published draw, cannot see participant points, and cannot adjust `startingPoints` directly from the pairing board. These are essential for real tournament management workflows.

## What Changes

- **Unlock editing after publication:** Remove all `isPublished` / `round !== currentRound` gates from drag-and-drop, result cycling, and forfeit toggle. Arbiters can freely rearrange pairs and change results in any round at any time. When a card with a result is unpairеd, the game is deleted.
- **Add "Отменить жеребьёвку" / "Unpublish draw" button:** Visible only for the active round (`safeActiveRound === safeCurrentRound && safeCurrentRound > 0`), placed left of the "Жеребьёвка опубликована" button. Clicking it deletes any games for `currentRound + 1` and decrements `currentRound` by 1 (minimum 0).
- **Cumulative points calculation:** Each participant card displays cumulative points = `startingPoints` + points earned from game results across all rounds up to and including the current round. Points: win = 1, draw = 0.5, bye = 1, forfeit = 0.
- **`startingPoints` input:** The input in `PlayerCard` is wired to `participant.startingPoints` via a callback. Editing it updates `startingPoints` for that participant across all rounds and recalculates cumulative points. The input and points badge are shown only in the pairings tab; other `PlayerCard` call sites (`PlayerSearchPanel`) do not show them.
- Add i18n keys for "Отменить жеребьёвку" / "Unpublish draw" and "Очки" / "Points" tooltip.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-management`: pairings board unlock after publication, unpublish draw action, cumulative points display, and `startingPoints` inline editing.

## Impact

- **Form state hook** (`src/hooks/useTournamentForm.ts`): add `unpublishDraw()` and `updateStartingPoints(participantId, value)` actions.
- **PairingsBoard** (`src/components/tournament/PairingsBoard.tsx`): remove all `isPublished` gates, pass cumulative points and `startingPoints` to cards.
- **PairingsSection** (`src/components/tournament/PairingsSection.tsx`): add unpublish button, pass new props.
- **pairingsModel** (`src/components/tournament/pairings/pairingsModel.ts`): add `calculateParticipantPoints()`.
- **PlayerCard** (`src/components/player/PlayerCard.tsx`): wire `startingPoints` input to callback, display cumulative points badge.
- **i18n**: `pairings.unpublishDraw`, `pairings.startingPoints` tooltip in both `ru` and `en`.