## 1. i18n

- [x] 1.1 Add `tournament.view.results` keys (`rounds`, `rating`, `pts`, `round` with `{{n}}`, `noResults`) to `src/locales/ru/translation.json` («Туры», «Рейтинг», «Очки», «{{n}}-й тур»)
- [x] 1.2 Add the same keys to `src/locales/en/translation.json` («Rounds», «Rating», «Pts», «Round {{n}}»)

## 2. Component

- [x] 2.1 Create `src/components/tournament/view/TournamentResultsSection.tsx` with props `games, participants, roundCount, currentRound, considerSente` and published-round tab logic (`1..min(roundCount, max(currentRound,1))`, default = last published, empty-state when none)
- [x] 2.2 Render the «Туры» heading and round sub-tabs following the `PairingsSection` markup pattern (`tabs tabs-box tabs-sm`)
- [x] 2.3 Build rows for the active round from `containersFromGames(games, participants, activeRound).games` plus trailing forfeit rows from `gamesForRound(games, activeRound)` where `status === 'forfeit'`
- [x] 2.4 Implement per-player cells: flag + `getCountryName` tooltip, rank/title badge (`rankToColor` + crown tooltip), «familyName, givenName» with `locales[locale] ?? ru ?? en` fallback, `capturedRating.value`, points-before-round badge via `calculateParticipantPoints(games, pid, activeRound - 1, startingPoints ?? 0)`
- [x] 2.5 Implement the result cell mapping (`? : ?`, `+ : -`, `- : +`, `= : =`, bye `+` / `=` for draw-bye, forfeit `-`) and the 12-column header row (empty flag/rank headers, ☗/☖ name headers when `considerSente`, «Рейтинг», «Очки», «{{n}}-й тур»/«Round {{n}}»)

## 3. Wiring

- [x] 3.1 Replace the empty `results` tab placeholder in `src/pages/TournamentPage.tsx` with `<TournamentResultsSection games={tournament.games} participants={tournament.participants} roundCount={tournament.schedule.rounds.length} currentRound={tournament.currentRound} considerSente={tournament.settings.considerSente} />`

## 4. Tests

- [x] 4.1 Create `src/test/tournamentResultsSection.test.tsx` with native (non-jest-dom) assertions and a local tournament/games fixture builder
- [x] 4.2 Cover: round tab visibility (published rounds only, default last), empty state at `currentRound == 0`, board-order parity with `containersFromGames`, forfeit rows appended last, result symbol mapping, points-before-round badges, bye rows with empty player-2 cells, ☗/☖ vs empty name headers, «2-й тур»/«Round 2» header in ru/en

## 5. Verification

- [x] 5.1 Run `npx vitest run src/test/tournamentResultsSection.test.tsx` — all green
- [x] 5.2 Run full suite `npx vitest run` — only the 2 known baseline failures allowed
- [x] 5.3 Run `npx tsc --noEmit` — clean
- [x] 5.4 Run `openspec validate --changes` — no new validation issues for this change
- [x] 5.5 Manual UI check of the «Результаты» tab (dev server), then suggest a commit message
