# Tasks

## 1. Engine

- [x] 1.1 Rewrite `src/components/tournament/pairings/knockoutEngine.ts`: `generateKnockoutRoundGames({ participants, games, round, publishedRounds, considerSente, bracketSize, knockoutRound })` — knockout round 1 from unpaired players (bounds `bracketSize/2 ≤ unpaired ≤ bracketSize`, canonical seeding, byes to top seeds), continuation via deterministic start round `publishedRounds + 2 − knockoutRound` with bracket-adjacency checks and no forfeit requirements; `PairingError` on impossible input; remove `analyzeKnockoutBracket`, `planKnockoutRound`, `generateKnockoutPairings` and the label `n` logic

## 2. UI

- [x] 2.1 `PairingToolsDrawer.tsx`: replace the knockout button with the «Игры плей-офф» card (title, bracket size select persisted to localStorage per tournamentId, knockout round select 1..publishedRounds+1, generate button); block the card via `actionsDisabled`
- [x] 2.2 `TournamentEditForm.tsx`: pass `tournamentId` to the drawer
- [x] 2.3 i18n: add `knockoutTitle`, `knockoutBracketSize`, `knockoutRound`, `generateKnockoutPairs`; remove `generateKnockout`, `generateKnockoutFinal` (en + ru)

## 3. Tests

- [x] 3.1 Rewrite `knockoutEngine.test.ts` for the new API (round 1 bounds and seeding, continuation without forfeits, manual-game conflicts, kept manual forfeits)
- [x] 3.2 Update `pairingToolsDrawer.test.tsx` (card rendering, selects, localStorage persistence, blocking, single history action, PairingError alert)

## 4. Validation

- [x] 4.1 `tsc -b`, `vitest run`, `openspec validate --links` pass
