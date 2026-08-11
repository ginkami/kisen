## Why

The pairings board lets arbits arrange participants into round pairings, but two key interaction gaps remain:

1. Swapping the two players within a pairing row currently requires dragging one card to unpaired, then dragging it back into the opposite column — tedious and error-prone.
2. There is no way to record a handicap (фора) for a game. The handicap button placeholder exists in the UI but does nothing.

`considerSente` already works correctly (`createEmptyGame` and `withForfeit` set `sente: considerSente ? 'player1' : 'unknown'`), so no change is needed for requirement #1 from the original request.

## What Changes

- **Swap within a row**: Dragging a card from `p1-row-N` to `p2-row-N` (or vice versa, same row index) swaps the two players in the game, flips `sente`, and flips the result (`player1_won` ↔ `player2_won`, draw unchanged). Eliminates the manual unpair → re-pair workflow.
- **Handicap cycling button**: The existing `=` button in each pairing row becomes a cycling button through all `Handicap` values from `schemas/handicap.ts`: `null → -L → -B → -R → -RL → -2p → -4p → -5p → -6p → -8p → -10p → +L → +B → +R → +RL → +2p → +4p → +5p → +6p → +8p → +10p → null`. The button displays the current handicap code (or `=` for no handicap) and carries a DaisyUI tooltip "Игра с форой" / "Game with handicap".

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tournament-management`: Add swap-within-row behavior to the pairings board drag-and-drop; add handicap cycling to the per-row button.

## Impact

- **`src/components/tournament/pairings/pairingsModel.ts`** — new pure functions: `withPlayersSwapped`, `withHandicapCycled`, constants `HANDICAP_CYCLE`, helper `handicapToSymbol`
- **`src/components/tournament/PairingsBoard.tsx`** — swap detection in `handleDragEnd`; handicap button wiring in `Row` component with tooltip
- **`src/locales/{ru,en}/translation.json`** — new key `tournament.edit.pairings.handicap`
- **`src/test/pairingsModel.test.ts`** — unit tests for `withPlayersSwapped` and `withHandicapCycled`
