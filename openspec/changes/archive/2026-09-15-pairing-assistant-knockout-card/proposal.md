## Why

The current knockout button on the pairing assistant drawer hides the decision-making: it auto-detects the bracket, picks the round implicitly and silently assigns forfeit games to eliminated players. Users need explicit control and predictability: which bracket size is used, which knockout round is being formed, and no surprise games for players who left the bracket.

## What Changes

- The single «Сформировать пары 1/{n} финала» button is replaced by a card «Игры плей-офф» (en: «Knockout pairings») on the pairing tools drawer containing:
  - a «Размер сетки» (en: «Bracket size») dropdown with power-of-two values from 4 up to the smallest power of two ≥ the participants count; the chosen value is persisted locally per edited tournament (localStorage) so it survives drawer close/reopen;
  - a «Раунд плей-офф» (en: «Knockout round») dropdown with values 1..(publishedRounds + 1);
  - a «Сформировать пары» (en: «Generate pairings») button (`BsDiagram2Fill`).
- New engine API `generateKnockoutRoundGames({ bracketSize, knockoutRound })`:
  - knockout round 1 starts the bracket at the current round from the unpaired players (canonical seeding by points then rating, abstract bottom padding to the bracket size, byes to top seeds); `PairingError` when unpaired count < bracket size / 2 or > bracket size;
  - knockout round K > 1 searches the played rounds for a bracket of the given size whose knockout round K lands on the round being prepared (start round = publishedRounds + 2 − K). The bracket MAY be embedded in rounds with arbitrary other games (Swiss games, consolation/forfeit games of players outside the bracket): only the bracket's own games are constrained by the canonical approach — all other games are ignored, so forfeit games for eliminated players are NOT required and games between eliminated players do not break the search; `PairingError` when no such bracket exists or the round's manual games conflict with the bracket;
  - eliminated players are NEVER assigned forfeit games by the engine anymore — only pairs (and byes in round 1) are created.
- The card (all its controls) is disabled together with the other drawer actions when any earlier round has a paired game without a result or a participant without any game (the Swiss completeness condition). Undo/Redo stay available.
- The «1/{n} финала» label computation, the auto-detection of brackets and the engine-side forfeit assignment are removed.

## Capabilities

### Modified Capabilities
- `knockout-engine`: bracket search parameterized by bracket size and knockout round (no forfeit requirements), knockout round 1 from unpaired players with explicit size bounds, no forfeit assignment; the `1/{n} финала` label requirement is removed.
- `tournament-management`: the drawer's knockout action becomes the «Игры плей-офф» card (bracket size dropdown persisted per tournament, knockout round dropdown, generate button) blocked by the Swiss completeness condition.

## Impact

- **Affected specs:** `openspec/specs/knockout-engine/spec.md`, `openspec/specs/tournament-management/spec.md` (Generate knockout pairings action).
- **Affected code:** `src/components/tournament/pairings/knockoutEngine.ts` (new API, old auto-detect removed), `src/components/tournament/PairingToolsDrawer.tsx` (card UI), `src/components/tournament/TournamentEditForm.tsx` (pass tournamentId), `src/locales/{en,ru}/translation.json`, tests `knockoutEngine.test.ts`, `pairingToolsDrawer.test.tsx`.
