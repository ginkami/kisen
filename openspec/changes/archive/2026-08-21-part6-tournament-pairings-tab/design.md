## Context

The pairings tab (parts 1-5) and the crosstable (parts 1-2) mutate `Game` objects through several independent paths: pure model helpers in `pairingsModel.ts` (`withResultCycled`, `withHandicapCycled`, `withParticipantDropped`, `applyLoneGameInvariant`), crosstable edits in `crosstableModel.ts` (`withCellEdited`), and the form hook `useTournamentForm` (`updateGames`, `publishDraw`, `unpublishDraw`). Current gaps:

1. `Game.status` is written once (`not_started`, `bye`, or `forfeit`) and never re-derived; the domain statuses `live` and `completed` are unused, and games keep stale statuses after results are recorded or rounds are (un)published.
2. The lone-game invariant (part 5) forces every bye to `result: 'player1_won'`, but a bye can also be a draw (0.5 points); `calculateParticipantPoints` and `calcWinsCount` count every bye as a win regardless of `result`.
3. Participants unpaired in a past round receive forfeits only through the per-card toggle or the late-joiner `addParticipant` flow; dropping a participant into `unpaired` of a past round, or merely opening a past round with unpaired players, leaves them without a game.
4. `withResultCycled` and `withHandicapCycled` only cycle forward; there is no quick way back and no quick handicap reset.
5. `parseCellInput` / `CELL_PARTIAL_RE` / `gameToCellInput` have no representation for a bye-draw, and standalone `+` in `withCellEdited` creates a lone game with `result = null`, violating the part-5 invariant and breaking points.

## Goals / Non-Goals

**Goals:**

- One derivation rule (`deriveGameStatus(game, currentRound)`) as the single source of truth for `completed` / `live` / `not_started`, alongside the stored `bye` / `forfeit`; normalization applied on every mutation path.
- Editable bye result (win ↔ draw) with correct points (1 / 0.5) and wins count.
- Automatic, idempotent forfeits for participants unpaired in past rounds (drop into `unpaired` of a past round; opening a past round).
- Result button: forward click + backward right-click; enabled for byes, disabled only for forfeits.
- Handicap button: forward click + backward right-click + double-click reset to `=`; disabled for lone games.
- Crosstable: `=` bye-draw input, `+` bugfix, bye-draw serialization, result-aware points and wins count.

**Non-Goals:**

- Domain schema changes (`GameStatus` already includes `live` and `completed`).
- Data migration of stored games (normalization is lazy, applied by the next mutation that touches a game).
- Changing the per-card forfeit toggle, the late-joiner forfeit flow, or publish/unpublish semantics beyond status re-derivation.
- Automatic pairing.

## Decisions

1. **Status is derived, not incrementally patched.** `deriveGameStatus`: a `forfeit` game keeps `forfeit` (explicit stored state that cannot be reconstructed); a lone non-forfeit game (`player2 == null`) is `bye`; a paired game with a non-null `result` is `completed`; a paired game without a result is `live` in the active round and `not_started` otherwise. A `normalizeGame(game, currentRound)` wrapper also re-applies the lone-game invariant (bye: `handicap: null`, default `result: 'player1_won'`) and returns the same object reference when nothing changes. Alternative rejected: computing status only at render time → `status` is part of the persisted `Game` schema and bye/forfeit are genuinely stored state.
2. **Normalization at the mutation choke points.** `updateGames` normalizes the edited round; `publishDraw` / `unpublishDraw` re-normalize games against the new `currentRound` (publishing turns the freshly published round's result-less games into `live`). Every `pairingsModel` mutation derives statuses for the games it writes. Alternative rejected: one effect watching the whole form state → harder to test and risks update loops.
3. **Bye cycle is `player1_won` ↔ `draw`.** On bye rows the result button cycles only between `'player1_won'` and `'draw'`; paired rows keep the 4-state cycle including `null`. `calculateParticipantPoints` gives a draw bye 0.5 points (win or `null` → 1); `calcWinsCount` counts a bye only when its result is a win. Alternative rejected: bye with `result: null` meaning draw → `null` stays reserved for "no result yet" on paired games.
4. **Past-round unpaired → forfeit, in two places, one shape.** (a) `withParticipantDropped` gains a `currentRound` parameter: a drop into `unpaired` while the active round is a past round yields a deduplicated `forfeit` game instead of no game; (b) `withAutoForfeits(games, participants, round, currentRound, considerSente)` adds a forfeit for every participant with no game in a past round, idempotently (same array reference when nothing to add), called from a `PairingsBoard` effect. Both reuse the late-joiner forfeit shape (`result: 'player2_won'`, `sente` per `considerSente`). Alternative rejected: deriving forfeits only at standings time → the board must display the forfeit row and stay consistent with the per-card toggle.
5. **Right-click = reverse cycle via `onContextMenu` + `preventDefault()`.** `withResultCycled` / `withHandicapCycled` take a direction parameter (1 forward, -1 reverse) defaulting to forward, so existing call sites and tests compile unchanged. No custom context menu is rendered; the native menu is suppressed only on the cycling buttons.
6. **Double-click handicap reset with deferred single clicks.** `onDoubleClick` calls `withHandicapReset` (sets `handicap: null`); `onClick` is deferred through a ~250 ms timer cancelled by `onDoubleClick` / `onContextMenu`, so a double click does not first advance the cycle twice. Alternative rejected: firing the click immediately and compensating on double click → visible flicker and double state updates.
7. **Round-independent disabled predicates.** Result button: disabled only when `status === 'forfeit'` (byes are enabled). Handicap button: disabled only when `player2 == null` (bye and forfeit). No round-level gating — arbiters can edit results and handicaps in any round at any time, consistent with the part-2 "unlock editing" philosophy. Forfeit toggle in the `unpaired` container: disabled for past rounds (`activeRound < currentRound`) to prevent removing forfeit games from already-played rounds; toggle remains interactive in pairing rows and in current/future rounds.
8. **Crosstable `=` as the distinct parse result `'bye_draw'`.** `parseCellInput` returns the sentinel for standalone `=`; `CELL_PARTIAL_RE` accepts standalone `=` (a `=` without an opponent number, position-disambiguated from the `=` result symbol); `withCellEdited(..., currentRound)` maps `+` → bye + `'player1_won'` (bugfix), `=` → bye + `'draw'`, `-` → forfeit (unchanged), and derives `status` via the shared `deriveGameStatus` instead of hard-coding `'not_started'`. `gameToCellInput` and cell rendering serialize a draw bye as `=` and a win bye as `+`.
9. **`currentRound` flows through optional parameters.** New parameters (`direction`, `currentRound`) default to back-compatible values (forward / `0`) so existing tests and call sites keep working; components pass the real values.

## Risks / Trade-offs

- [Viewing a past round mutates formState via the auto-forfeit effect → the form becomes dirty and needs saving] → forfeits are semantically required (0 points, complete standings); the effect is idempotent so re-renders do not loop; documented behavior.
- [Toggling the per-card forfeit off in a past round instantly re-creates the forfeit via the effect] → intended semantics ("did not play a past round = loss"); documented.
- [`result` of forfeit games is not normalized (varies between creation paths)] → forfeit points are status-based, not result-based; per explicit user decision the forfeit result value is irrelevant; documented as a known inconsistency.
- [Delayed-click pattern adds ~250 ms latency to single clicks on the handicap button] → accepted trade-off for double-click reset; only the handicap button is affected.
- [Right-click reverse cycling has no visible hint] → acceptable for an organizer tool; tooltips can be added later.
- [Old drafts keep stale statuses until a mutation touches them] → no migration (same as part 5); points and standings never depend on the stored `status` of paired games.

## Migration Plan

None → pure model/UI behavior change inside the tournament edit form; stored games are re-normalized lazily by the next mutation that touches them.