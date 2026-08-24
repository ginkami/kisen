## 1. Pure status function

- [x] 1.1 `src/services/tournamentService.ts`: export pure `computeTournamentStatus({ requested?, existingStatus, currentRound, games, scheduleRounds, editTime }): TournamentStatus` — sticky `draft` (except requested `upcoming` via publish), sticky `canceled`/`proposed_for_removing` (except explicit requested); else: last-round-outcomes-fixed (`≥1 game in max round`, all `result != null || status bye/forfeit`) → `finished`; `currentRound >= 1 || round-1 games exist || editTime >= firstRound.scheduledAt` → `ongoing`; else `upcoming`
- [x] 1.2 Remove/absorb `inferStatus` (its time-fallback behavior is preserved inside the new function)

## 2. Service integration

- [x] 2.1 Rebuild `update()` as merge-before-compute: assemble the merged candidate (`games`, `currentRound`, `schedule`, etc.) first; then `status: computeTournamentStatus({ requested: input.status, existingStatus: existing.status, currentRound: candidate.currentRound, games: candidate.games, scheduleRounds: candidate.schedule.rounds, editTime: now })`; `isPublic` derivation unchanged
- [x] 2.2 Verify `publish()` path: requests `'upcoming'`; normalization escalates to `ongoing` when stored round-1 games exist (candidate carries `existing.games`)

## 3. Tests

- [x] 3.1 Create `src/test/tournamentStatus.test.ts` covering: publish without pairings → upcoming; publish with round-1 pairings → ongoing; currentRound 1 → ongoing; round-1 games exist → ongoing; last round all outcomes fixed (result/bye/forfeit mix) → finished; empty last round → not finished; removing last result → rollback to ongoing; unpublish all draws + future start → rollback to upcoming; time fallback upcoming → ongoing; sticky draft; sticky canceled/proposed_for_removing; requested status honored (e.g. explicit canceled from upcoming)

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` — no type errors
- [x] 4.2 Run `npx vitest run src/test/tournamentStatus.test.ts src/test/locales.test.ts` — all green
- [x] 4.3 Manual check: publish → upcoming; publish round-1 draw → ongoing badge; record all last-round results → finished; remove result → ongoing

## 5. Docs

- [x] 5.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance