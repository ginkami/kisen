## 1. History storage and hook

- [x] 1.1 Rework `src/utils/pairingHistoryStorage.ts`: per-tournament key (no round suffix), snapshot `{ games: Game[], publishedRounds: number, participants: Participant[] }`, cap 50, dedupe-before-truncate, remove `clearPairingHistory`; API: `getPairingHistory(tournamentId)`, `pushPairingState(tournamentId, snapshot)`, `undoPairingState`, `redoPairingState`
- [x] 1.2 Rework `src/hooks/usePairingHistory.ts`: `usePairingHistory(tournamentId)` with `canUndo`/`canRedo` and `push`/`undo`/`redo` returning/accepting snapshots
- [x] 1.3 Update `src/test/pairingHistoryStorage.test.ts` and `src/test/usePairingHistory.test.tsx` for the new contract (snapshot shape, dedupe, cap, undo/redo, no clearing)

## 2. Form integration

- [x] 2.1 Add `restorePairingSnapshot(games, publishedRounds, participants)` to `src/hooks/useTournamentForm.ts`: normalized state update + participant reconciliation (keep current internal attributes for existing participants; apply `player`/`startingPoints` from snapshot; restore missing participants from snapshot; drop extras) + auto-save via `saveMutation.mutate(next)` only when `publishedRounds` changes
- [x] 2.2 `TournamentEditForm.tsx`: replace `trackedUpdateGames` + history-clearing effect with a snapshot-recording effect (signature over `games`, `publishedRounds`, participants projection `{ id, player, startingPoints }`); keep `PairingsSection`/`CrosstableSection` on the raw `updateGames`
- [x] 2.3 `TournamentEditForm.tsx`: undo/redo handlers apply snapshots via `restorePairingSnapshot`; availability condition widens to `pairings`/`crosstable` tabs of an `ongoing` tournament; sticky `FaPeopleArrows` tab gains the tooltip (`pairingTools.open`)

## 3. Drawer

- [x] 3.1 `PairingToolsDrawer.tsx`: `actionsDisabled` (useMemo) — any round `1..publishedRounds` with a result-less game or a participant without a game; disable "Сформировать пары" and "Отменить пары" (never Undo/Redo)

## 4. i18n

- [x] 4.1 `src/locales/{ru,en}/translation.json`: undo/redo tooltip texts («Отменить/Вернуть изменение состояния игр турнира»); ru `pairingTools.open` → «Открыть панель жеребьёвки»

## 5. Tests and validation

- [x] 5.1 Update `src/test/pairingToolsDrawer.test.tsx`: disabled generate/clear while earlier rounds incomplete; undo/redo stay enabled
- [x] 5.2 Update `src/test/tournamentEditFormAccess.test.tsx`: drawer available on every pairings round sub-tab and on the crosstable tab (sticky tab only); unavailable on other tabs
- [x] 5.3 Run `tsc -b`, `eslint .`, `vitest run`; fix regressions
