## 1. Blossom algorithm

- [x] 1.1 Create `src/components/tournament/pairings/blossom.ts`: maximum-weight general matching (Edmonds blossom, O(n³)) — API `maxWeightMatching(n, edges: {u, v, w}[]): number[]` returning the mate of each vertex (−1 when unmatched); support odd cycle shrinking/augmentation; no new dependencies
- [x] 1.2 Create `src/test/blossom.test.ts`: known small graphs (path, even cycle, triangle with odd cycle, disconnected graph, negative-weight edges left unmatched, empty graph), maximum-weight correctness against brute force for small n

## 2. Pairing engine

- [x] 2.1 Create `src/components/tournament/pairings/pairingEngine.ts`: player statistics builder — points per participant (published rounds only, via `calculateParticipantPoints` semantics), played-opponent set, skip count (bye/forfeit), color history (balance, consecutive same-color tail) when `considerSente`
- [x] 2.2 Implement weight matrix: exponential score penalty `2^(10·|Δpts|)`, bounded rating penalties (subgroup split inside score groups + closeness tie-break), forbidden-edge removal (rematch, color constraints in both orientations), virtual bye vertex (forbidden for prior skippers, penalty favoring weakest)
- [x] 2.3 Implement `generatePairings(...)`: run blossom, require full coverage, throw `PairingError` otherwise; build new `Game[]` (uuidv7 ids, `status: 'not_started'`, bye games per lone-game invariant); deterministic sente assignment (balance → consecutive → rating position → id; round 1: higher rating)
- [x] 2.4 Export engine types (`PairingError`, `PairingStats`, options interface) and keep all functions pure
- [x] 2.5 Create `src/test/pairingEngine.test.ts`: unit tests per rule — rematch forbidden, no second bye/forfeit skip, color constraints applied/ignored per `considerSente`, score dominance over rating, subgroup alignment, weakest-player bye, locked participants untouched, deterministic double-run, `PairingError` on impossible input

## 3. Simulation tests

- [x] 3.1 Create `src/test/pairingSimulation.test.ts`: simulate full Swiss tournaments (N ∈ {8, 9, 16, 33} participants, 5–7 rounds, seeded pseudo-random results, auto-pairing each round)
- [x] 3.2 Assert invariants every round: no rematches, no double skips, full coverage (exactly one bye when odd), color constraints when `considerSente`, score-group respect; cover both `considerSente` values

## 4. Local history (Undo/Redo)

- [x] 4.1 Create `src/utils/pairingHistoryStorage.ts`: DB `kisen-pairing-history` v1, store `pairingHistory`, key `«tournamentId»:«round»`, value `{ entries: { games: Game[] }[], index: number, savedAt }`; API: `pushPairingState`, `undoPairingState`, `redoPairingState`, `clearPairingHistory`, `hasUndo`/`hasRedo` getters; redo-tail truncation on push, cap 50 entries; degrade to no-op when IndexedDB is unavailable
- [x] 4.2 Create `src/hooks/usePairingHistory.ts`: mirror `canUndo`/`canRedo` in React state, async `push`/`undo`/`redo`/`clear` actions, reload-safe
- [x] 4.3 Create `src/test/pairingHistoryStorage.test.ts` and `src/test/usePairingHistory.test.tsx`: push/undo/redo/redo-tail-discard/cap/clear semantics (mock or fake-indexeddb as available)

## 5. UI: AlertModal and PairingToolsDrawer

- [x] 5.1 Create `src/components/AlertModal.tsx`: single-button daisyUI `dialog.modal` (same pattern as `ConfirmModal`), props `{ isOpen, title, message, confirmText, onClose }`
- [x] 5.2 Verify `CgSwiss` exists in `react-icons/cg`; otherwise pick the closest available icon and note the deviation in the change notes
- [x] 5.3 Extend `PairingToolsDrawer.tsx` with new props `{ tournamentId, round, participants, games, publishedRounds, considerSente, updateGames }`; render top row (undo/redo `btn-ghost btn-sm btn-circle` + `tooltip tooltip-left`, disabled per history), `CgSwiss` "Сформировать пары" (`btn btn-primary`, spinner while computing), spacer, bottom "Отменить пары" (`btn-outline btn-error`)
- [x] 5.4 Wire actions: generate → `generatePairings` + merge with existing round games + single `updateGames` + history push; failure → `AlertModal` «Невозможно составить пары»; clear → `ConfirmModal` (variant `error`, «Все пары {n}-го тура будут расформированы») → `updateGames(round, [])`; undo/redo → restore snapshot via `updateGames`
- [x] 5.5 Add i18n keys `tournament.edit.pairingTools.{undo,redo,generate,generating,clear,clearConfirmTitle,clearConfirmMessage,pairingFailedTitle,pairingFailed,alertOk}` in `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 6. Integration

- [x] 6.1 Wire `TournamentEditForm.tsx`: pass the new props to `PairingToolsDrawer`; record history entries on every `updateGames` call for the active round (wrap the updater passed to the drawer/board); add a `useEffect` clearing the pairing history when `publishedRounds` changes
- [x] 6.2 Update `src/test/tournamentEditFormAccess.test.tsx` outlet-context doubles if the form-level interface changed

## 7. Tests and validation

- [x] 7.1 Extend `src/test/pairingToolsDrawer.test.tsx`: buttons render with tooltips, disabled states per history, generate invokes the engine and `updateGames` once, alert modal on failure, confirm flow for "Отменить пары"
- [x] 7.2 Run `tsc -b`, `eslint .`, `vitest run` and fix all regressions
