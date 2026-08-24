## Why

The tournament status transitions are incomplete: `finished` is never assigned automatically (the last round's results do not finalize the tournament), `ongoing` is inferred only from wall-clock time (publishing the first draw or publishing a tournament that already has round-1 pairings does not start it), and there is no rollback when the last result is removed or all draws are unpublished. Statuses need a single normalized lifecycle driven by tournament data.

## What Changes

- New exported pure function `computeTournamentStatus` in `src/services/tournamentService.ts` normalizing the status from the tournament's data: `requested` explicit status (if any), `existingStatus`, `currentRound`, `games`, `schedule.rounds`, and `editTime`.
- Lifecycle rules:
  - `draft` is sticky (left only via publish which requests `'upcoming'`).
  - `canceled` / `proposed_for_removing` are sticky (changed only by an explicit `input.status`).
  - Otherwise the status escalates from data: last round of the schedule has games and every one has a fixed outcome (`result != null` or status `bye`/`forfeit`) → `finished`; `currentRound >= 1` or round-1 pairings exist or the first round's start time has passed → `ongoing`; else `upcoming`.
  - Symmetric rollback: removing the last result rolls `finished → ongoing`; unpublishing all draws (`currentRound = 0`, no pairings, start time not reached) rolls `ongoing → upcoming`.
- `TournamentService.update()` is rebuilt as merge-before-compute: it merges `input.games`/`input.currentRound`/`input.schedule` into the candidate first, then computes the status from that merged state (today `inferStatus` runs on `existing` before the merge, so it cannot see new games/currentRound). `publish()` unchanged (requests `'upcoming'`; normalization escalates to `'ongoing'` when round-1 pairings already exist). `isPublic` derivation unchanged.
- Unit tests `src/test/tournamentStatus.test.ts` for every transition, stickiness, and edge case.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-management`: new requirement "Tournament status lifecycle" defining the normalized `upcoming → ongoing → finished` automation with symmetric rollback and sticky manual statuses.

## Impact

- **Modified:** `src/services/tournamentService.ts` (`computeTournamentStatus` + rebuilt `update()` status block; `inferStatus` removed or absorbed).
- **New:** `src/test/tournamentStatus.test.ts`.
- **Behavioral notes:** editing a published tournament with saved games may now flip `upcoming → ongoing` on save even before the round start time (draw-based start); a tournament whose last round results are all fixed becomes `finished` on the next save/publish-draw. No schema, Firestore rules, or i18n changes.