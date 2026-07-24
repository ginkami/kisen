## 1. Default tournament settings

- [ ] 1.1 Update `defaultSettings()` in `src/services/tournamentService.ts` to return byoyomi time control (`{ type: 'byoyomi', mainTime: 0, byoyomiTime: 0, byoyomiPeriods: 1 }`)
- [ ] 1.2 Update `defaultSettings()` in `src/services/tournamentService.ts` to return default tie-breaks `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }]`

## 2. Tie-breaks UX — multiple buchholz_cut with cutCount

- [ ] 2.1 Update `addTieBreak` in `src/hooks/useTournamentForm.ts` to accept an optional `cutCount` parameter; remove duplicate check for `buchholz_cut`
- [ ] 2.2 Update `TieBreaksSection` in `src/components/tournament/TournamentEditForm.tsx`: allow `buchholz_cut` duplicates in `availableTypes` filter, add `cutCount` NumberField (conditional on `selectedType === 'buchholz_cut'`), pass `cutCount` to `onAdd`, change React key from `tb.type` to array index

## 3. i18n

- [ ] 3.1 Add `tournament.edit.tieBreaks.cutCount` key to `src/locales/en/translation.json`
- [ ] 3.2 Add `tournament.edit.tieBreaks.cutCount` key to `src/locales/ru/translation.json`

## 4. Tests

- [ ] 4.1 Create `src/services/tournamentService.test.ts` with mocked repository; test `createDraft` returns byoyomi time control and three-item tie-break sequence

## 5. Verification

- [ ] 5.1 Run `npm run lint` and confirm no errors
- [ ] 5.2 Run `npm run test:run` and confirm all tests pass