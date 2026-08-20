## 1. Grammar and parsing (crosstableModel.ts)

- [x] 1.1 Add `parseCellInput(input: string, considerSente: boolean): ParsedCell | 'bye' | 'forfeit' | null` implementing the grammar `^? oppNum result? handicap? | '+' | '-'` with backtracking (result+handicap first, then handicap alone). `^` prefix rejected when `considerSente == false`. ParsedCell carries `{ oppPlace, isSente, result, handicap }`.
- [x] 1.2 Add `CELL_PARTIAL_RE` — anchored prefix regex (built from `HANDICAP_CODES`) accepting every valid partial input: empty, `^`, digits, result char, partial/full handicap codes, and exact `+`/`-`.
- [x] 1.3 Add `gameToCellInput(game: Game | undefined, pid: number, oppPlace: number | null, considerSente: boolean): string` — serializes button content to input text (`☗`→`^`, `☖` and `?` → nothing, no brackets around handicap); `''` when no game.

## 2. Round synchronization (crosstableModel.ts)

- [x] 2.1 Add `withCellEdited(allGames, participants, tieBreaks, pid, round, input, considerSente): Game[] | null`: parse (null/empty → return null); resolve opponent place → id via fresh `computeStandings`; remove edited player's game and the new opponent's game in the round; create the new game (player1/player2 by `^` rule, result mirrored to player1 perspective, `sente`, `handicap`, `status: 'not_started' | 'bye'`, `id: uuidv7()`); `'bye'`/`'forfeit'` standalone inputs create single-participant games (forfeit gets `result: 'player2_won'`, mirroring `withForfeit`).

## 3. CrosstableSection UI

- [x] 3.1 Add `updateGames: (round: number, gamesForRound: Game[]) => void` prop; add `editing: { pid, round } | null` + `editValue` state. Click on an editable cell button (round `<= currentRound + 1`, including empty `-` cells) opens the editor with `gameToCellInput` prefill.
- [x] 3.2 Render the editor: auto-focused `input input-xs w-20 font-mono` + `BsCheckLg` confirm button (`btn btn-xs btn-ghost`) in a flex row. `onChange` accepts the value only when `CELL_PARTIAL_RE` matches.
- [x] 3.3 Implement `commitEdit()`: `withCellEdited(...)` → on non-null call `updateGames(round, next.filter(g => g.round === round))`; `setEditing(null)` unconditionally. Wire to confirm button `onClick` and input `onBlur` (guard double-fire via `relatedTarget` check or idempotent commit flag).

## 4. Integration

- [x] 4.1 In `TournamentEditForm.tsx` pass `updateGames={updateGames}` to `CrosstableSection`.

## 5. Unit tests (crosstableModel.test.ts)

- [x] 5.1 `parseCellInput`: all 8 canonical mappings parse to expected structures (`^4++B`, `11+-2p`, `5-`, `^3-L` handicap-no-result, `5` no-result, `17` no-result, `+` bye, `-` forfeit); invalid inputs return null (`^5+` without considerSente, `x`, `++`, `=`, `0`, `^4+X`, `999` out of range when participants fewer).
- [x] 5.2 `CELL_PARTIAL_RE`: valid partials accepted (`''`, `^`, `^1`, `^1+`, `^1+-`, `1-`, `+`, `-`, `^12-2`); invalid rejected (`x`, `#`, `^+`, `1=`, `12+x`).
- [x] 5.3 `gameToCellInput`: `☗4+[+B]` → `^4++B`, `☖11+[-2p]` → `11+-2p`, `☗3?[-L]` → `^3-L`, `☖5?` → `5`, `17?` → `17`, bye → `+`, forfeit → `-`, no game → `''`; `considerSente == false` omits `^`.
- [x] 5.4 `withCellEdited`: opponent change cascade (A: B→C while C–D existed → A–C created, A–B and C–D removed, B and D unpaired); result-only edit keeps pairing/handicap/sente; `+` creates bye and frees former opponent; `-` creates forfeit; invalid/empty input returns null; player1/player2 and sente correct for `^` and no-`^` variants; result mirrored to player1 perspective for player2-edited cells.
