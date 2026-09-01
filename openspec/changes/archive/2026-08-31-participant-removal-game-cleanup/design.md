## Context

Root-cause investigation of duplicate forfeit cards (tournament1.js, player id 22, rounds 1–3) established the mechanism:

1. Participant id 22 existed early, got a manual forfeit in round 1 (`withForfeit`, `result: null`, uuidv7) and carry-over forfeits for rounds 2–3 (`withForfeitsCarriedOver`, uuidv7) — confirmed by uuidv7-embedded timestamps.
2. The participant was removed. Neither removal path cleans games: `removeParticipant` only filters the `participants` array (`useTournamentForm.ts` ~L1019), and `rowsToParticipants` silently drops rows without familyName/givenName at save time — in both cases `formState.games` keeps the orphaned games.
3. A new participant was added during round-4 preparation. `addParticipant` computes `newId = maxId + 1` (reusing the freed id 22) and unconditionally creates uuidv4 forfeit games for rounds `1..currentRound` — colliding with the orphans. Result: two forfeit games per round 1–3, duplicated cards in the crosstable name tooltip.

The user decided NOT to make the tooltip deduplicate per round: «one game per participant per round» is an axiom, and the UI should keep exposing violations. So the fix belongs on the write path.

## Goals / Non-Goals

**Goals:**
- Removing a participant (button or implicit empty-row drop on save) leaves no orphaned games in the draft.
- Late-joiner forfeit creation in `addParticipant` never produces a second game for a (participant, round) that already has one — protecting against id reuse of removed participants.
- All three fixes are testable as pure functions (the hook file has a known baseline import failure in `useTournamentForm.test.ts`).

**Non-Goals:**
- No UI changes (tooltips, crosstable, pairings board stay as-is).
- No data migration / one-off cleanup of already-corrupted documents (handled separately, e.g. by hand or a script).
- No change to id generation strategy (`maxId + 1` stays).
- No changes to `withAutoForfeits` / `withParticipantDropped` / `withForfeitsCarriedOver` — they already guard against existing games; the collision came from `addParticipant` + orphans.

## Decisions

### Decision 1: Differential cleanup on participant removal
`removeParticipant` removes from the draft: (a) all lone games (`player2 === null`) of the removed participant in **all** rounds — forfeits, byes, carry-over forfeits; (b) paired games of the removed participant in rounds **not yet published** (`round > currentRound`) — their former opponent simply becomes unpaired. Paired games in published rounds (`round ≤ currentRound`) are **kept**: standings history and the opponents' results must not be rewritten retroactively.

**Alternative considered:** delete every game of the removed participant. Rejected — it silently rewrites published results of other participants (and tie-breaks computed from them).

**Alternative considered:** also auto-create a bye/forfeit for the stranded opponent in an unpublished round. Rejected — the pairings board's existing auto-forfeit/drop flows already cover the arbiter's explicit intent; implicit forfeits on removal were not part of the reported bug.

### Decision 2: Same cleanup rule for rows dropped as empty on save
`rowsToParticipants` filters out rows with no familyName/givenName. The save mapping (`formStateToUpdateInput`) SHALL apply the same game-cleanup rule (Decision 1) for every dropped row id. This closes the second, silent orphan path found during the investigation.

### Decision 3: Dedup guard in `addParticipant` forfeit loop
Before pushing a late-joiner forfeit for round `r`, skip creation when any existing game of the new participant id already covers that round (`findGame(newId, r)` semantics: a game where the participant is `player1` or `player2`). This makes the late-joiner path idempotent with respect to any pre-existing games — including orphans that predate this fix in already-saved documents.

**Alternative considered:** stop reusing ids of removed participants (persisted monotonic counter). Rejected — changes the persisted document shape and does not help documents already saved with orphans.

### Decision 4: Extract pure helpers for testability
New pure functions (cleanup rule + forfeit-loop filter) live in a module importable by tests without mounting the hook (the hook's test file has a known file-level import baseline failure). This mirrors the established pattern of extracting pure helpers from form hooks (see `2026-07-29-part1-participants-edit/design.md` on the `usePlayerForm` extraction).

## Risks / Trade-offs

- [Removing a mid-tournament participant keeps their published paired games, so the crosstable may show an opponent result against a participant id that no longer resolves to a name] → Pre-existing display behavior for such games; the cell/result stays truthful, and the name tooltip renders a card with fallback naming. Out of scope here.
- [`round > currentRound` relies on the currentRound semantics documented in `tournament-management` (games for the prepared round may exist at `currentRound + 1`)] → Covered by unit tests using the same semantics as the unpublish flow.
- [Documents already saved with orphaned games stay dirty until manually cleaned] → Accepted; the `addParticipant` guard prevents the collision from recurring, and the tooltip keeps duplicates visible as a signal.
- [Save-time cleanup changes existing documents on next edit-save even if the arbiter touched nothing related] → Intended: it is the repair path for the silent orphan source; games removed this way are only lone games and unpublished pairings of nameless rows.

## Migration Plan

No schema or backend changes; the fix is inside the edit-form hook state lifecycle. Rollback is a plain revert. Existing corrupted documents are addressed separately (manual/scripted dedup), not by this change.

## Open Questions

None — differential cleanup semantics (Decision 1) confirmed with the user during root-cause review.
