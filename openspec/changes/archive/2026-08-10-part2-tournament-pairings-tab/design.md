## Context

Part 1 delivered the pairings tab. Part 2 addresses usability gaps identified during testing: post-publication editing, undo, points display, and `startingPoints` inline editing. All domain types (`Game`, `Participant.startingPoints`, `currentRound`) already exist; no schema changes needed.

## Goals / Non-Goals

**Goals:**
- Allow arbiters to edit pairings and results at any time (no publication gating).
- Provide an undo mechanism for published draws.
- Show cumulative points per participant.
- Allow inline `startingPoints` editing from the pairing board.

**Non-Goals:**
- Tie-break / coefficient calculation (future).
- Automated pairing generation (future).
- Public-facing points display (only the editor UI is in scope).

## Decisions

### Decision 1: Remove all publication gates from the board
**Choice:** `isPublished` no longer disables drag, result cycling, or forfeit toggle. `isDraggable` is always `true`; `resultDisabled` is always `false`.
**Rationale:** Arbiters need to correct mistakes after publication. The "publish" action only advances `currentRound`; it doesn't lock the board.

### Decision 2: Unpublish via `unpublishDraw()` in the hook
**Choice:** New `unpublishDraw()` action in `useTournamentForm`:
```ts
updateForm((state) => {
  const newCurrentRound = Math.max(0, state.currentRound - 1)
  return {
    ...state,
    currentRound: newCurrentRound,
    games: state.games.filter((g) => g.round !== state.currentRound + 1),
  }
})
```
**Rationale:** Single source of truth (`formState`), consistent with `publishDraw()`.

### Decision 3: Cumulative points via pure helper `calculateParticipantPoints`
**Choice:** New helper in `pairingsModel.ts`:
```ts
function calculateParticipantPoints(
  games: Game[],
  participantId: number,
  upToRound: number,
  startingPoints: number
): number
```
Points logic: win = 1, draw = 0.5, bye = 1, forfeit = 0. Computed on every render from `games` + `participants`.

**Rationale:** Derived state (not stored) avoids sync issues; consistent with the single-source-of-truth pattern from part 1.

### Decision 4: `startingPoints` editing via `updateStartingPoints(participantId, value)`
**Choice:** New action in `useTournamentForm` updates `formState.participants[].startingPoints` for the matching participant. `PlayerCard` receives `startingPoints` and `onStartingPointsChange` props (optional); only the pairings board passes them.
**Rationale:** Minimal surface, backward-compatible with `PlayerSearchPanel`.

### Decision 5: `PlayerCard` props for points and startingPoints
**Choice:** Add optional props: `startingPoints?: number`, `onStartingPointsChange?: (value: number) => void`. When both are present (pairings tab), render the input + badge. When absent, hide both.
**Rationale:** Keeps `PlayerCard` reusable; no conditional logic in callers.

## Risks / Trade-offs

- **Risk:** Editing results after publication without a confirmation dialog could lead to accidental data loss. → Mitigation: acceptable for MVP; the `unpublishDraw` is the explicit destructive action.
- **Trade-off:** Cumulative points are recomputed on every render (O(games × participants)). → Mitigation: acceptable for MVP tournament sizes.