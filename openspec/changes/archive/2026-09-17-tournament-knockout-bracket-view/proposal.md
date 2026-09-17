## Why

Tournaments often combine a Swiss stage with a knockout stage (or are pure knockout events). Today the knockout stage is invisible on the public tournament page: hosts and visitors cannot see the bracket, who advanced, or who meets whom next. The knockout pairing assistant already reconstructs brackets from played rounds — the same reconstruction can power a visual bracket view, and the bracket geometry (size, start round) needs to be stored on the tournament.

## What Changes

- Tournament settings gain `hasKnockoutBracket: { size: Int = 0, startRound: Int = 0 }` — the bracket size (power of two, 0 = no bracket) and the tournament round the knockout round 1 starts at. Legacy documents parse with the default (`{ size: 0, startRound: 0 }`).
- The tournament edit form's «Advanced Settings» section gains a daisyUI collapse «Показывать сетку плей-офф, если есть» (en: «Show knockout bracket, if any») with two range sliders:
  - «Размер сетки» (en: «Bracket size»): 0 (default), 4, 8, 16, … 1024 (non-uniform stops mapped through a slider index);
  - «Стартует с тура» (en: «Starts at round»): 0 (default), 1 … 10.
- New pure engine export `buildBracketView({ participants, games, publishedRounds, bracketSize, startRound })`: reconstructs the canonical bracket (start-round configuration search + bracket-adjacency follow-up, reusing `matchStartRound`/`followBracket`), projects the not-yet-played rounds down to the final as TBD slots, and returns null when the played rounds do not form the requested bracket.
- New public page tab «Сетка плей-офф» (en: «Knockout bracket», `BsDiagram2Fill`) shown when `settings.hasKnockoutBracket.size > 0`. The tab renders the bracket as HTML/CSS cards and connector lines (left-to-right columns per knockout round): locale-dependent «фамилия, имя» cards, highlighted winning lines with a small winner surname above the connector, bye cards, TBD placeholders, an emphasized champion card for the final. When the bracket cannot be reconstructed, the tab shows an informational empty state instead of the bracket.

## Capabilities

### Modified Capabilities
- `tournament-management`: ADDED requirements — knockout bracket settings in «Advanced Settings» (collapse + two sliders wired to `settings.hasKnockoutBracket`) and the «Сетка плей-офф» tab on the public tournament page (conditional, visual bracket, empty state).
- `knockout-engine`: ADDED requirement — `buildBracketView` reconstructs the bracket for the given size/start round from the published rounds, projects unplayed rounds to the final, and reports failure when the history does not form the requested bracket.

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md`, `openspec/specs/knockout-engine/spec.md` (ADDED requirements).
- **Affected code:** `src/domain/tournament.ts` (settings schema), `src/hooks/useTournamentForm.ts` (setter), `src/components/tournament/TournamentEditForm.tsx` (Advanced Settings collapse + sliders), `src/components/tournament/pairings/knockoutEngine.ts` (`buildBracketView`), new `src/components/tournament/view/KnockoutBracketSection.tsx`, `src/pages/TournamentPage.tsx` (tab), `src/locales/{en,ru}/translation.json`, tests (`tournament` schema defaults, `knockoutEngine` view builder, drawer/form harness where light).
