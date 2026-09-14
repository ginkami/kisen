## 1. Knockout engine

- [x] 1.1 Create `src/components/tournament/pairings/knockoutEngine.ts` вЂ” pure module, no new dependencies; types: `KnockoutBracket`, `PairingError` reuse; reuses `calculateParticipantPoints`
- [x] 1.2 Implement `analyzeKnockoutBracket(participants, games, publishedRounds)`: candidate start rounds 1..publishedRounds (earliest valid wins); start-round checks вЂ” full coverage, byes only in start round, canonical strict seeding (points before start, then rating; bottom virtual padding to next power of two); later rounds вЂ” winners paired per bracket adjacency, every eliminated player exactly one forfeit game; returns `{ startRound, bracket }` for continuation or null
- [x] 1.3 Implement `generateKnockoutPairings(participants, games, round, publishedRounds, considerSente)`: reconcile manual games of the round (paired games kept between active players; forfeit games eliminate), bracket continuation when valid, otherwise canonical knockout round 1 вЂ” sort by (points, rating), bottom virtual padding to next power of two, strict seeding, byes to top seeds (`status: 'bye'`, `result: 'player1_won'`), forfeit games for every eliminated player (`status: 'forfeit'`, `result: 'player2_won'`); `PairingError` on impossible canonical form; sente assignment per considerSente (round 1 of a bracket: no color history вЂ” top seed preference)

## 2. Drawer integration

- [x] 2.1 `PairingToolsDrawer.tsx`: button `BsDiagram2Fill` В«РЎС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїР°СЂС‹ 1/{{n}} С„РёРЅР°Р»Р°В» under the Swiss button; `{n}` memoized via `analyzeKnockoutBracket` + manual reconciliation; handler applies all formed games via one `updateGames` call; `PairingError` в†’ alert modal
- [x] 2.2 i18n keys `generateKnockout` in `src/locales/{ru,en}/translation.json` (ru В«РЎС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїР°СЂС‹ 1/{{n}} С„РёРЅР°Р»Р°В», en "Generate pairings for the round of 1/{{n}}")

## 3. Tests

- [x] 3.1 Create `src/test/knockoutEngine.test.ts`: canonical round 1 for 6/7/8 players (exact pairs, byes to top seeds, n), bracket continuation over 2вЂ“3 rounds (bracket adjacency, forfeits for eliminated), manual pairs approximation, manual forfeit elimination ({n} counting), `PairingError` cases, analysis negatives (Swiss history, broken continuation)
- [x] 3.2 Extend `src/test/pairingToolsDrawer.test.tsx`: knockout button renders with the computed n, click applies one `updateGames` call, not gated by `actionsDisabled`

## 4. Validation

- [x] 4.1 Run `tsc -b`, `eslint .` (changed files), `vitest run`; fix regressions
