## Context

The public tournament page (`TournamentPage`) renders five content tabs; the «Результаты» tab currently renders an empty placeholder. All data needed for the results view is already present on the public `Tournament` object: `games`, `participants`, `schedule.rounds`, `currentRound`, and `settings.considerSente`. The edit-mode pairings board already defines a canonical per-round board ordering (`containersFromGames` → `comparePairStrength`: descending max pair points accumulated *before* the round, tie-broken by descending max pair rating) and a points function (`calculateParticipantPoints`) whose semantics we must reuse so the results table matches what organizers see.

## Goals / Non-Goals

**Goals**
- Read-only per-round results view for the same boards, in the same order, as the edit-mode `PairingsSection` board.
- Round tab visibility limited to published rounds (`currentRound` = number of published draws; `schedule.rounds.length` = total).
- Consistent visual language with `PlayersTable` / `CrosstableView` (flags, rank/title badges, table styling) and full ru/en i18n.

**Non-Goals**
- No editing, result entering, or drag-and-drop — read-only.
- No changes to `pairingsModel`, domain models, services, or Firestore.
- No extraction of a shared `RankBadge` component (the badge markup stays duplicated as it already is between `PlayersTable` and `CrosstableView`); refactoring existing tables is out of scope.
- No pagination/virtualization — tournament sizes are small (MVP).

## Decisions

- **Component placement and props**: `src/components/tournament/view/TournamentResultsSection.tsx` with props `{ games, participants, roundCount, currentRound, considerSente }`, mirroring `CrosstableView`'s prop style (data in, no `Tournament` object). Locale is resolved inside via `useTranslation()` like every other view component.
- **Round visibility**: `currentRound` equals the number of published draws, so published rounds are `1..min(roundCount, currentRound)`; when `currentRound === 0` the section renders the heading plus a localized empty-state message and no tabs/table. Default active tab = last published round. (User decision: future rounds get no tabs at all, unlike the edit form which disables them.)
- **Board ordering parity**: rows for pairs and byes come from `containersFromGames(games, participants, activeRound).games` — already sorted by pair strength, identical to what `PairingsBoard` renders. Forfeit games are excluded by `containersFromGames`, so they are fetched separately from `gamesForRound(games, activeRound)` (`status === 'forfeit'`) and appended as trailing rows (user decision), each rendering a single player and a «-» result.
- **Result symbols** (single mapping function local to the component): `result == null` → `? : ?`; `player1_won` → `+ : -`; `player2_won` → `- : +`; `draw` → `= : =`; `status === 'bye'` → `+`, except a draw-bye (`result === 'draw'`) renders `=` to stay consistent with `CrosstableView.roundCell` on the same page; forfeit row → `-`. `live`/`adjourned` games without a result naturally render `? : ?`.
- **Points before the round**: `calculateParticipantPoints(games, pid, activeRound - 1, participant.startingPoints ?? 0)` — the exact call used by `comparePairStrength`, so the badge values always agree with the board ordering. Displayed as a small daisyUI badge.
- **Player cells**: reuse the existing markup patterns verbatim — flag with `getCountryName(nat, locale)` tooltip, rank badge with `rankToColor` background and `PiCrownSimple` crown tooltip for the title (as in `PlayersTable.tsx:73`), name as `familyName, givenName` with the `locales[locale] ?? ru ?? en` fallback chain, rating from `capturedRating.value`.
- **Table header**: 12 columns — pair number; per player: flag, rank, name, rating, points; result column. First three columns per player have empty headers; name headers are ☗ / ☖ when `considerSente` else empty; «Рейтинг»/«Rating», «Очки»/«Pts»; result header «{{n}}-й тур»/«Round {{n}}» with the active round number.
- **i18n keys** under `tournament.view.results.*`: `rounds`, `rating`, `pts`, `round` (interpolated `{{n}}`), `noResults`. Added to both `ru` and `en` locale files.

## Risks / Trade-offs

- [Duplicate badge markup (third copy)] → Accepted; matches existing codebase duplication, keeps this change side-effect-free. A shared component can be extracted in a separate change.
- [`currentRound` as proxy for "published rounds"] → `publishedRounds` exists in the domain but is not used anywhere in the UI; if the semantics of `currentRound` ever diverge, the round-visibility rule is isolated to one `useMemo` in the component.
- [Half-point bye renders `=` while the requirements text said `+`] → Deliberate deviation to match `CrosstableView` behavior on the same page; flagged in the design review with the user.

## Migration Plan

Purely additive UI change: new component, new locale keys, one-line wiring in `TournamentPage`. Rollback = revert the commit. No data or API changes.

## Open Questions

None — round visibility and forfeit rendering were confirmed with the user before implementation.
