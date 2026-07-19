## 1. Localize header language switcher

- [x] 1.1 In `src/components/LanguageSwitcher.tsx`, change the `ru` locale label from `RU` to `РУ`.
- [x] 1.2 Verify that both the header `LanguageSwitcher` and the form `LocaleTabs` show `РУ` / `EN`.

## 2. Make arbiter required in the domain model

- [x] 2.1 In `src/domain/tournament.ts`, remove `.optional()` from the `arbiter` field in `tournamentSchema`.
- [x] 2.2 Confirm that `publishedTournamentSchema` inherits the required arbiter.
- [x] 2.3 Update `CreateTournamentInput`/`CreateDraftInput` in `src/services/tournamentService.ts` so `arbiter` is required.
- [x] 2.4 Ensure `tournamentService.create` and `createDraft` pass the provided `arbiter` through to the repository.

## 3. Prefill arbiter from the authenticated user

- [x] 3.1 In `useTournamentForm.ts`, build a fallback arbiter from `firebaseUser.displayName` when the full profile has not loaded.
- [x] 3.2 Prefill `arbiter.locales.ru` and `arbiter.locales.en` from `user.locales` when available.
- [x] 3.3 Apply the prefilled/default arbiter both when creating a new draft and when a loaded tournament lacks an arbiter.

## 4. Render arbiter as mandatory in the UI

- [x] 4.1 In `TournamentEditForm.tsx`, remove the `ExpandableField` wrapper around the arbiter section.
- [x] 4.2 Render arbiter family/given name inputs as visible required fields with labels and asterisks.
- [x] 4.3 Keep the locale-aware behavior: inputs switch with the active locale tab.

## 5. Guard against legacy documents without arbiter

- [x] 5.1 In `src/services/firestoreTournamentRepository.ts`, make `fromFirestore` inject an empty default arbiter if the stored document does not contain one.

## 6. Verification

- [x] 6.1 Run `npm run lint` and fix any errors.
- [x] 6.2 Run `npm run build` and confirm it succeeds.
- [x] 6.3 Run `npx vitest run` and confirm all tests pass.
