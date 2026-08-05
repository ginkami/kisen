## 1. Domain schema

- [x] 1.1 In `src/domain/tournament.ts`, add `considerSente: z.boolean().default(false)` to `tournamentSettingsSchema`.
- [x] 1.2 In `src/domain/tournament.ts`, add `currentRound: z.number().int().default(0)` to `tournamentSchema`.

## 2. Service layer

- [x] 2.1 In `src/services/tournamentService.ts`, add `considerSente: false` to the object returned by `defaultSettings()`.
- [x] 2.2 In `src/services/tournamentService.ts`, add `currentRound: 0` to the tournament object literal in `create()`.
- [x] 2.3 In `src/services/tournamentService.ts`, add `currentRound: 0` to the tournament object literal in `createDraft()`.

## 3. Form hook

- [x] 3.1 In `src/hooks/useTournamentForm.ts`, add an `updateConsiderSente(value: boolean)` updater (mirroring `updateTimeControlField`) that updates `state.settings.considerSente` via `updateForm`.
- [x] 3.2 Expose `updateConsiderSente` from the hook's return object.

## 4. Tournament edit form UI

- [x] 4.1 In `src/components/tournament/TournamentEditForm.tsx`, add an `AdvancedSettingsSection` component (card style matching `TieBreaksSection`) containing a daisyUI toggle bound to `settings.considerSente`.
- [x] 4.2 Destructure `updateConsiderSente` from the `useTournamentForm` call in `TournamentEditForm`.
- [x] 4.3 Render `<AdvancedSettingsSection>` in the Settings tab block (after `<TieBreaksSection>`), passing `considerSente` and `onConsiderSenteChange`.

## 5. i18n

- [x] 5.1 In `src/locales/ru/translation.json`, add keys `tournament.edit.advanced.title` = "Дополнительно" and `tournament.edit.advanced.considerSente` = "Учитывать цвет в результатах партий".
- [x] 5.2 In `src/locales/en/translation.json`, add keys `tournament.edit.advanced.title` = "Advanced" and `tournament.edit.advanced.considerSente` = "Consider piece color in game results".

## 6. Verification

- [x] 6.1 Run `npm run build` and confirm no type errors.
- [ ] 6.2 (Optional) Add assertions in `src/services/tournamentService.test.ts` that `createDraft` yields `currentRound: 0` and `settings.considerSente: false`.
