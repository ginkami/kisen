## Why

The admin panel (`AdminDrawer`) currently only manages tournaments. There is no way to browse, search, create, or edit player profiles from the UI, even though the `players` Firestore collection and domain model (`src/domain/player.ts`) already exist. Player management is the foundational capability needed before tournaments can reference participants by player ID. Additionally, regular users (role `user`) should be restricted from creating/editing players — only admins and managers should have this access.

## What Changes

- Add a "Players" section to the admin panel accordion with search (by familyName, min 3 chars) and card-based results
- Create the player service layer (`PlayerService`, `FirestorePlayerRepository`) following the existing repository pattern
- Add player edit page routes (`/players/new`, `/players/:id/edit`) with placeholder edit forms
- Add composite Firestore indexes for `locales.ru.familyName` and `locales.en.familyName`
- The Players section is disabled (visually locked) for users with role `user`

## Capabilities

### New Capabilities
- `player-management`: Player CRUD operations and search through the admin panel

### Modified Capabilities
- `admin-panel`: The admin panel accordion gets a new "Players" section with role-based access control

## Impact

- **New files**: `firestorePlayerRepository.ts`, `playerService.ts`, `usePlayers.ts`, `PlayerEditPage.tsx`, `PlayerEditForm.tsx`
- **Modified files**: `AdminDrawer.tsx`, `App.tsx`, `repository.ts`, `firestore.indexes.json`, `ru/translation.json`, `en/translation.json`
- **No breaking changes**: purely additive