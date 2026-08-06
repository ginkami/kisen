## Context

`TournamentEditForm` already manages most of a tournament via `useTournamentForm`, but `games` and `currentRound` are currently read-only fields living only on the loaded `tournament` object — they are never copied into `TournamentFormState`, never edited, and never sent through `formStateToUpdateInput`. The domain already supports everything we need (`Game`, `currentRound`, `schedule.rounds`, `considerSente`), so this change is a pure form/UI/service extension: wire the existing domain into a new interactive tab.

The new UI introduces drag-and-drop (not present in the app today) and a per-card toggle on `PlayerCard` (a stub already exists). The app is React 19 + TypeScript strict, DaisyUI-styled, offline-first via TanStack Query, and uses JSON-snapshot dirty detection in `useTournamentForm`.

## Goals / Non-Goals

**Goals:**
- Let an arbiter assemble round-by-round pairings by dragging participant cards across three containers (`unpaired`, `players1`, `players2`).
- Keep the `games`/`currentRound` model fully derived from the canonical source of truth: `tournament.games`.
- Add a "publish draw" action that advances `currentRound` and gates it on full pairing coverage.
- Record results and byes/forfeits through the existing `Game` schema without domain changes.
- Reuse the existing `PlayerCard` with a minimal, backward-compatible extension.

**Non-Goals:**
- Swiss/swiss-perfect auto-pairing generation — pairing is manual in this iteration.
- Time-control clock integration or live game state (`live`, `adjourned`, `completed` are left to later).
- Public-facing pairings view (only the editor UI is in scope).
- Changes to Firestore security rules or repository mappers.
- Standings/tie-break computation.

## Decisions

### Decision 1: `@dnd-kit` for drag-and-drop
**Choice:** Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
**Rationale:** Native HTML5 DnD is unreliable for cross-list reordering and has poor touch/keyboard support. `@dnd-kit` is modular, accessible, React-19 compatible, and the established React DnD library.
**Alternatives considered:**
- Native HTML5 DnD — rejected for UX reasons (no drop placeholders, brittle on touch).
- `react-dnd` — heavier and less actively maintained for React 19.

### Decision 2: Single source of truth = `games`; UI state derived via memo
**Choice:** The three containers are **not** independent state. On each render of `PairingsBoard`, derive `unpaired[]`, `players1[]`, `players2[]`, and the row pairing purely from `formState.games` (filtered by round) + `tournament.participants`. DnD and toggle/result handlers compute a new `games[]` and call a single `updateGames(round, newGames)` updater.
**Rationale:** Keeping a separate "positions" state would introduce dual sources of truth and drift; the existing form already uses JSON-snapshot dirty detection on `formState`, so all edits must funnel through `formState`.
**Alternatives considered:**
- Local UI positions + sync-to-games on blur — rejected: drift risk, undo complexity, conflicts with save flow.

### Decision 3: Row model = array of `{ player1?, player2? }`, ordered
**Choice:** Internally represent a round's pairings as an ordered array of pair slots. Each slot maps 1:1 to a `Game` in `games`. `players1[n]` and `players2[n]` come from `gamesForRound[n].player1` / `gamesForRound[n].player2`. The `unpaired` list is computed as participants not referenced by any game in the round (plus `forfeit` games, which keep their participant in `unpaired` for display).
**Rationale:** This makes positional drops straightforward (splice the games array) and keeps `game.id` stable across reordering so React keys and downstream references are safe.

### Decision 4: Bye vs. forfeit vs. unpaired
**Choice:**
- Participant in `players1` with `player2 == null` and `status == 'bye'` → a real game row, displayed in `players1` only.
- Participant with a `forfeit` game (toggle off) → displayed in `unpaired` with a visual "forfeit" marker; the `Game` still exists in `games` so it counts toward publish eligibility.
- Participant with no game in the round → displayed in `unpaired` with no marker.
**Rationale:** Matches the user's confirmed semantics: `bye` is an assigned single slot worth a win; `forfeit` is an explicit withdrawal; `unpaired` is "not yet decided".

### Decision 5: `TournamentFormState` extension + single updater
**Choice:** Add `games: Game[]` and `currentRound: number` to `TournamentFormState`. Initialize in `tournamentToFormState`. Persist in `formStateToUpdateInput`. Expose two new actions: `updateGames(round, games)` (replaces all games for the given round) and `publishDraw(round)` (sets `currentRound = round`). `UpdateTournamentInput` gains optional `currentRound`, threaded into `TournamentService.update`.
**Rationale:** Minimal surface, mirrors existing updaters (`addTieBreak`, `updateConsiderSente`), and reuses the existing dirty-detection and save pipeline.

### Decision 6: `PlayerCard` backward-compatible toggle
**Choice:** Keep `showToggle?: boolean` as-is. Add optional `toggleChecked?`, `onToggleChange?`, `toggleTooltip?`. When the new props are present, render a controlled toggle; otherwise keep the current decorative always-checked toggle. No changes to existing call sites (`PlayerSearchPanel`).
**Rationale:** Avoids a refactor of unrelated code paths.

### Decision 7: Participant → Player mapping for `PlayerCard`
**Choice:** `PlayerCard` expects a `Player` domain object, but pairing works with `ParticipantRow` (numeric `id`, locale names, rating, nationality). Rather than overloading `PlayerCard` with a second prop shape, introduce a tiny adapter (`participantRowToPlayerLike(row, locale): Player`) inside the pairings feature that builds a `Player`-shaped object from a `ParticipantRow` for the active locale.
**Rationale:** Keeps `PlayerCard` focused on its existing contract; isolates the projection in the new feature.

### Decision 8: Round gating semantics
**Choice:** Disable round tabs `> currentRound + 1`. Disable result buttons and the forfeit toggle's "off" transition when `activeRound !== currentRound` (once published, results are editable only on the current round). Drag-and-drop remains enabled only on the round `currentRound + 1` (the one being prepared) — already-published rounds render read-only boards.
**Rationale:** Prevents editing history; matches the "publish advances currentRound" contract.

## Risks / Trade-offs

- **Risk:** Dual-list DnD ordering bugs (off-by-one rows, lost cards). → Mitigation: derive UI from `games` on every render (no parallel position state); unit-test the `games`→containers and containers→`games` projections with `vitest`.
- **Risk:** `Game` id churn breaking React keys. → Mitigation: reuse existing `game.id`; only create new UUIDv7 ids when a genuinely new game is formed, and delete ids only when a pair fully dissolves.
- **Risk:** Dirty-state inflation — large `games` arrays serialized to JSON on every render for dirty detection. → Mitigation: acceptable for MVP tournament sizes; revisit if tournaments exceed hundreds of games.
- **Risk:** `@dnd-kit` version mismatch with React 19. → Mitigation: pin versions compatible with React 19; verify with `tsc -b` + `vite build` before close.
- **Risk:** Forfeit + re-pair interaction confusion (user toggles forfeit off while card is in `players1`). → Mitigation: toggling forfeit off always forces the card into `unpaired` and removes any non-forfeit game it was part of; spec scenarios cover this.
- **Trade-off:** No backend validation of pairing consistency (e.g., a participant in two games for one round). → Mitigation: keep the invariant inside `updateGames` (dedupe participants when rebuilding the round's games); backend enforcement is a follow-up.

## Migration Plan

1. Install `@dnd-kit/*` packages.
2. Extend `UpdateTournamentInput` and `TournamentFormState`; existing tournaments with no `games`/`currentRound` already default safely (`games: []`, `currentRound: 0`) via the domain schema, so no data migration is needed.
3. Ship UI behind the new tab; no changes to existing tabs or call sites.
4. Rollback: remove the tab; the service/hook additions are additive and inert if the UI is absent.