## 1. Cache invalidation

- [x] 1.1 In `useTournamentForm.ts`: replace the four orphaned `['adminTournaments']` invalidations with `['tournaments']` (draft-creation effect, `saveMutation.onSuccess`, `publishMutation.onSuccess`, `deleteMutation.onSuccess`)
- [x] 1.2 In `NewTournamentButton.tsx`: invalidate `['tournaments']` after a successful `createDraft`
- [x] 1.3 Remove the orphaned `['adminEvents']` invalidations in `useTournamentForm.ts` (no consumers remain; `['events']` already covers the drawer events list)

## 2. Tests

- [x] 2.1 Add `src/test/newTournamentButton.test.tsx` (mocks: `tournamentService`, `AuthContext`, i18n): clicking the create button calls `createDraft`, invalidates `['tournaments']` via `queryClient.invalidateQueries`, and navigates to `/tournaments/:id/edit`

## 3. Validation

- [x] 3.1 `npx tsc -b` passes
- [x] 3.2 `npx vitest run` all green (578 + new)
- [x] 3.3 `npx vite build` succeeds
- [x] 3.4 `openspec validate fix-tournament-list-cache-invalidation` passes