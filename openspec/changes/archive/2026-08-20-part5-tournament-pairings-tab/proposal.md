## Why

The pairings tab shipped in parts 1-4 has five behavioral defects that make manual pairing error-prone: paired rows are ordered by points that already include the results of the round being edited; dropping a player into the `players2` slot of an empty row silently does nothing; the board renders too few rows when unpaired players outnumber free slots; breaking a pair can delete the partner's game and leave stray `result`/`status` artifacts; and lone (bye) games have no enforced shape - the result/handicap buttons stay clickable on them. A manual QA pass on the implemented board (tournament draft fixture) found five more defects: drops into the `players2` zone of a displayed lone row miss the pair-completion branch because mutations index rows in storage order (forfeits included) while rendering sorts them; the post-drop sort normalizes the wrong round; pair completion keeps the stale bye `result`; cards of scored pairs are locked; and empty rows show a `players2` drop hint with no guaranteed empty row at the bottom.

## What Changes

- Fix paired-row sorting to use cumulative points earned strictly **before** the active round (`upToRound = round - 1` instead of `round`), and apply pair-row sorting at render time in `containersFromGames`, not only after drop operations.
- Allow dropping a participant into the `players2` slot of an empty row: a lone game is created with the dropped participant stored as `player1` (not `player2`).
- Render extra empty pairing rows whenever the number of unpaired participants exceeds the number of free `players1`/`players2` row slots, so there is always drop space for every unpaired player.
- Breaking a pair (dragging one member to `unpaired`) keeps the remaining partner in the same row as a lone game instead of deleting the whole game; `result`/`status`/`handicap` are reset to lone-game values.
- Enforce a lone-game invariant: whenever `player2 == null`, a game SHALL have `status: 'bye'`, `result: 'player1_won'`, `handicap: null`; the result and handicap buttons are disabled for lone rows.
- Resolve drop row indices against the displayed row order: `withParticipantDropped` (and the swap helper) use the same shared comparator as `containersFromGames`, with auto-forfeit games kept outside row indexing and returned unchanged.
- Reset `result` to `null` and `status` to `'not_started'` when a drop completes a pair with a lone game, unlocking the row's result and handicap buttons.
- Remove the card lock entirely: participant cards are always draggable, including pairs with recorded results.
- Always render at least one empty row at the bottom (`max(game rows + 1, ceil((placed + unpaired) / 2))` displayed rows); empty-row `players2` zones display no drop hint.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-management`: pairing-board requirements change - pair-row sort key becomes points earned before the round with sorting applied on render; drop into the `players2` slot of an empty row creates a lone game stored as `player1`; extra empty rows are rendered for unpaired overflow; breaking a pair keeps the partner as a lone game; a lone-game invariant (`status: 'bye'`, `result: 'player1_won'`, `handicap: null`) is enforced with disabled result/handicap controls. Cards are always draggable (the card lock is removed); at least one empty row is always rendered at the bottom; empty-row `players2` zones show no drop hint; drop row indices follow displayed row order (shared comparator, forfeits excluded); completing a pair resets the lone-game `result` to `null`.

## Impact

- `src/components/tournament/pairings/pairingsModel.ts` - `sortRoundGamesByPairStrength` (points window), `containersFromGames` (row sorting + empty-row padding), `withParticipantDropped` (player2-drop on empty row, pair-breaking keeps partner, lone-game normalization).
- `src/components/tournament/PairingsBoard.tsx` / `PairingsSection.tsx` - disabled state of result/handicap buttons for lone rows; card-lock removal (cards always draggable); always-present trailing empty row; drop hint only in empty `players1` zones; post-drop sort call fix.
- `src/test/pairingsModel.test.ts` - unit tests for all five behaviors plus the manual-QA follow-up fixes (displayed-order drops, forfeit index isolation, pair-completion result reset, sorting window).
- No domain schema changes (`src/domain/tournament.ts` stays as-is); no new i18n strings expected.