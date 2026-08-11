## Context

The pairings board (`PairingsBoard.tsx`) uses `@dnd-kit` for drag-and-drop pairing management. The `pairingsModel.ts` module contains pure functions that transform the `games` array. Two interaction gaps remain:

1. No way to swap two players within a row — currently requires unpair → re-pair.
2. The handicap button placeholder at line 587 of `PairingsBoard.tsx` renders a static `=` with no click handler.

The `Game.handicap` field already exists in the domain schema (`handicapSchema` in `src/domain/handicap.ts`) and is part of `gameSchema`. The `Handicap` type is `'-L' | '+B' | '-2p' | ... | null`.

## Goals / Non-Goals

**Goals:**
- Enable swapping player1 ↔ player2 within a pairing row via cross-column drag-and-drop
- Implement handicap cycling through all valid `HandicapCode` values with proper UI feedback

**Non-Goals:**
- No changes to `considerSente` behavior (already correct)
- No changes to result button behavior
- No changes to forfeit toggle behavior
- No schema changes — `Game.handicap` field already exists

## Decisions

### Decision 1: Swap detection via row-index comparison

In `handleDragEnd`, after resolving the `participantId` and the target container/index, compare the participant's current position (which column and row index) against the target. If the participant is in `players1[rowIndex]` and the target is `p2-row-{rowIndex}` (or vice versa), call `withPlayersSwapped` instead of `withParticipantDropped`.

Detection logic:
```
activeInP1 = containers.players1.indexOf(participantId)
activeInP2 = containers.players2.indexOf(participantId)
isSwap = (overId starts with 'p1-row-' && activeInP2 === parsedRowIndex)
       || (overId starts with 'p2-row-' && activeInP1 === parsedRowIndex)
```

Also handle the case where `overId` is a `p-{pid}` card: look up which column/row the target card is in, then compare.

### Decision 2: `withPlayersSwapped` — pure function in pairingsModel.ts

```typescript
export function withPlayersSwapped(
  allGames: Game[],
  round: number,
  rowIndex: number
): Game[]
```

- Filters pair-games (non-forfeit) for the round
- Swaps `player1` ↔ `player2` at `rowIndex`
- Flips `sente`: `player1` → `player2`, `player2` → `player1`, `unknown` unchanged
- Flips non-null `result`: `player1_won` ↔ `player2_won`, `draw` unchanged
- Preserves all other fields (`id`, `status`, `handicap`, `round`)
- Returns new array (immutably)

### Decision 3: Handicap cycling constants and function

```typescript
export const HANDICAP_CODES = ['L', 'B', 'R', 'RL', '2p', '4p', '5p', '6p', '8p', '10p'] as const

export const HANDICAP_CYCLE: (string | null)[] = [
  null,
  ...HANDICAP_CODES.map(c => `-${c}`),
  ...HANDICAP_CODES.map(c => `+${c}`),
]

export function handicapToSymbol(handicap: string | null): string {
  return handicap ?? '='
}

export function withHandicapCycled(allGames: Game[], gameId: string): Game[] {
  // Cycle to next index in HANDICAP_CYCLE
}
```

21 total states. The cycle order matches the schema order: first all `-` variants (player1 gives handicap), then all `+` variants (player2 gives handicap).

### Decision 4: UI — handicap button in `Row` component

The handicap button is rendered next to the result button in the `Row` component. It uses:
- `btn btn-xs` styling (same size as current placeholder)
- `btn-warning` class when `handicap != null` (visual distinction from neutral state)
- DaisyUI `tooltip` wrapper with `data-tip={t('tournament.edit.pairings.handicap')}`
- Same `disabled` condition as the result button (`resultDisabled` prop, which is currently always `false` but the prop structure is already in place)

### Decision 5: `handleHandicapCycle` wiring in PairingsBoard

```typescript
const handleHandicapCycle = useCallback(
  (gameId: string) => {
    onGamesChange(withHandicapCycled(games, gameId))
  },
  [games, onGamesChange]
)
```

Passed to `Row` as `onHandicapCycle` prop.

## Risks / Trade-offs

- **21-state cycle is long**: Users must click up to 20 times to reach a specific handicap. Acceptable because handicap is a rare per-game setting, not a frequent action. A dropdown/modal would be more complex without proportional UX benefit.
- **Swap detection complexity**: The detection must handle both drop-zone targets (`p1-row-N`, `p2-row-N`) and card targets (`p-{pid}`). The card-target case requires looking up the pid's position in `players1`/`players2` arrays.
