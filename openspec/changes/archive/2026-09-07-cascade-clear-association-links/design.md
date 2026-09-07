# Design: Cascade: clear association links on delete

## Context

`AssociationService.delete(id)` today performs a bare `deleteDoc` on the association document. Five inbound reference fields across four collections keep pointing at the deleted id. A client-side cascade must also survive `firestore.rules`, which currently denies clearing any of these fields (the `isValid*Change` helpers only validate manager rights on the *new* association value; `null` always fails).

## Goals / Non-Goals

- **Goals:** no dangling association references after `delete`; rules permit the cleanup performed by the association's manager/creator/admin; normalization parity with existing service updates; keep vendor isolation (batch logic in Firestore repositories only).
- **Non-Goals:** server-side (Cloud Function) cascade; cross-collection atomicity; backfill migration for already-dangling references.

## Decisions

### D1: `updateMany` per repository (variant 1), not a shared `WriteBatch`

Each of the four repository interfaces gains `updateMany(entities: T[]): Promise<void>`, implemented with a Firestore `writeBatch` in the corresponding `firestore*Repository` (chunks of ≤500 ops). `AssociationService.delete` calls it once per affected collection.

- *Why not a single shared batch:* threading the SDK `WriteBatch` through the vendor-neutral `repository.ts` interfaces leaks Firebase types into the abstraction. Per-collection batches keep interfaces clean.
- *Why acceptable to lose cross-collection atomicity:* the association document is deleted **last**; a partial failure leaves dangling links — the exact status quo before this change — and re-running `delete` is idempotent (list filters return fewer documents).

### D2: Discovery via existing + new list filters

- `tournamentRepository.list({ hostAssociation: id })` — filter already exists.
- `eventRepository.list({ hostAssociation: id })` — filter already exists.
- `regulationRepository.list({ association: id })` — filter already exists.
- `playerRepository.list({ primaryAssociation: id })` and `playerRepository.list({ secondaryAssociations: id })` — **new** filters (array-contains). Single-field `where` clauses need no composite indexes.

### D3: Normalization parity inside `AssociationService`

The cleaned entities are built in `AssociationService.delete` mirroring each entity's regular update path: `sanitizeDeep()` + refreshed `updatedAt` for tournaments/events/regulations (matching `TournamentService.update` / `EventService.update` / `RegulationService.update`, none of which schema-parse on update), and additionally `playerSchema.parse()` for players (matching `PlayerService.update`). Full-document zod parsing is deliberately avoided for tournaments/events to not reject legacy documents that the regular update paths accept.

### D4: Rules changes — allow clearing by the *old* association's staff

- `isValidHostAssociationChange` / `isValidEventHostAssociationChange` / `isValidAssociationChange`: additionally allow when `canActForAssociation(resource.data.get('hostAssociation'|'association', null))` — the manager/creator of the association being unlinked may clear it.
- Players `allow update`: add `|| canActForAssociation(resource.data.primaryAssociation)` (creator was previously excluded — `hasPlayerManagerAccess` only checks `isManagerOf`) and a secondary-list condition: the update is allowed when the user can act for at least one association in the old `secondaryAssociations`, expressed as `!resource.data.secondaryAssociations.hasOnly([...])`-style negated-`all` trick: `!(resource.data.secondaryAssociations.all(a, !canActForAssociation(a)))`. Lists are small (≤ a few entries), so the 10-`get()` rules budget is not at risk.

## Risks / Trade-offs

- [Partial failure between collection batches leaves some links dangling] → association doc deleted last; operation idempotent; admin can re-run delete.
- [Secondary-lists rule is broader than strictly needed (manager of any secondary association gains player-update rights)] → mirrors the existing trust model where a primary-association manager already has full player-update rights; rights still require an association role.
- [Batch limit 500 ops] → `updateMany` chunks; associations realistically link far fewer docs.
- [Rules cannot be unit-tested in the current setup (no emulator harness)] → verified by reading rules + manual check against staging; service-level cascade covered by unit tests.

## Migration Plan

Rules deploy must precede (or ship with) the app change; deploying app first only produces denied batch writes (old behavior preserved). Rollback: revert app change; rules additions are strictly additive permissions.

## Open Questions

None — approach approved by the user (variant 1: `updateMany` per collection).