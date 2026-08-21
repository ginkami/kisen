## Context

The pairings tab (parts 1-4) renders a per-round board in `PairingsBoard.tsx` from pure helpers in `src/components/tournament/pairings/pairingsModel.ts`: `containersFromGames` derives the `unpaired` / `players1` / `players2` containers, `withParticipantDropped` applies drag-and-drop mutations to `formState.tournament.games`, and `handleDragEnd` re-sorts games via `sortRoundGamesByPairStrength`. Five defects were diagnosed:

1. `sortRoundGamesByPairStrength` is called with `upToRound = round`, so a round's own (possibly partial) results influence its own row order; `containersFromGames` does not sort paired rows at all, so display follows storage order between drops.
2. `withParticipantDropped` silently ignores a `players2`-zone drop onto an empty row — a pair cannot be seeded from the right column.
3. The board renders only as many rows as there are games; when unpaired players outnumber free slots, there is nowhere to drop them.
4. Removing `player1` from a paired game deletes the whole `Game` (the partner loses their row); other break paths leave stray `result` / `status` values.
5. Lone games (`player2 == null`) have no enforced shape: byes are stored with `result = null`, and the result/handicap buttons stay clickable on lone rows.

A manual QA pass on the implemented board (draft tournament fixture: 4 participants, 3 rounds, round 2 in preparation with one scored pair and one lone game) exposed five further defects: (a) a drop into the `players2` zone of a displayed lone row missed the pair-completion branch, because `withParticipantDropped` indexes rows in storage order (auto-forfeit games included) while `containersFromGames` sorts them for display; (b) the post-drop sort in `handleDragEnd` is called with `safeRound - 1`, so the active round's stored order is never normalized; (c) pair completion keeps the stale lone-game `result: 'player1_won'`, leaving the row's controls disabled; (d) cards of scored pairs are locked (`player2 != null && result != null`), blocking manual corrections; (e) empty rows show a `players2` drop hint although lone players are always displayed in `players1`, and the board can render no empty row at all when everyone is placed.

## Goals / Non-Goals

**Goals:**

- Pair rows ordered by standings **before** the active round (points over rounds `1..round-1`, then rating), applied consistently at render time.
- Drops into the `players2` slot of an empty row create a lone game with the participant stored as `player1`.
- The board always renders enough empty rows for every unpaired participant to have a free slot.
- Breaking a pair keeps the remaining partner in place as a lone game with normalized field values.
- A lone-game invariant (`status: 'bye'`, `result: 'player1_won'`, `handicap: null`) is maintained by all model mutations; result/handicap buttons are disabled for lone rows.
- Participant cards remain draggable at all times; the card lock is removed.

**Non-Goals:**

- Changing the `Game` / `Tournament` domain schemas or Firestore persistence.
- Automatic pairing algorithms (the board stays fully manual).
- Behaviors already covered by parts 1-4: swap-by-cross-drop, auto-forfeit for late joiners, unpublish draw.
- Data migration of previously stored games (normalization happens lazily on the next board interaction that touches a game).

## Decisions

1. **Points window for row sorting = rounds `1..round-1`.** A round's ordering must reflect standings *entering* the round; including the round's own results is self-referential (rows would shuffle as results are entered). Alternative rejected: keep `upToRound = round` (current, buggy behavior).
2. **Sort on render, not only on drop.** `containersFromGames` sorts paired rows with the same comparator, so display order never depends on storage order; the post-drop sort in `handleDragEnd` remains only to persist a normalized order. Alternative rejected: display-only sorting without persisting (storage order would keep drifting).
3. **`players2`-drop on an empty row creates a lone game stored as `player1`.** Lone players always occupy `player1`, so every consumer (rendering, points, invariant) has a single representation. Alternative rejected: storing as `player2` (breaks the lone-game invariant and complicates all consumers).
4. **Empty-row padding formula.** Displayed rows = `max(game rows, ceil((placed participants + unpaired participants) / 2))`. Extra rows are display-only; no `Game` objects are created until a drop.
5. **Pair break keeps the game.** `withParticipantDropped` reduces the game to a lone game: the remaining partner becomes `player1` (game `id` and `round` preserved), then the lone-game invariant is applied. The game is deleted only when the lone game's last player leaves.
6. **Lone-game invariant is scoped to non-forfeit games.** Auto-forfeit games legitimately have `player2 == null` with `status: 'forfeit'`, `result: 'player2_won'` and are exempt. All board-managed lone games use `status: 'bye'` + `result: 'player1_won'` + `handicap: null`, so the bye point is carried by the standard `result` field and points/crosstable consumers need no special-casing.
7. **Cards are never locked.** The card lock contradicts the manual-pairing workflow (a pair must stay correctable while a result is recorded) and, combined with the lone-game invariant, would lock every non-empty row of the active round. The lock is removed entirely; result and handicap buttons keep their own disabled conditions. Alternative rejected: keep the lock scoped to paired games with results - it still blocks legitimate corrections.
8. **Shared disabled predicate for row controls.** Result and handicap buttons share `activeRound !== currentRound || game.player2 == null`; the handicap requirement already inherits the result button's disabled condition, so no change is needed there.

9. **Drop mutations resolve against displayed row order.** `withParticipantDropped` (and the swap helper) rebuild the round's non-forfeit rows with the exact comparator `containersFromGames` uses for rendering (one shared internal function), keep auto-forfeit games outside row indexing, and return them unchanged - display and mutation can no longer disagree about which game a row index addresses.
10. **Pair completion resets the lone-game result.** When a lone game gains its `player2`, `result` is reset to `null` and `status` set to `'not_started'` (`handicap` stays `null`); the stale bye point must not survive, and the buttons unlock via the existing `player2 == null` disabled predicate.
11. **Post-drop sort targets the active round.** `handleDragEnd` calls `sortRoundGamesByPairStrength` with the active round and points earned strictly before it (`upToRound = round - 1`), keeping stored order aligned with display.
12. **Always one empty trailing row; hint only in `players1`.** Displayed rows become `max(game rows + 1, ceil((placed + unpaired) / 2))`; empty-row `players2` zones show no drop hint (a drop there still creates a lone game stored as `player1`).

## Risks / Trade-offs

- [Bye games now store `result: 'player1_won'` instead of `null`] → existing drafts keep old values until the next board interaction touches the game; acceptable for MVP drafts, no migration.
- [Forfeit exemption makes the invariant conditional] → centralize it in one predicate (e.g. `isLoneByeGame`) used by every mutation path and by button disabling.
- [Render-time sorting could reorder rows during a drag] → the comparator is deterministic and only changes after a mutation (same as today's post-drop sort).
- [Manual browser verification still needed for edge cases] → the tournament JS fixture with player data could not be located in the repo; drag-and-drop interactions remain manually verified.
- [Dropping a card whose own row sits above the target row shifts intermediate rows by one before the insert] → pre-existing since part 1; display is re-derived after the drop; documented as a known edge, to be fixed only if it surfaces in QA.
- [Removing the card lock allows dragging cards of scored pairs] → intended: pair-break normalization resets the remaining partner to lone-game values, and the cross-column swap flips or preserves the result consistently.

## Migration Plan

None — pure model/UI behavior change inside the tournament edit form. Previously stored games are re-normalized lazily on the next interaction.
