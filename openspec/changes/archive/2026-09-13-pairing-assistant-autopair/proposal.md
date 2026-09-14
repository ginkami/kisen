## Why

The pairing tools drawer (`PairingToolsDrawer`) currently ships empty. The tournament host preparing round `publishedRounds + 1` of a Swiss tournament still has to pair every game by hand on the board. An automatic pairing assistant — with a safe, local Undo/Redo history — removes the most error-prone manual step of running a tournament.

## What Changes

- New pure pairing engine: automatic Swiss pairing of all currently unpaired participants of the active round via a weighted graph and the Edmonds blossom (maximum-weight matching) algorithm.
  - Hard constraints (edge removed): players already met; player already skipped a round (bye or forfeit); with `settings.considerSente == true` — a player would get a 3rd identical color in a row or a color balance beyond ±2.
  - Score-group dominance: exponential penalty on the points difference between opponents so it outweighs any other factor.
  - Rating subgroup emulation inside each score group: penalty for "wrong distance" in the rating list (upper subgroup vs lower subgroup).
  - Odd number of unpaired players: a virtual bye node; a player who already skipped a round is forbidden from another bye; the bye goes to the weakest remaining player.
  - Manual pairs/results already created in the round (including carried-over forfeits) are locked — the engine never touches them.
  - If a full pairing cannot be produced, a "Невозможно составить пары" alert is shown.
- New local Undo/Redo history for the active round's pairing states (games of the round) stored in IndexedDB, keyed by tournament and round. Every games-changing action on the round (auto-pairing result = one action, manual board edits, results) pushes a state. The history is cleared whenever the current round changes (publish / un-publish).
- New drawer UI tools in `PairingToolsDrawer`:
  - Undo (`BsArrowCounterclockwise`, tooltip «Отменить действие по подбору пар») and Redo (`BsArrowClockwise`, tooltip «Вернуть действие по подбору пар») buttons in one top row, disabled when no applicable saved state exists.
  - "Сформировать пары" button (`CgSwiss` icon) that runs the auto-pairing for all unpaired participants.
  - "Отменить пары" button at the bottom with a `ConfirmModal` confirm («Все пары {n}-го тура будут расформированы») that removes all games of the round.
- New i18n keys (`tournament.edit.pairingTools.*`) in `ru` and `en`.

## Capabilities

### New Capabilities
- `pairing-engine`: pure Swiss auto-pairing logic — player statistics, weighted-graph constraints and penalties, blossom matching, bye assignment, sente assignment, and simulation-level guarantees (no rematches, no double skips, full coverage).

### Modified Capabilities
- `tournament-management`: the empty pairing tools drawer gains functional requirements — undo/redo buttons with local per-round history, "generate pairings" action, failure alert, and "clear round pairings" action with confirm.

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md` (drawer requirements extended); new `openspec/specs/pairing-engine/spec.md`.
- **Affected code:**
  - new `src/components/tournament/pairings/blossom.ts` and `src/components/tournament/pairings/pairingEngine.ts` (pure, no new dependencies);
  - new `src/utils/pairingHistoryStorage.ts` (IndexedDB via `idb`, separate DB from draft storage);
  - new `src/hooks/usePairingHistory.ts`;
  - `src/components/tournament/PairingToolsDrawer.tsx` — tools UI, new props;
  - `src/components/tournament/TournamentEditForm.tsx` — pass data/callbacks and history-clearing effect on `publishedRounds` change;
  - new `src/components/AlertModal.tsx` (single-button dialog, same daisyUI dialog pattern as `ConfirmModal`);
  - `src/locales/ru/translation.json`, `src/locales/en/translation.json`;
  - new/updated tests: `blossom.test.ts`, `pairingEngine.test.ts` (including Swiss tournament simulations), `pairingHistoryStorage.test.ts`, `usePairingHistory.test.tsx`, `pairingToolsDrawer.test.tsx`, `tournamentEditFormAccess.test.tsx`.
