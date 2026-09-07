# Cascade: clear association links on delete

## Why

Deleting an association (`associationService.delete` → `firestoreAssociationRepository.delete` → `deleteDoc`) removes only the association document. All inbound references are left dangling:

- `tournaments.hostAssociation`
- `events.hostAssociation`
- `players.primaryAssociation`
- `players.secondaryAssociations[]`
- `regulations.association`

The UI silently degrades (e.g. `RegulationEditForm` falls back to «Не указана» when the referenced association is missing) and the broken links are invisible and unrecoverable. Additionally, `firestore.rules` currently **block** clearing these link fields even for admins, because `isValidHostAssociationChange` / `isValidEventHostAssociationChange` / `isValidAssociationChange` require `canActForAssociation(request...<new value>)`, which is always `false` for `null` — a latent bug that would deny any client-side cascade.

## What Changes

- **Repository layer:** add `updateMany(entities)` to `TournamentRepository`, `EventRepository`, `PlayerRepository`, `RegulationRepository` (Firestore `writeBatch`, chunked by ≤500 ops).
- **Player repository filters:** add `primaryAssociation` and `secondaryAssociations` (array-contains) list filters — currently the player repository has no association filters at all.
- **`AssociationService.delete(id)`:** cascade — discover linked documents via list filters, build cleaned entities (`sanitizeDeep` + zod `parse` + `updatedAt`, same normalization as the individual services), write them via per-collection `updateMany`, then delete the association document last.
- **`firestore.rules`:** allow link clearing by users who can act for the *old* association:
  - tournaments/events/regulations: `isValid*Change` also passes when `canActForAssociation(resource.data.get('hostAssociation'/'association', null))`;
  - players: update allowed when `canActForAssociation(resource.data.primaryAssociation)` or when the user can act for at least one association in the old `secondaryAssociations`.

## Impact

- Affected specs: `association-management`
- Affected code:
  - `src/services/repository.ts` (4 interfaces)
  - `src/services/firestoreTournamentRepository.ts`, `src/services/firestoreEventRepository.ts`, `src/services/firestorePlayerRepository.ts`, `src/services/firestoreRegulationRepository.ts` (or equivalent paths)
  - `src/services/associationService.ts`
  - `firestore.rules`
  - tests: new cascade unit tests, full suite must stay green
- Deliberately out of scope: Cloud Function triggers (no functions infrastructure in the repo); atomicity across collections (single-association delete is rare and admin-gated; worst case of a partial failure is the current status quo — dangling links; the operation is idempotent on retry).