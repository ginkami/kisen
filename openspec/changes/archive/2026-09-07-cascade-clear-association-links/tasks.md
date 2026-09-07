## 1. Repository layer: batched updates

- [x] 1.1 Add `updateMany(entities: T[]): Promise<void>` to `TournamentRepository`, `EventRepository`, `PlayerRepository`, `RegulationRepository` interfaces in `src/services/repository.ts`
- [x] 1.2 Implement `updateMany` in the Firestore repositories using `writeBatch` with chunking by 500 operations
- [x] 1.3 Add `primaryAssociation` and `secondaryAssociations` (array-contains) filters to the player repository `list()`

## 2. Association service cascade

- [x] 2.1 In `AssociationService.delete(id)`: discover linked documents via list filters (tournaments/events by `hostAssociation`, players by `primaryAssociation` and `secondaryAssociations`, regulations by `association`)
- [x] 2.2 Build cleaned entities with normalization parity (`sanitizeDeep`, zod schema `parse`, `updatedAt`) and write them via per-collection `updateMany`
- [x] 2.3 Delete the association document only after all cleanups succeed (keep idempotency on retry)

## 3. Firestore rules

- [x] 3.1 Allow clearing `hostAssociation`/`association` when the user can act for the old association (`isValidHostAssociationChange`, `isValidEventHostAssociationChange`, `isValidAssociationChange`)
- [x] 3.2 Players: allow update when `canActForAssociation(resource.data.primaryAssociation)` or when the user can act for at least one association in the old `secondaryAssociations`

## 4. Tests and verification

- [x] 4.1 Unit tests for `AssociationService.delete` with mocked repositories: all five link types cleared, entities schema-validated, association deleted last, idempotent on retry
- [x] 4.2 Run full `npx vitest run` (expect 516+ green) and `tsc -b`
- [x] 4.3 Manual verification checklist for the user (staging rules deploy + delete with linked docs) - commits and archiving deferred until user confirmation
