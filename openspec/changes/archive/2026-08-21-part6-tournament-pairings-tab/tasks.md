## 1. Pairings model — status lifecycle and mutations

- [x] 1.1 `src/components/tournament/pairings/pairingsModel.ts`: add `deriveGameStatus(game, currentRound)` (forfeit and bye stay stored; paired with result → `completed`; paired without result in the active round → `live`, otherwise → `not_started`) and `normalizeGame(game, currentRound)` that also re-applies the lone-game invariant (bye: `result` `'player1_won'` default or `'draw'`, `handicap: null`), reference-stable when nothing changes
- [x] 1.2 `withResultCycled`: add `direction` parameter (1 forward, -1 reverse, default 1); paired rows keep the 4-state cycle including `null`; bye rows cycle only between `'player1_won'` and `'draw'`, keeping `status: 'bye'`; derive the status after mutation
- [x] 1.3 `withHandicapCycled`: add `direction` parameter (1 forward, -1 reverse, default 1) with wrap-around in both directions
- [x] 1.4 Add `withHandicapReset(games, gameId)` setting `handicap` to `null`
- [x] 1.5 `withParticipantDropped`: add optional `currentRound` parameter (default 0); dropping a participant into `unpaired` while the active round is a past round creates a deduplicated `forfeit` game; derive statuses on all written games; pair completion derives `'live'`/`'not_started'` instead of hard-coded `'not_started'`
- [x] 1.6 Add `withAutoForfeits(games, participants, round, currentRound, considerSente)` — idempotent forfeit games for every participant with no game in a past round (same array reference when nothing to add)
- [x] 1.7 `calculateParticipantPoints`: a bye contributes its result value (1 for `'player1_won'` or absent, 0.5 for `'draw'`)

## 2. PairingsBoard UI

- [x] 2.1 `src/components/tournament/PairingsBoard.tsx`: pass `currentRound` from the form state into the model mutations (drops, result/handicap cycling, auto-forfeits)
- [x] 2.2 Auto-forfeit effect: when the active round is strictly earlier than `currentRound`, apply `withAutoForfeits` via `updateGames` (idempotent; no state update when nothing changes)
- [x] 2.3 Result button: `onContextMenu` reverse cycling with `preventDefault()`; enabled for bye rows, disabled for forfeit rows (split the shared disabled predicate)
- [x] 2.4 Handicap button: `onContextMenu` reverse cycling; `onDoubleClick` reset to `null` with a ~250 ms deferred single click (timer cancelled by the double click and the context menu); disabled for lone games (`player2 == null`, bye and forfeit)
- [x] 2.5 Verify the board renders past rounds correctly with auto-forfeit games (forfeit rows excluded from row indexing, unpaired container empty)

## 3. Crosstable model and section

- [x] 3.1 `src/components/tournament/crosstable/crosstableModel.ts` `parseCellInput`: return a `'bye_draw'` sentinel for standalone `=`; keep `+` and `-` behavior
- [x] 3.2 `CELL_PARTIAL_RE`: accept standalone `=` as a valid input prefix
- [x] 3.3 `withCellEdited`: map `+` to a bye with `result = 'player1_won'` (bugfix), `=` to a bye with `result = 'draw'`, `-` to a forfeit; derive statuses via the shared `deriveGameStatus` instead of hard-coded `'not_started'`; accept a `currentRound` parameter (default 0)
- [x] 3.4 `gameToCellInput` and cell rendering: a win bye serializes/renders as `+`, a draw bye as `=`
- [x] 3.5 `calcWinsCount` counts a bye only when its result is a win; `points` gives draw byes 0.5
- [x] 3.6 `src/components/tournament/CrosstableSection.tsx`: pass `currentRound` into `withCellEdited`

## 4. Form hook normalization

- [x] 4.1 `src/hooks/useTournamentForm.ts` `updateGames`: normalize the edited round through `normalizeGame`
- [x] 4.2 `publishDraw`: re-derive statuses for the published round (result-less games become `'live'`)
- [x] 4.3 `unpublishDraw`: re-derive statuses (result-less games become `'not_started'`)

## 5. Tests

- [x] 5.1 `src/test/pairingsModel.test.ts`: deriveGameStatus/normalizeGame matrix; result cycling in both directions including the bye cycle; handicap cycling in both directions and reset; past-round unpaired drop creates a forfeit; `withAutoForfeits` idempotency; bye points 1 / 0.5
- [x] 5.2 `src/test/crosstableModel.test.ts`: standalone `=` parsing; `CELL_PARTIAL_RE` accepts `=`; `+` produces a bye with `'player1_won'` (bugfix); `=` produces a bye-draw game; bye-draw serialization roundtrip; wins count with draw byes
- [x] 5.3 Run `npx vitest run` and the project type-check — everything green

## 6. Verification

- [x] 6.1 Manual QA in the browser (draft tournament fixture): past-round auto-forfeits, right-click reverse cycling, double-click handicap reset, crosstable `=` and `+` inputs, bye-draw rendering
- [ ] 6.2 Mark tasks complete and archive the change via /opsx:archive after user acceptance

## 7. Bugfix round (post-QA)

- [x] 7.1 `CrosstableSection.tsx` `roundCell`: bye cell renders `=` for draw bye (was always `+`)
- [x] 7.2 `PairingsBoard.tsx`: remove `safeRound !== safeCurrentRound` from result/handicap disabled predicates — buttons enabled in all rounds (consistent with part-2 "unlock editing" philosophy)
- [x] 7.3 `PairingsBoard.tsx` `handleDragEnd`: add `safeCurrentRound` to `useCallback` deps (fixes latent stale-closure risk for past-round forfeit creation)
- [x] 7.4 `PlayerCard.tsx`: add `toggleDisabled` prop; `PairingsBoard.tsx`: pass `forfeitToggleDisabled={isPastRound}` in the unpaired container (past rounds only)
- [x] 7.5 `PairingsBoard.tsx` `handleHandicapClick`: clear pending timer before scheduling a new one (fixes double-click advancing the cycle after reset)
- [x] 7.6 `pairingsModel.ts` `withHandicapReset`: return same array reference when handicap already null (reference-stability)
- [x] 7.7 `src/test/pairingsModel.test.ts`: add missing tests — `deriveGameStatus`/`normalizeGame` matrix, `withHandicapReset` reference-stability, `withAutoForfeits` idempotency/no-op/sente, past-round unpaired drop full chain (withParticipantDropped → sortRoundGamesByPairStrength → normalizeGame)
- [x] 7.8 Update openspec docs: spec.md (remove round-level disabled scenarios, add forfeit-toggle requirement), design.md decision 7 (round-independent predicates)

## 8. Bugfix round 3 (post-QA)

- [x] 8.1 `pairingsModel.ts` `withParticipantDropped`: when dropping a participant into `players1`/`players2`, remove their forfeit game for the round (a participant cannot have two games in the same round)
- [x] 8.2 `PairingsBoard.tsx` `handleHandicapClick`: use `e.detail >= 2` in onClick for double-click reset (more reliable than onDoubleClick across browsers/environments); keep onDoubleClick as fallback
- [x] 8.3 `src/test/pairingsModel.test.ts`: update 'forfeit game at index 0 does not shift row indices for drop' (drop non-forfeited participant); add tests for forfeited participant joining a pair (current + past round)
- [x] 8.4 `src/test/pairingsBoard.test.tsx`: new component test — single click cycles handicap after 250ms delay; double click resets handicap to null without advancing the cycle
- [x] 8.5 Update openspec spec.md: add forfeit-game removal rule to drag-and-drop requirement

## 9. Bugfix round 4 (post-QA)

- [x] 9.1 `pairingsModel.ts` `withPlayersSwapped`: change signature from `(allGames, round, rowIndex)` to `(allGames, gameId)` — identify the game by id instead of display row index; reference-stable no-op for bye/unknown id
- [x] 9.2 `PairingsBoard.tsx` `handleDragEnd` swap branch: pass `containers.games[targetIndex].id` to `withPlayersSwapped`; wrap result in `sortRoundGamesByPairStrength` for storage-order consistency with the drop path
- [x] 9.3 `src/test/pairingsModel.test.ts`: update all `withPlayersSwapped` call sites to id-based API; add regression tests — swap by id with misaligned storage order (tournament2-like), bye between pairs in storage does not interfere, reference-stability for bye/unknown id

## 10. Bugfix round 5 (post-QA)

- [x] 10.1 `pairingsModel.ts` `withPlayersSwapped`: remove sente flip — sente stays attached to the position (unchanged); under the project invariant (sente ≡ 'player1' when considerSente), the sente holder swaps with the cards; crosstable ☗/☖ symbols reflect the swap immediately without saving
- [x] 10.2 `src/test/pairingsModel.test.ts`: update sente tests (sente preserved after swap); add regression test — considerSente invariant: sente stays 'player1', formStateToUpdateInput forcing is a no-op
- [x] 10.3 Update openspec spec.md swap requirement: replace "flip sente" with "sente attached to position (unchanged)"