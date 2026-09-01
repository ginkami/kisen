## Why

Removing a participant (explicit «Удалить участника» button, or an empty participant row silently dropped on save) leaves that participant's games orphaned in `formState.games`. If a new participant is later added, `addParticipant` reuses the freed id (`maxId + 1`) and creates fresh forfeit games for skipped rounds — colliding with the orphaned games of the removed participant on the same participant id. Real-world fallout (tournament1.js, 2026-08-25): participant id 22 accumulated duplicate forfeit games in rounds 1–3 (three uuidv7 orphans from the removed participant + three uuidv4 forfeits from the re-added participant), producing duplicated forfeit cards in the crosstable name tooltip. The write path must preserve the axiom «one game per participant per round».

## What Changes

- `removeParticipant` in `useTournamentForm.ts` SHALL delete all games referencing the removed participant id in the same draft state, instead of only filtering the `participants` array.
- `rowsToParticipants` SHALL drop the games of participant rows it filters out as empty (no familyName/givenName), so silent removal on save cannot leave orphans either.
- `addParticipant` SHALL skip creating a late-joiner forfeit game for any round where the new participant's id already has a game (id-reuse defense), instead of blindly creating forfeits for rounds `1..currentRound`.
- No changes to the UI: crosstable tooltips keep rendering one card per existing game, so any remaining data anomalies stay visible.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tournament-management`: ADDED requirement — participant removal removes all of that participant's games from the draft state; MODIFIED requirement «Auto-forfeit for late joiners in past rounds» — forfeit creation skips rounds where the participant already has a game.
- `tournament-edit-form-ux`: MODIFIED requirement «Participant card row management» — removing a participant also removes their games (including those created by late-join forfeits, forfeit toggles, and carry-over); MODIFIED requirement «Participants section in tournament edit form» — saving with an empty participant row drops that row's games as well as the row.

## Impact

- `src/hooks/useTournamentForm.ts` — `removeParticipant` (~L1019), `addParticipant` forfeit loop (~L920–1060), `rowsToParticipants` (~L201).
- `src/test/useTournamentForm.test.ts` (currently has a known file-level import error baseline failure — extend with pure-function tests where possible) and/or new focused unit tests.
- No Firestore schema changes: game cleanup happens in draft `formState` before the existing update mutation; document shape is unchanged.
- No i18n changes: no new UI strings.
