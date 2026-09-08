## 1. Domain helper

- [x] 1.1 Add `canEditTournament(tournament, userId, isAdmin, managedAssociationIds)` to `src/domain/tournament.ts`
- [x] 1.2 Add unit tests `src/test/tournamentAccess.test.ts` (admin; creator; host association managed; unrelated tournament; `hostAssociation: null`)

## 2. Editable tournaments listing

- [x] 2.1 Add `tournamentService.listEditable(userId, managedAssociationIds, isAdmin)` (events `listEditable` pattern: admin в†’ all; else `createdBy` + one `hostAssociation` query per managed association; dedupe by id; sort `updatedAt` desc)
- [x] 2.2 Add `useEditableTournaments(userId, managedAssociationIds, isAdmin)` hook in `src/hooks/useTournaments.ts`

## 3. Admin drawer tournaments section

- [x] 3.1 Month list: load editable tournaments and filter client-side by selected month (replacing `listByYearMonth(userId)`), keeping the existing latest-round sort
- [x] 3.2 Filter title search results with `canEditTournament` and use the filtered list for parent-event title loading

## 4. Tournament edit page guards and logout

- [x] 4.1 `TournamentEditForm`: redirect unauthenticated visitors to `/login`
- [x] 4.2 `TournamentEditForm`: access guard вЂ” spinner while managed associations load; localized access-denied alert instead of the form when the loaded tournament is not editable; `/tournaments/new` unaffected
- [x] 4.3 `UserMenu`: after `logout()` navigate to `/`
- [x] 4.4 Add `tournament.edit.errors.noAccess` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 5. Tests

- [x] 5.1 Extend `src/test/tournamentAccess.test.ts` with `listEditable` service tests (admin, merge, dedupe)
- [x] 5.2 Add `src/test/tournamentEditFormAccess.test.tsx` (mocks: `useTournamentForm`, `AuthContext`, `useAssociations`): unauthenticated в†’ `/login`; unauthorized в†’ "no access" without Save/Publish/Delete; creator and admin в†’ form; loading associations keeps the spinner
- [x] 5.3 Add `src/test/userMenuLogout.test.tsx`: clicking logout calls `logout()` and navigates to `/`

## 6. Validation

- [x] 6.1 `npx tsc -b` passes
- [x] 6.2 `npx vitest run` all green (556 + new)
- [x] 6.3 `npx vite build` succeeds
- [x] 6.4 `openspec validate restrict-tournament-edit-access` passes