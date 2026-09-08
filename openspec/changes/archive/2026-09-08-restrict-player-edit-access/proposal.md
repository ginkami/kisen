## Why

Firestore rules already deny player updates to everyone except admins, the player's creator, and managers of the player's associations — but the UI still lets managers discover and open any player. Selecting such a player from the admin drawer (or opening `/players/:id/edit` directly) leads to a form that silently fails on save. The UI should mirror the rules so dead-end editors are never offered.

## What Changes

- Add a shared pure helper `canEditPlayer(player, userId, isAdmin, managedAssociationIds)` in the player domain that mirrors the Firestore player-update rules (`isAdmin || createdBy === userId || primary/secondary association is managed`).
- Filter player search results in the admin drawer: for non-admin users only players they may edit are listed (admins still see all).
- Guard `/players/:id/edit`: when the loaded player is not editable by the current user, the page shows an access-denied message instead of the edit form (spinner while the user's managed associations are loading, so the verdict never flashes incorrectly).
- New locale key `player.edit.errors.noAccess` (ru/en).
- `/players/new` and player creation flow are unchanged.

## Capabilities

### New Capabilities

- `player-edit-access`: client-side gating of player edit access — the shared editability rule, admin drawer search filtering, and the direct-URL guard on the player edit page.

### Modified Capabilities

- `player-management`: the edit route requirement now specifies that loading an existing player the user may not edit renders an access-denied state instead of the form.

## Impact

- `src/domain/player.ts` (new pure helper), `src/components/player/PlayerSearchPanel.tsx` (optional `filter` prop), `src/components/AdminDrawer.tsx` (player search filter), `src/components/player/PlayerEditForm.tsx` (URL guard via `useMyAssociations`), `src/locales/ru/translation.json` + `src/locales/en/translation.json` (new key).
- No backend, Firestore rules, or index changes — the UI mirrors the already-deployed rules.
- Out of scope: `PlayerEditModal` used by tournament participant rows (same dead-end exists there; separate change).