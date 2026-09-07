## ADDED Requirements

### Requirement: Association deletion cascade

When an association is deleted, the application SHALL clear all inbound references to it before deleting the association document: `hostAssociation` on tournaments and events whose value is the deleted id, `primaryAssociation` on players whose value is the deleted id, the deleted id in players' `secondaryAssociations` arrays, and `association` on regulations whose value is the deleted id. Cleared documents SHALL be written via batched repository updates (`updateMany`, chunks of at most 500 operations) with the same normalization applied by regular updates (sanitize, schema validation, `updatedAt`). The association document SHALL be deleted only after all link cleanups succeed.

#### Scenario: Deleting an association clears hostAssociation on its tournaments

- **WHEN** an association is deleted while tournaments reference it via `hostAssociation`
- **THEN** each such tournament's `hostAssociation` is cleared (null) and saved via a batched update with `updatedAt` refreshed

#### Scenario: Deleting an association clears hostAssociation on its events

- **WHEN** an association is deleted while events reference it via `hostAssociation`
- **THEN** each such event's `hostAssociation` is cleared (null) and saved via a batched update

#### Scenario: Deleting an association clears primaryAssociation on players

- **WHEN** an association is deleted while players reference it via `primaryAssociation`
- **THEN** each such player's `primaryAssociation` is cleared (null) and saved via a batched update

#### Scenario: Deleting an association removes the id from players' secondaryAssociations

- **WHEN** an association is deleted while players list it in `secondaryAssociations`
- **THEN** the deleted id is removed from each such player's `secondaryAssociations` array via a batched update

#### Scenario: Deleting an association clears association on its regulations

- **WHEN** an association is deleted while regulations reference it via `association`
- **THEN** each such regulation's `association` is cleared (null) and saved via a batched update

#### Scenario: Association document is deleted last

- **WHEN** the cascade completes its link cleanups
- **THEN** the association document itself is deleted afterwards, and if a cleanup fails the association document remains intact

### Requirement: Firestore rules for association link clearing

Firestore rules SHALL allow a user who can act for an association (admin, its creator, or a user in its `managers` array) to clear references to that association on tournaments, events, players, and regulations — including clearing `hostAssociation`/`association` to null, clearing `primaryAssociation` to null, and removing the association id from `secondaryAssociations`. Clearing the link SHALL NOT require rights on the replacement (null) value, and rules SHALL NOT block these writes the way the current change-validation helpers do.

#### Scenario: Manager of the deleted association clears a tournament's hostAssociation

- **WHEN** a manager of association X sets `hostAssociation` from X to null on a tournament they do not own
- **THEN** Firestore allows the update

#### Scenario: Creator of the deleted association clears a player's primaryAssociation

- **WHEN** the creator (not necessarily a manager) of association X clears `primaryAssociation` from X on a player they do not own
- **THEN** Firestore allows the update

#### Scenario: Manager removes the association from a player's secondaryAssociations

- **WHEN** a manager of association X removes X from a player's `secondaryAssociations`
- **THEN** Firestore allows the update

#### Scenario: Unrelated user cannot clear association links

- **WHEN** a user who is not admin, not owner of the document, and cannot act for the referenced association clears an association link on a tournament, event, player, or regulation
- **THEN** Firestore denies the update