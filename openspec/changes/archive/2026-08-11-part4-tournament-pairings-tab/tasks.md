## 1. Swap players within a pairing row

- [x] 1.1 Add `withPlayersSwapped(allGames, round, rowIndex)` pure function to `src/components/tournament/pairings/pairingsModel.ts`. The function: filters pair-games (non-forfeit) for the round; swaps `player1` ↔ `player2` at `rowIndex`; flips `sente` (`player1`→`player2`, `player2`→`player1`, `unknown` unchanged); flips non-null result (`player1_won`↔`player2_won`, `draw` unchanged); preserves all other fields; returns new array immutably.
- [x] 1.2 Add swap detection in `handleDragEnd` of `PairingsBoard.tsx`.
- [x] 1.3 Add unit tests for `withPlayersSwapped` in `src/test/pairingsModel.test.ts`: swap p1↔p2, sente flipped, result flipped, bye game (player2=null) not swappable, preserves handicap/id/status.

## 2. Handicap cycling button

- [x] 2.1 Add constants `HANDICAP_CODES`, `HANDICAP_CYCLE` (21 entries: `null` + 10 `-` codes + 10 `+` codes) and helpers `handicapToSymbol`, `withHandicapCycled` to `src/components/tournament/pairings/pairingsModel.ts`.
- [x] 2.2 Add `handleHandicapCycle` callback in `PairingsBoard` component that calls `onGamesChange(withHandicapCycled(games, gameId))`. Pass `onHandicapCycle={handleHandicapCycle}` prop to `Row`.
- [x] 2.3 Update `Row` component props to accept `onHandicapCycle: (gameId: string) => void`. Replace the static `=` button (line 587–593) with a cycling button: display `handicapToSymbol(game.handicap)`; apply `btn-warning` when `handicap != null`; wrap in DaisyUI tooltip with `data-tip={t('tournament.edit.pairings.handicap')}`; same `disabled` condition as result button.
- [x] 2.4 Add i18n key `tournament.edit.pairings.handicap` to `src/locales/ru/translation.json` ("Игра с форой") and `src/locales/en/translation.json` ("Game with handicap").
- [x] 2.5 Add unit tests for `withHandicapCycled` in `src/test/pairingsModel.test.ts`: cycle from null to `-L`, cycle through all 21 states back to null, non-target game unchanged.
