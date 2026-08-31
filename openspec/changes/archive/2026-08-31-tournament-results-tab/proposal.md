## Why

The public tournament page has a «Результаты» (Results) tab that currently renders an empty placeholder (`{activeTab === 'results' && <div />}`). Tournament participants and visitors need to see per-round results (boards, players, pre-round points, outcomes) alongside the already-shipped «Описание», «Игроки» and «Таблица» tabs.

## What Changes

- Add a `TournamentResultsSection` component rendered in the `results` tab of `TournamentPage`, replacing the empty placeholder.
- Section shows an h2 «Туры»/«Rounds» heading with round sub-tabs, limited to published rounds (`1..min(roundCount, max(currentRound, 1))`); the default active round is the last published round; when no rounds are published a localized empty-state message is shown.
- Per round, a read-only results table lists the same boards in the same order as the edit-mode `PairingsSection` board (via `containersFromGames` pair-strength sort), with forfeit games appended as separate rows at the end.
- Columns left→right: pair number, then per player: country flag with locale tooltip, rank/title badge, «familyName, givenName», rating (`capturedRating.value`), badge of points accumulated before the round; a result cell between the two players' blocks.
- Result symbols: no result → `? : ?`, player1 win → `+ : -`, player2 win → `- : +`, draw → `= : =`, bye → `+` (`=` for a draw-bye, consistent with the crosstable), forfeit row → `-`.
- Table headers: first three columns per player are empty; name-column headers show ☗ / ☖ when `settings.considerSente` is true (otherwise empty); «Рейтинг»/«Rating», «Очки»/«Pts», and «{{n}}-й тур»/«Round {{n}}» for the result column.
- New i18n keys under `tournament.view.results.*` in `ru` and `en` locale files.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tournament-public-page`: the «Результаты» tab stops being an empty placeholder and gains concrete requirements — published-round tab visibility, board ordering parity with the pairings board, table column composition, result symbol mapping, forfeit/bye row rendering, and sente-aware headers.

## Impact

- **New code**: `src/components/tournament/view/TournamentResultsSection.tsx`, `src/test/tournamentResultsSection.test.tsx`.
- **Modified code**: `src/pages/TournamentPage.tsx` (wire the new component), `src/locales/ru/translation.json`, `src/locales/en/translation.json`.
- **Reused (no changes)**: `src/components/tournament/pairings/pairingsModel.ts` (`containersFromGames`, `calculateParticipantPoints`), `src/components/tournament/crosstable/crosstableModel.ts` (`rankToColor`), `src/utils/countries.ts` (`getCountryName`).
- No domain model, service, or Firestore changes; purely presentational on the public page.
