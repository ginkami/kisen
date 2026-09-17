# Tasks

## 1. Domain and form

- [x] 1.1 `src/domain/tournament.ts`: `knockoutBracketSettingsSchema` (`size`/`startRound` ints default 0) added to `tournamentSettingsSchema.hasKnockoutBracket` with default
- [x] 1.2 `src/hooks/useTournamentForm.ts`: `updateHasKnockoutBracket` setter (pattern of `updateConsiderSente`)
- [x] 1.3 `TournamentEditForm.tsx` — `AdvancedSettingsSection`: daisyUI collapse «Показывать сетку плей-офф, если есть» with the bracket-size slider (index 0..9 → 0/4/8/16/32/64/128/256/512/1024, value badge) and the start-round slider (0..10, badge); hint when size > 0 but startRound = 0

## 2. Engine and view

- [x] 2.1 `knockoutEngine.ts`: export `buildBracketView` — canonical reconstruction via `matchStartRound`/`followBracket` + projection of unplayed rounds to the final; null on failure
- [x] 2.2 New `src/components/tournament/view/KnockoutBracketSection.tsx`: HTML/CSS bracket (columns, cards, connectors, winner highlighting, winner surname above connector, bye cards, TBD placeholders, champion card, empty state)
- [x] 2.3 `TournamentPage.tsx`: conditional «Сетка плей-офф» tab (`BsDiagram2Fill`) rendering the section

## 3. i18n and tests

- [x] 3.1 i18n en/ru: tab label, collapse title, slider labels, hint, view labels
- [x] 3.2 Tests: settings schema defaults; `buildBracketView` (canonical bracket, TBD projection, failure, embedded extras)

## 4. Validation

- [x] 4.1 `tsc -b`, `vitest run`, `openspec validate tournament-management knockout-engine` pass
