## Why

The pairings tab and crosstable treat game status and bye results inconsistently: `Game.status` is stored but never re-derived (games remain `not_started` after results are recorded or rounds are published), a bye always counts as a win although the domain permits a bye-draw, unpaired players in past rounds receive forfeits only through the per-card toggle or the late-joiner flow, the result and handicap buttons only cycle forward, and the crosstable inline input cannot express a bye-draw at all - while standalone `+` currently produces an invalid game (a lone game with `result = null`).

## What Changes

- Single derivation rule for game status: a paired game with a recorded result is `completed`; a paired game without a result in the active round is `live`; a paired game without a result in any other round is `not_started`; `bye` and `forfeit` remain stored statuses. All mutation paths (model mutations, `updateGames`, `publishDraw`, `unpublishDraw`) normalize `Game.status` accordingly.
- Bye result becomes editable: a bye game keeps `status: 'bye'` with `result` of `'player1_won'` (display `>`, 1 point) or `'draw'` (display `=`, 0.5 points). The result button is enabled for bye rows and cycles between `>` and `=`; it is disabled only for forfeit rows.
- Points and wins-count calculations respect the bye result: a bye-draw earns 0.5 points and is not counted as a win.
- Participants left unpaired in a past round automatically receive forfeit games: dropping a participant into `unpaired` while a past round is active, and opening a past round that has unpaired participants, both create `status: 'forfeit'` games (idempotently).
- Result button: right-click (context menu) cycles the result backward; a regular click keeps cycling forward.
- Handicap button: right-click cycles backward; double-click resets `handicap` to `null` (display `=`); a regular click keeps cycling forward. A delayed-click pattern keeps single clicks from jumping before a double-click reset. The handicap button is disabled for lone games (bye and forfeit).
- Crosstable inline input: standalone `=` creates a bye game with `result = 'draw'`; standalone `+` creates a bye game with `result = 'player1_won'` (fixes the current bug where `+` produced `result = null`); a bye-draw renders and serializes as `=`.
- No domain schema changes - `GameStatus` already includes `live` and `completed`.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-management`: game status lifecycle (derived `completed` / `live` / `not_started`, normalized by the form hook and the pairings model), lone-game invariant relaxed so a bye carries `result` of `'player1_won'` or `'draw'`, bye-aware cumulative points, automatic forfeits for participants unpaired in past rounds, result button reverse cycling (right-click) and bye handling, handicap button reverse cycling (right-click) and double-click reset.
- `tournament-crosstable`: standalone `=` input creating a bye-draw, `+` input bugfix (`result = 'player1_won'` instead of `null`), bye-draw rendering and serialization, result-aware `points` and wins-count tie-breaks.

## Impact

- `src/components/tournament/pairings/pairingsModel.ts` - new `deriveGameStatus`, `normalizeGame`, `withHandicapReset`, `withAutoForfeits`; `withResultCycled` (direction parameter, bye cycle), `withHandicapCycled` (direction parameter), `withParticipantDropped` (forfeit on unpaired drop in a past round, derived statuses), `calculateParticipantPoints` (bye result awareness).
- `src/components/tournament/PairingsBoard.tsx` - right-click (context-menu) and double-click handlers with the delayed-click pattern, split result/handicap disabled predicates, auto-forfeit effect for past rounds.
- `src/components/tournament/crosstable/crosstableModel.ts` - `parseCellInput` (standalone `=`), `CELL_PARTIAL_RE` (`=` token), `withCellEdited` (bugfix, derived statuses), `gameToCellInput`, `calcWinsCount`.
- `src/components/tournament/CrosstableSection.tsx` - pass `currentRound` into `withCellEdited`.
- `src/hooks/useTournamentForm.ts` - status normalization in `updateGames`, `publishDraw`, `unpublishDraw`.
- Unit tests in `src/test/` for the pairings and crosstable models.
- No domain schema changes (`src/domain/tournament.ts` stays as-is); no new i18n strings expected.