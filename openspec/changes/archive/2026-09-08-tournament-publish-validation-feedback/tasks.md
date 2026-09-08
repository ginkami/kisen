## 1. Validator

- [x] 1.1 In `useTournamentForm.ts`: export `validateTournamentPublishForm`; add the `roundTime` check (rounds exist but some lack `scheduledAt`); keep `rounds` for "no rounds at all"
- [x] 1.2 Expose `setValidationErrors` from the `useTournamentForm` return object

## 2. Publish UX in TournamentEditForm

- [x] 2.1 Add a validation-error-key в†’ tab map and a `handlePublish` pre-check: on errors, set translated `validationErrors`, switch `activeTab` to the first failing tab, and skip the confirm dialog
- [x] 2.2 Pass `validationErrors` into `ScheduleSection`; highlight untimed round inputs (`input-error`) and show the localized hints for `roundTime`/`rounds`

## 3. Locales

- [x] 3.1 Add `tournament.edit.program.roundTimeRequired` and `tournament.edit.program.roundRequired` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 4. Tests

- [x] 4.1 Add `src/test/tournamentPublishValidation.test.ts`: validator cases (no rounds в†’ `rounds`; untimed round в†’ `roundTime`; all timed в†’ no schedule errors)
- [x] 4.2 Add `src/test/tournamentPublishFeedback.test.tsx`: clicking Publish with an untimed round switches to the schedule tab, shows the hint and highlighting, and does not open the confirm dialog; with a valid tournament the confirm dialog opens

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (571 + new)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate tournament-publish-validation-feedback` passes