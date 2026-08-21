## 1. Pairings model — lone game invariant and pair breaking

- [x] 1.1 Add a lone-game normalization helper in `src/components/tournament/pairings/pairingsModel.ts` that enforces `player2 == null && status != 'forfeit'` → `status: 'bye'`, `result: 'player1_won'`, `handicap: null`, and use it in every mutation path that creates or leaves a lone game
- [x] 1.2 Fix `withParticipantDropped`: a drop into the `players2` zone of an empty row creates a lone game with the dropped participant stored as `player1` (never `player2`)
- [x] 1.3 Fix pair breaking in `withParticipantDropped`: removing one member of a pair keeps the game in place with the remaining partner as lone `player1` (game `id` and `round` preserved, invariant applied); the game is deleted only when the last player of a lone game is removed

## 2. Sorting

- [x] 2.1 Change the pair-strength sort to use points earned strictly before the active round (`upToRound = round - 1`) in `sortRoundGamesByPairStrength` call sites (`handleDragEnd`)
- [x] 2.2 Sort paired rows at render time in `containersFromGames` with the same points-before-round + rating comparator so display order never depends on storage order

## 3. Extra empty rows

- [x] 3.1 In `PairingsBoard`, render `max(game rows, ceil((placed participants + unpaired participants) / 2))` rows so every unpaired participant always has a free drop slot; extra rows are display-only (no `Game` objects created)

## 4. UI disabled states

- [x] 4.1 Disable the result and handicap buttons for lone rows (`game.player2 == null`) in addition to the existing `activeRound !== currentRound` condition
- [x] 4.2 Scope the card lock to paired games (`player2 != null && result != null`) so lone (bye) cards remain draggable

## 5. Tests

- [x] 5.1 Unit tests in `src/test/pairingsModel.test.ts`: paired-row sorting uses points earned before the round — results entered in the active round do not change row order
- [x] 5.2 Unit tests: `containersFromGames` returns paired rows sorted regardless of `games` storage order
- [x] 5.3 Unit tests: dropping into the `players2` slot of an empty row creates a lone game with the participant as `player1` and invariant field values
- [x] 5.4 Unit tests: breaking a pair keeps the partner as a lone game with invariant values and preserved id/round; removing the last player of a lone game deletes it; forfeit games are not rewritten
- [x] 5.5 Unit tests: the derived row count equals `max(game rows, ceil((placed + unpaired) / 2))`
- [x] 5.6 Component tests: result and handicap buttons are disabled for lone rows; lone-game cards stay draggable

## 6. Verification

- [x] 6.1 Run the full test suite (`npx vitest run`) and TypeScript build; fix any regressions in parts 1-4 tests caused by the new lone-game `result` value
- [x] 6.2 Manual browser verification of the drag-and-drop flows (empty-row drop from `players2`, pair breaking, extra rows, disabled buttons) — tournament fixture with player data is not in the repo, so this needs a live draft

## 7. Manual QA fixes (tournament fixture)

_Artifacts revised 2026-08-20 after manual QA of the implemented board; implementation complete._

- [x] 7.1 `withParticipantDropped`: build the row basis from the displayed order - the round's non-forfeit games sorted with the same comparator as `containersFromGames` (extract one shared comparator used by both) - with auto-forfeit games kept outside row indexing and returned unchanged
- [x] 7.2 Pair-completion branch: reset `result` to `null` and set `status` to `'not_started'` when a lone game gains its `player2` (`handicap` stays `null`), so the result and handicap buttons unlock via the existing lone-game disabled predicate
- [x] 7.3 Fix the post-drop sort in `handleDragEnd`: call `sortRoundGamesByPairStrength` for the active round (not `safeRound - 1`) with points earned strictly before it (`upToRound = round - 1`), aligned with `containersFromGames`
- [x] 7.4 Remove the card lock (`isCardLocked`) in `PairingsBoard` - cards are always draggable, including paired games with recorded results and lone games
- [x] 7.5 Always render at least one empty row at the bottom: `extraRows = max(1, neededRows - gameRows)`; remove the `gameRows === 0` special case
- [x] 7.6 `EmptyRow`: show the drop hint (`tournament.edit.pairings.dropHere`) only in the `players1` zone; the `players2` zone stays a valid drop target with no hint
- [x] 7.7 Update `src/test/pairingsModel.test.ts` with fixture-based cases: dropping into the `players2` zone of a displayed lone row completes the pair (`result` reset to `null`, game `id` preserved, no extra row appended); forfeit games do not shift row indices; active-round results do not reorder rows (fix the vacuous test that passes `1` as the round for round-2 games); `containersFromGames` storage-order independence
