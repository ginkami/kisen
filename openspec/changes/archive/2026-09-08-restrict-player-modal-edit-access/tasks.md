## 1. Shared hook

- [x] 1.1 Create `src/hooks/usePlayerAccess.ts` with `usePlayerEditAccess(player)` returning `{ isChecking, allowed }` (uses `useAuth`, `useMyAssociations`, `canEditPlayer`)
- [x] 1.2 Refactor `PlayerEditForm.tsx` to use the hook (inline guard wiring removed, behavior unchanged)

## 2. Modal guard

- [x] 2.1 In `PlayerEditModal.tsx`: extend the spinner state with `isCheckingAccess`; when the player is loaded and not allowed, render the localized access-denied alert instead of `PlayerInfoSection` and hide the Confirm button (Cancel/close intact)

## 3. Tests

- [x] 3.1 Add `src/test/playerEditModalAccess.test.tsx` (mocks: `playerService`, `AuthContext`, `useAssociations`): denied manager sees "no access" without Confirm but with Cancel; creator/managed-association/admin see the form; loading associations keeps the spinner

## 4. Validation

- [x] 4.1 `npx tsc -b` passes
- [x] 4.2 `npx vitest run` all green (536 + new)
- [x] 4.3 `npx vite build` succeeds
- [x] 4.4 `openspec validate restrict-player-modal-edit-access` passes