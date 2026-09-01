## 1. Pure helpers extraction

- [x] 1.1 Extract a pure game-cleanup helper (e.g. `gamesWithoutParticipant(games, participantId, currentRound)`) into an importable module: removes lone games (`player2 = null`) of the participant in all rounds and paired games with `round > currentRound`, keeping published paired games
- [x] 1.2 Extract a pure helper for the late-joiner forfeit loop filter: given existing games, new participant id, `currentRound` and `considerSente`, returns only the forfeit games for rounds `1..currentRound` where the id has no existing game (as `player1` or `player2`)

## 2. Wire-up in `useTournamentForm`

- [x] 2.1 `removeParticipant` (~L1019): after filtering the participants array, apply the cleanup helper to `state.games`
- [x] 2.2 `addParticipant` forfeit loop (~L920–1060): skip forfeit creation for rounds where the new participant id already has a game (use the helper from 1.2)
- [x] 2.3 Save mapping (`formStateToUpdateInput` / `rowsToParticipants`): apply the same cleanup for participant rows dropped as empty (no familyName/givenName in any locale)

## 3. Tests

- [x] 3.1 Unit tests for the cleanup helper: lone forfeits removed in all rounds; unpublished paired game removed and opponent left unpaired; published paired games kept unchanged
- [x] 3.2 Unit tests for the forfeit-loop filter: creates forfeits for rounds without existing games; skips rounds where the id already has a game (regression for the id-22 duplication)
- [x] 3.3 Unit test for save-time cleanup: nameless row's games are dropped on save; named rows' games untouched
- [x] 3.4 Update or add a hook-level test if feasible without touching the known-broken `useTournamentForm.test.ts` baseline (file-level import error) — not feasible: hook module fails at import time (FirebaseError) in tests; behavior covered by pure-helper tests in `src/test/tournamentFormModel.test.ts` plus the save-time composition test

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` — clean
- [x] 4.2 Run new unit tests via `npx vitest run` — all green; full suite no worse than the 374/376 baseline (2 known failures: `App.test.tsx`, `useTournamentForm.test.ts`) — actual: 388/392; 0 new failures from this change. Note: 3 additional failures in `crosstableView.test.tsx` (opponent tooltips) pre-exist on clean HEAD (verified via stash on `5e01248`); the recorded 374/376 baseline was stale
- [x] 4.3 Run `openspec validate --changes` — no new validation issues
- [x] 4.4 Manual smoke check on a draft tournament: remove a participant with forfeits, re-add a new participant mid-tournament, confirm exactly one forfeit per missed round in the crosstable tooltip
