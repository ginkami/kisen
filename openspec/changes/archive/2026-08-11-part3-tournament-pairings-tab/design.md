## Context

Parts 1 and 2 established the pairings architecture: `containersFromGames` derives UI state from `games`, `withParticipantDropped`/`withResultCycled`/`withForfeit` compute new `games[]`, and `calculateParticipantPoints` computes cumulative points. Part 3 adds automatic forfeit for late joiners, persistent forfeit across rounds, and automatic sorting of containers.

## Goals / Non-Goals

**Goals:**
- Late joiners automatically get forfeits in all past rounds.
- Forfeit persists when switching to a new round (participant stays in unpaired with forfeit game).
- Unpaired and paired containers auto-sort by points then rating.

**Non-Goals:**
- Swiss auto-pairing algorithm (future).
- Tie-break coefficient recalculation (future).

## Decisions

### Decision 1: Auto-forfeit in `addParticipant`
**Choice:** When `addParticipant` is called and `currentRound > 0`, immediately create forfeit games for rounds `1..currentRound` in `formState.games`. The new participant's `id` is `0` at this stage (assigned later by `rowsToParticipants`); forfeit games use `player1: 0` and are matched/updated after save when the real id is assigned.

**Alternative considered:** Create forfeit games in `saveMutation.onSuccess` after the real id is known. Rejected: adds complexity to the mutation and requires a second update call. Instead, we generate the participant id early (next decision).

**Revised approach:** Generate participant id in `addParticipant` via `uuidv7()` converted to a positive integer (or use a local counter). Store it in `ParticipantRow.id` immediately so forfeit games can reference it. `rowsToParticipants` already assigns ids for `id === 0` rows; we change it to preserve existing `id > 0` values.

### Decision 2: Persistent forfeit across rounds
**Choice:** When `containersFromGames` processes a round, it includes forfeit games from that round. When a new round is opened (`currentRound + 1`), if a participant had a forfeit in the previous round and has no game in the new round yet, the UI shows them in unpaired. The forfeit game for the new round is NOT created automatically — only when the round is published or the user explicitly forfeits. However, if a forfeit game already exists in `games` for the new round (carried over), it is preserved.

**Simplified:** The requirement is that forfeit games are never deleted when switching rounds. This is already the case — `containersFromGames` reads from `games`, and switching the active round tab doesn't modify `games`. The only action needed is ensuring that `withForfeit` in the new round creates the forfeit game (already implemented in part 1).

### Decision 3: Sorting strategy
**Choice:** Split sorting into two locations:
- **Unpaired:** sorted inline in `containersFromGames` by `calculateParticipantPoints(games, pid, round, startingPoints)` descending, then `capturedRating.value` descending. Safe because unpaired is a derived array without order in `formState`.
- **Paired rows (games):** sorted via `sortRoundGamesByPairStrength(allGames, participants, round)` called in `handleDragEnd` after `withParticipantDropped`. This modifies the `games` array order in `formState`. NOT in `containersFromGames` — because that would cause cards to "jump" on every render, breaking the visual DnD experience.

**Rationale:** Sorting unpaired in `containersFromGames` is safe (derived array). Sorting paired rows must happen once at the point of modification (handleDragEnd), not on every render, to preserve the user's drop position.

**Additional:** `calculateParticipantPoints` receives `excludeByesInRound = round` during sorting to prevent bye-plays in the current round from inflating points.

### Decision 4: Sort helper functions
**Choice:** Add `sortUnpairedByPointsAndRating(unpaired, games, participants, round)` and `sortGamesByPairStrength(games, games, participants, round)` to `pairingsModel.ts`. Both use `calculateParticipantPoints` and `capturedRating.value`.

## Risks / Trade-offs

- **Risk:** Sorting on every render could cause flicker if order changes during drag. → Mitigation: sorting is stable (same inputs = same order); `@dnd-kit` handles visual transitions.
- **Risk:** Auto-forfeit with `id: 0` participants could create orphan games if the participant is never saved. → Mitigation: `id` is generated immediately (Decision 1 revised), so games reference valid ids.