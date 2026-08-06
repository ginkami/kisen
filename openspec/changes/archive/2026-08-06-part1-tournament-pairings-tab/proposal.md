## Why

Tournament editors currently have no UI to form pairings for rounds or to publish a draw. Round tracking and `Game` entities already exist in the domain (`tournament.currentRound`, `tournament.games`, `tournament.schedule.rounds`), but `TournamentEditForm` has no way to interact with them. As soon as a tournament is published, arbiters need an interface to assign participants to board slots per round, record results, handle byes/forfeits, and advance `currentRound` by publishing the draw.

## What Changes

- Add a new "Пары по турам" / "Pairings" tab (`Bs123` icon) to `TournamentEditForm`.
- Add a "Туры" / "Rounds" section with:
  - A right-aligned "Опубликовать жеребьёвку" / "Publish draw" button that sets `tournament.currentRound` to the active round tab; disabled until every participant in that round has a pairing; locked as "Жеребьёвка опубликована" / "Draw published" after publication.
  - Round sub-tabs `1..schedule.rounds.length`; tabs with number `> currentRound + 1` are disabled.
- Add three containers per round: `unpaired`, `players1`, `players2`. Participant cards are draggable between them via `@dnd-kit` (new dependency).
  - Dropping into `players1`/`players2` at a position forms a pair → creates/updates a `Game` in `tournament.games`.
  - Dropping into `unpaired` removes the participant from any game.
  - A single participant in `players1` without an opponent yields `status: 'bye'`.
  - `sente = settings.considerSente ? 'player1' : 'unknown'`; `status = player2 != null ? 'not_started' : 'bye'`.
  - Opening the next round tab (`currentRound + 1`) initializes all participants in `unpaired`.
- Add a per-pair result button cycling `?` → `>` → `<` → `=`, mapped to `Game.result` `null` / `'player1_won'` / `'player2_won'` / `'draw'`. Disabled when `round !== currentRound`.
- Lock dragging of cards belonging to a pair that already has a non-null `result`.
- Add a per-card toggle (refine the existing `showToggle` stub in `PlayerCard`) representing a technical defeat: when off, the participant is forced into `unpaired` and a `Game` with `status: 'forfeit'` and `player2: null` is created. Tooltip: "Техническое поражение" / "Forfeit".
- Extend `TournamentFormState` with `games` and `currentRound`; persist them through `tournamentService.update`.
- Add `currentRound` to `UpdateTournamentInput` in `tournamentService`.
- Add `ru`/`en` translation keys for all new UI strings.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-management`: the editor gains a round-by-round pairing board (form games from participant positions), result entry, bye/forfeit handling, and draw publication that advances `currentRound`.

## Impact

- **New dependency**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (drag and drop).
- **Domain**: no schema changes — `Game`, `currentRound`, `schedule.rounds` already exist in `src/domain/tournament.ts`. Behavior changes are purely in form/UI/service layers.
- **Service layer**: `src/services/tournamentService.ts` — `UpdateTournamentInput` gains optional `currentRound`, threaded into `update()`.
- **Form state**: `src/hooks/useTournamentForm.ts` — `TournamentFormState` adds `games`, `currentRound`; new actions `updateGames(round, games)` and `publishDraw(round)`; `formStateToUpdateInput` passes `games`/`currentRound`.
- **UI**:
  - `src/components/tournament/TournamentEditForm.tsx` — new `pairings` tab, new sub-state (active round).
  - New `src/components/tournament/PairingsSection.tsx` and `src/components/tournament/PairingsBoard.tsx`.
  - `src/components/player/PlayerCard.tsx` — `showToggle` becomes controllable (`toggleChecked`, `onToggleChange`, `toggleTooltip`).
- **i18n**: `src/locales/{ru,en}/translation.json` — new keys under `tournament.edit.pairings.*` and `tournament.edit.tabs.pairings`.
- **No Firestore rules changes** (existing tournament write rules already cover `games`/`currentRound` mutations by authorized editors).