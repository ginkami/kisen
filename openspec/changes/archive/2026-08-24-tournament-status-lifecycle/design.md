## Context

Status transitions live in `TournamentService`: `publish()` calls `update({ status: 'upcoming' })`; `update()` computes `nextStatus = input.status ?? this.inferStatus(existing, now)`. `inferStatus` only handles two cases — `draft` stays `draft`; `upcoming` → `ongoing` when `editTime >= firstRound.scheduledAt`. It runs **before** the merge (`existing` only), so newly saved `games`/`currentRound` never influence the status in the same update. Nothing ever assigns `finished`; nothing rolls statuses back.

Key flows that call `update()`: `saveDraft` (form save), `publishDraw` (via `formStateToUpdateInput` with `currentRound` + `games`), crosstable edits, and `publish()`.

## Goals / Non-Goals

**Goals:**

- One pure, exported `computeTournamentStatus` that derives the status from data; tested without Firestore.
- Merge-before-compute in `update()`: the status reflects the state being written, not the stale one.
- Lifecycle: publish → `upcoming`; first published draw (or round-1 pairings at publish time) → `ongoing`; all last-round outcomes fixed → `finished`; symmetric rollback on outcome removal / full unpublish; sticky `draft`/`canceled`/`proposed_for_removing`; time-based `upcoming → ongoing` fallback preserved.

**Non-Goals:**

- Manual status overrides UI (statuses are changed through the existing explicit `input.status` path).
- `startedAt`/`endedAt` on games; `adjourned` handling.
- Public page / Firestore rules changes (`isPublic` derivation untouched: everything except `draft`/`proposed_for_removing` is public).

## Decisions

1. **Merge-before-compute.** In `update()`, build the merged candidate (`games`, `currentRound`, `schedule`, …) first, then `status: computeTournamentStatus({ requested: input.status, existingStatus: existing.status, currentRound: candidate.currentRound, games: candidate.games, scheduleRounds: candidate.schedule.rounds, editTime: now })`. Alternative rejected: patching `inferStatus` to accept inputs — still order-dependent and untestable in isolation.

2. **"Outcome fixed" = `result != null` OR status `bye`/`forfeit`.** Byes and forfeits are terminal outcomes without a `result` being meaningful (forfeit `result` varies by creation path — known inconsistency). Status-based check is the single source of truth, consistent with the points calculation. Alternative rejected: `result != null` only — bye/forfeit-only rounds would never finish.

3. **`finished` requires games in the last round of the schedule.** `lastRound = max(schedule.rounds.number)`; finish = there is at least one game with `round === lastRound` and every game of that round has a fixed outcome. An empty last round (no games) is not finished. Alternative rejected: `currentRound === lastRound` — `currentRound` lags (it becomes `lastRound` only when the last draw is published) and says nothing about results.

4. **Sticky manual statuses.** `draft` leaves only via the explicit `'upcoming'` request from `publish()`; `canceled`/`proposed_for_removing` never change implicitly. This preserves existing admin flows (the spec already documents "editing after first round start → ongoing" only for non-manual states).

5. **Symmetric rollback.** Because the status is recomputed from data on every save, removal of the last result naturally rolls `finished → ongoing`, and unpublishing all draws with the start time not yet reached rolls `ongoing → upcoming`. No special-case code.

6. **Pure function exported from the service module** (not domain — it takes `Tournament`-shaped data but depends on service-level input semantics `requested`). Testable without mocks; `update()` stays thin.

## Risks / Trade-offs

- [Save of a published tournament with existing round-1 games flips `upcoming → ongoing` earlier than wall-clock] → intended (draw-based start per requirement); previously the status waited for the round start time.
- [`unpublishDraw` of the last published round with future start time rolls status back to `upcoming`] → intended symmetric rollback; user confirmed.
- [Existing time-based fallback still applies] → keeps behavior for tournaments that never touch the pairings tab.

## Migration Plan

None. Statuses are computed on write; existing documents keep their stored status until the next save/publish.