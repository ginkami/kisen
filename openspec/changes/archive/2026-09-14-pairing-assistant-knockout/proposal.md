## Why

The pairing assistant currently supports only Swiss-style auto-pairing. Tournament hosts also run single-elimination (knockout) stages — typically after a Swiss phase — and today they must pair every knockout round by hand. A dedicated "Сформировать пары 1/{n} финала" action on the pairing assistant drawer automates canonical knockout rounds while coexisting with the Swiss tools.

## What Changes

- New pure knockout engine (`knockoutEngine.ts`):
  - `analyzeKnockoutBracket` — detects whether the published rounds form a strict single-elimination bracket for ALL participants (canonical seeding round + bracket-tree continuation with losers recorded as forfeit games), returning the bracket for continuation.
  - `generateKnockoutPairings` — forms the knockout round for `publishedRounds + 1`:
    - **Bracket continuation**: if a strict bracket exists and the current round's manual pairs don't break it, the bracket's next-round pairs are formed for remaining active players.
    - **Canonical knockout round 1** (otherwise): all participants (minus those with manual forfeit games in the current round — they are considered eliminated) are sorted by points (then rating), padded abstractly to the next power of two with BOTTOM virtual seeds, and strictly seeded (1 vs last, …). Games against virtual seeds become byes (`status: 'bye'`, `result: 'player1_won'`) — byes always go to TOP seeds. Manual pairs are kept (approximation); the remaining players are seeded canonically.
    - Every eliminated player receives a lone forfeit game (`status: 'forfeit'`, `result: 'player2_won'`) in the formed round.
    - `PairingError` when the manual pre-pairing makes a canonical knockout impossible.
- New drawer button `BsDiagram2Fill` "Сформировать пары 1/{{n}} финала" under the Swiss "Сформировать пары" button, where `n` = pairs + byes of the round = number of active players after the round (bracket size / 2). The button is not gated by the Swiss `actionsDisabled` condition. The action applies via a single `updateGames` call (one Undo/Redo action).

## Capabilities

### New Capabilities
- `knockout-engine`: pure single-elimination logic — strict bracket analysis of played rounds, canonical seeding with bottom virtual padding (byes to top seeds), bracket-tree continuation, elimination via forfeit games, and the `1/{n} финала` computation.

### Modified Capabilities
- `tournament-management`: the pairing tools drawer gains the knockout generation button (`BsDiagram2Fill`, label with the computed `1/{n} финала`), not blocked by the Swiss completeness condition, with `PairingError` alert on impossible canonical knockout.

## Impact

- **Affected specs:** new `openspec/specs/knockout-engine/spec.md`; `openspec/specs/tournament-management/spec.md` (ADDED knockout button requirement).
- **Affected code:**
  - new `src/components/tournament/pairings/knockoutEngine.ts` (pure; reuses `calculateParticipantPoints`);
  - `src/components/tournament/PairingToolsDrawer.tsx` — new button + handler;
  - `src/locales/{ru,en}/translation.json` — `generateKnockout` label;
  - tests: new `knockoutEngine.test.ts` (canonical rounds for 6/7/8 players, bracket continuation, eliminations, manual pairs approximation, label `n`), `pairingToolsDrawer.test.tsx` extensions.
