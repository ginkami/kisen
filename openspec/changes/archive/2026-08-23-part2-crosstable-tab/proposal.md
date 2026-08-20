## Why

The crosstable currently displays game info as read-only buttons. Arbiters need to fix pairings, results, sente colors, and handicaps directly in the crosstable without switching to the Pairings tab — e.g. correcting an opponent number, fixing a result symbol, or adjusting a handicap on the fly.

## What Changes

- Clicking a game-cell button (for rounds up to `currentRound + 1`) replaces the button with an inline text input pre-filled with the serialized cell content, plus a `BsCheckLg` confirm button to the right.
- Input text format maps 1:1 to button content: ``☗`` becomes `^`; ``☖`` and missing result (`?`) are not displayed. Only shown when `settings.considerSente == true`. Examples: ``☗4+[+B]`` ↔ `^4++B`; ``☖11+[-2p]`` ↔ `11+-2p`; `5-` ↔ `5-`; ``☗3?[-L]`` ↔ `^3-L`; ``☖5?`` ↔ `5`; `17?` ↔ `17`; `+` ↔ `+` (bye); `-` ↔ `-` (forfeit).
- Input is validated on the fly — characters not matching the grammar prefix are rejected (cannot be typed).
- On confirm (button click or input blur): valid input updates games; invalid or empty input preserves previous data.
- After processing, the editor closes and the button reappears.
- Game updates perform full round synchronization: changing player A''s opponent from B to C (where C was paired with D) deletes game C–D; B and D end up unpaired in that round. Bye (`+`) and forfeit (`-`) single-value inputs create corresponding single-participant games. Standings and tie-breaks recalculate automatically.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tournament-crosstable`: Add inline editing of round cells with input grammar, validation, confirm-on-blur, and round re-synchronization semantics.

## Impact

- **`src/components/tournament/crosstable/crosstableModel.ts`** — new: `CELL_PARTIAL_RE`, `parseCellInput`, `gameToCellInput`, `withCellEdited`
- **`src/components/tournament/CrosstableSection.tsx`** — editing state, input + `BsCheckLg` button rendering, onChange filtering, confirm via button/blur
- **`src/components/tournament/TournamentEditForm.tsx`** — pass `updateGames` prop to `CrosstableSection`
- **`src/test/crosstableModel.test.ts`** — tests for grammar (8 mapping examples both directions), partial regex, `withCellEdited` cascade scenarios
- No schema/i18n changes expected
