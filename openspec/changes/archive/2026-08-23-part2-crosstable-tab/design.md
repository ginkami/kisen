## Context

`CrosstableSection` renders round cells as read-only buttons (`roundCell` function). Games live in `formState.games` via `updateGames(round, gamesForRound)` from `useTournamentForm`. `crosstableModel.ts` has `computeStandings` (place map used for opponent row numbers), existing single-player game formats from `pairingsModel.ts` (`withForfeit` creates forfeit games with `sente: considerSente ? 'player1' : 'unknown'`, bye rows via `createEmptyGame`). The player-vs-opponent result direction was already fixed via `resultPointsForParticipant`.

## Goals / Non-Goals

**Goals:**
- Inline editing of round cells (pairing, result, sente, handicap) with a compact text grammar
- On-the-fly character filtering; invalid/empty input preserves data
- Full round re-synchronization on apply (cascade deletion of the new opponent's old game)
- Confirm via BsCheckLg button and blur

**Non-Goals:**
- No editing of rounds `> currentRound + 1`
- No changes to the Pairings tab behavior
- No persistence changes (`updateGames` round-trip already exists)

## Decisions

### Decision 1: Grammar with backtracking parser

```
cell    := '^'? oppNum result? handicap?  |  '+'  |  '-'
result  := '+' | '-' | '='
handicap:= ('-'|'+') ('L'|'B'|'R'|'RL'|'2p'|'4p'|'5p'|'6p'|'8p'|'10p')
oppNum  := [1-9][0-9]{0,2}
```

`parseCellInput(input, considerSente): { oppPlace?: number, isSente?: boolean, result?: GameResult, handicap?: string } | 'bye' | 'forfeit' | null`.

Backtracking: after `^?` and digits, try tail as `result handicap?`; if the tail doesn't match, retry as `handicap` alone (covers `^3-L` = handicap without result). Distinguish standalone `+`/`-` (exact match, no opponent) from `5-`/`+L`-style content by requiring an opponent number for the full form.

`^` handling: if `considerSente == false` and input starts with `^` → invalid (null). When parsed with `^`: edited player is player1. Without `^` and `considerSente == true`: edited player is player2. Without `considerSente`: edited player is player1, `sente = 'unknown'`.

### Decision 2: Prefix regex for on-the-fly filtering

`CELL_PARTIAL_RE` — anchored regex accepting every valid prefix: empty, `^`, `^?\d{1,3}`, `^?\d{1,3}[+\-=]`, `^?\d{1,3}[+\-=][-+]?(L|B|R|RL|2p|4p|5p|6p|8p|10p partial chars…)`, plus `+`/`-` exact. Built from the same token lists as the parser (single source: `HANDICAP_CODES` from pairingsModel). `onChange` keeps the new value only if `CELL_PARTIAL_RE.test(v)`.

### Decision 3: Serialization — `gameToCellInput`

Mirror of button rendering: `^` when considerSente and edited player is sente; `☖` and `?` produce nothing; result `+`/`-`/`=`; handicap appended without brackets. Empty/no game → `''`.

### Decision 4: `withCellEdited` round synchronization

```ts
withCellEdited(allGames, participants, tieBreaks, pid, round, input, considerSente): Game[] | null
```
1. Parse; null/empty → return null (caller keeps previous games).
2. Resolve opponent: current `computeStandings` place → participant id map; unknown place → null.
3. Round games: remove edited player's game AND the new opponent's game (their former partners become unpaired — same semantics as dragging to unpaired in Pairings).
4. Build the new game: player1/player2 by `^` rule; result mirrored to player1's perspective (`player1_won` if the winner is the edited player and he is player1, etc.); `sente` per Decision 1; `handicap` or null; `status: player2 != null ? 'not_started' : 'bye'`; `id: uuidv7()`, `round`.
5. `'bye'` → single game `{ player1: pid, player2: null, status: 'bye', result: null, sente: considerSente?'player1':'unknown', handicap: null }`; `'forfeit'` → same shape with `status: 'forfeit'`, `result: 'player2_won'` (mirrors `withForfeit`).
6. Return `[...otherRounds, ...roundGames]`.

### Decision 5: UI state in CrosstableSection

`const [editing, setEditing] = useState<{ pid: number, round: number } | null>(null)` + `editValue: string`. Click on editable cell button → `setEditing({pid, round})`, `setEditValue(gameToCellInput(...))`. Render input `autoFocus` + `BsCheckLg` button in a `flex` container. Confirm handler: `withCellEdited(...)` → if non-null `updateGames(round, result.filter(g => g.round === round))`; `setEditing(null)` unconditionally. `onBlur` triggers the same handler (with a guard against double-run after button click via a ref flag or `relatedTarget` check).

### Decision 6: Editable rounds gate

Reuse the existing round-cell branch: rounds `> currentRound + 1` render inert placeholder spans; only button cells (rounds `<= currentRound + 1`, including the `-` empty button) open the editor.

## Risks / Trade-offs

- **Blur + button click double-fire**: mitigated by checking `relatedTarget` (button click moves focus to the button → treat blur as no-op since click handler will run) or a single `commit()` idempotency flag.
- **Standings shift after edit**: opponent row numbers are resolved against the standings at edit time; after apply the table re-sorts, which may renumber rows — acceptable (same as Pairings tab semantics).
- **Backtracking grammar complexity**: bounded tail length (max ~6 chars after result) — negligible.
