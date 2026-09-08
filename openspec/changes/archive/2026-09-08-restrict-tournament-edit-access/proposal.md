## Why

Firestore rules already restrict tournament writes to admins, the tournament's creator, and managers of the tournament's `hostAssociation`, but the UI contradicts this model: the drawer tournaments month list hides association tournaments from their managers (it filters by `createdBy` only), the title search lets users navigate to tournaments they cannot edit, and the tournament edit page has no authentication or access guard at all — after logout the page stays interactive, and a signed-out visitor can open any `/tournaments/:id/edit` by URL. Additionally, logging out leaves the user on the page they were on.

## What Changes

- Add a pure helper `canEditTournament(tournament, userId, isAdmin, managedAssociationIds)` in the tournament domain mirroring the Firestore tournament rules (`isAdmin || createdBy === userId || hostAssociation is managed`).
- Add `tournamentService.listEditable(userId, managedAssociationIds, isAdmin)` and a `useEditableTournaments` hook.
- Admin drawer "Tournaments" section: month list shows editable tournaments for the selected month; title search results filtered to editable tournaments.
- Guard `TournamentEditForm`: unauthenticated users are redirected to `/login`; a loaded tournament the user may not edit renders a localized access-denied alert instead of the form (spinner while managed associations load).
- Logout navigates to the home page (`/`).
- New locale key `tournament.edit.errors.noAccess` (ru/en).

## Capabilities

### New Capabilities

- `tournament-edit-access`: client-side gating of tournament edit access — the shared editability rule, the editable tournaments listing, drawer month list and search filtering, and the authentication/access guards on the tournament edit page.

### Modified Capabilities

- `admin-drawer-session`: the logout requirement is extended — logging out also navigates to the home page.

## Impact

- `src/domain/tournament.ts` (helper), `src/services/tournamentService.ts` (`listEditable`), `src/hooks/useTournaments.ts` (hook), `src/components/AdminDrawer.tsx` (month list + search filter), `src/components/tournament/TournamentEditForm.tsx` (guards), `src/components/UserMenu.tsx` (logout navigation), `src/locales/ru/translation.json` + `en`.
- No Firestore rules or index changes — composite indexes (`createdBy`+`updatedAt`, `hostAssociation`+`updatedAt`) already exist.
- Out of scope: `canEditBinding` visibility in the tournament form (already implemented).