## ADDED Requirements

### Requirement: Player editability rule

The system SHALL provide a single pure helper `canEditPlayer(player, userId, isAdmin, managedAssociationIds)` in the player domain that returns `true` exactly when `isAdmin` is `true`, or `player.createdBy === userId`, or `player.primaryAssociation` is in `managedAssociationIds`, or any of `player.secondaryAssociations` is in `managedAssociationIds`. Both the admin drawer player search and the player edit page SHALL use this helper as their only source of truth for client-side edit access.

#### Scenario: Admin may edit any player

- **WHEN** `canEditPlayer` is called with `isAdmin: true` for any player
- **THEN** it returns `true`

#### Scenario: Creator may edit own player

- **WHEN** `player.createdBy` equals `userId` regardless of the user's role
- **THEN** `canEditPlayer` returns `true`

#### Scenario: Manager of an affiliated association may edit

- **WHEN** the player's `primaryAssociation` or one of its `secondaryAssociations` is in `managedAssociationIds`
- **THEN** `canEditPlayer` returns `true`

#### Scenario: Unaffiliated player is not editable

- **WHEN** the user is not an admin, did not create the player, and manages none of the player's associations
- **THEN** `canEditPlayer` returns `false`
- **AND** a player with `primaryAssociation: null` and no managed `secondaryAssociations` is not editable by a non-admin non-creator

### Requirement: Admin drawer player search shows only editable players

The AdminDrawer player search SHALL present only players the current user may edit according to the player editability rule. For admins the search SHALL behave as before and show all matching players. When every search result is filtered out, the panel SHALL show the existing localized "no players found" message.

#### Scenario: Manager searches for an unaffiliated player

- **WHEN** a manager searches by family name and a matching player has no relation to the manager (not created by them, no managed association)
- **THEN** that player SHALL NOT appear in the search results

#### Scenario: Manager searches for an affiliated player

- **WHEN** a manager searches and a matching player was created by the manager or is affiliated with an association the manager controls (primary or secondary)
- **THEN** that player SHALL appear in the search results and selecting it navigates to its edit page

#### Scenario: Admin sees all results

- **WHEN** an admin uses the player search in the drawer
- **THEN** all matching players are listed regardless of `createdBy` or associations

#### Scenario: All results filtered out

- **WHEN** the search returns players but none are editable by the current manager
- **THEN** the panel displays the localized "no players found" message

### Requirement: Player edit page blocks unauthorized direct access

When `/players/:id/edit` loads an existing player that the current user may not edit according to the player editability rule, the page SHALL render a localized access-denied alert instead of the player edit form, and no form fields, save, or delete controls SHALL be rendered. While the user's managed-associations query is still loading, the page SHALL keep rendering the loading state so the access verdict cannot flash incorrectly. The creation route (`/players/new`) SHALL NOT be affected by the guard.

#### Scenario: Manager opens an unauthorized player edit page by URL

- **WHEN** a manager navigates directly to `/players/:id/edit` of a player they may not edit
- **THEN** the page shows the localized "no access" message instead of the edit form

#### Scenario: Authorized user opens an editable player

- **WHEN** the current user may edit the loaded player
- **THEN** the page renders the full edit form as before

#### Scenario: Associations still loading

- **WHEN** the player has loaded but the user's managed-associations query is in flight
- **THEN** the page keeps showing the loading spinner and does not render the access-denied state