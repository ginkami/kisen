## 1. Domain helper

- [x] 1.1 Add `canEditPlayer(player, userId, isAdmin, managedAssociationIds)` to `src/domain/player.ts`
- [x] 1.2 Add unit tests `src/test/playerAccess.test.ts` (admin; creator regardless of role; primary association managed; secondary association intersect; unaffiliated; `primaryAssociation: null`)

## 2. Admin drawer search filtering

- [x] 2.1 Add optional `filter?: (player: Player) => boolean` prop to `PlayerSearchPanel`; render `visiblePlayers = filter ? playerResults.filter(filter) : playerResults` and use it for the empty state and the results list
- [x] 2.2 In `AdminDrawer`, compute `playerFilter` via `canEditPlayer` (`undefined` for admins or missing user; manager filter over `managedAssociationIds`) and pass it to `PlayerSearchPanel`

## 3. Player edit page guard

- [x] 3.1 In `PlayerEditForm`, read `firebaseUser`/`user` from `useAuth`, load `useMyAssociations(firebaseUser?.uid)`
- [x] 3.2 After the player query resolves: keep the spinner while associations are loading; if `player` exists and `!canEditPlayer(...)`, render the localized access-denied alert instead of the form
- [x] 3.3 Add `player.edit.errors.noAccess` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 4. Component test for the page guard

- [x] 4.1 Add `src/test/playerEditFormAccess.test.tsx` mocking `usePlayerForm`, `AuthContext`, and `useMyAssociations`: unauthorized player → "no access" message and no Save button; authorized player → full form renders

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (baseline 516 + new tests)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate restrict-player-edit-access` passes