## ADDED Requirements

### Requirement: Tournament editability rule

The system SHALL provide a single pure helper `canEditTournament(tournament, userId, isAdmin, managedAssociationIds)` in the tournament domain that returns `true` exactly when `isAdmin` is `true`, or `tournament.createdBy === userId`, or `tournament.hostAssociation` is non-null and in `managedAssociationIds`. The drawer tournament search filter and the tournament edit page guard SHALL use this helper as their only source of truth for client-side edit access.

#### Scenario: Admin may edit any tournament

- **WHEN** `canEditTournament` is called with `isAdmin: true` for any tournament
- **THEN** it returns `true`

#### Scenario: Creator may edit own tournament

- **WHEN** `tournament.createdBy` equals `userId` regardless of the user's role
- **THEN** `canEditTournament` returns `true`

#### Scenario: Manager of the host association may edit

- **WHEN** the tournament's `hostAssociation` is in `managedAssociationIds`
- **THEN** `canEditTournament` returns `true`

#### Scenario: Unaffiliated tournament is not editable

- **WHEN** the user is not an admin, did not create the tournament, and does not manage the tournament's `hostAssociation`
- **THEN** `canEditTournament` returns `false`
- **AND** a tournament with `hostAssociation: null` is not editable by a non-admin non-creator

### Requirement: Editable tournaments listing

The `TournamentService` SHALL provide a `listEditable(userId, managedAssociationIds, isAdmin)` method returning the tournaments the current user may edit: all tournaments for admins; otherwise the tournaments created by the user plus tournaments whose `hostAssociation` belongs to the managed associations, deduplicated by id and sorted by `updatedAt` descending. A `useEditableTournaments(userId, managedAssociationIds, isAdmin)` hook SHALL expose this list via TanStack Query.

#### Scenario: Admin lists editable tournaments

- **WHEN** `listEditable` is called with `isAdmin: true`
- **THEN** all tournaments are returned

#### Scenario: User lists editable tournaments

- **WHEN** `listEditable` is called for a non-admin user
- **THEN** the result contains tournaments they created and tournaments under associations they manage, each tournament appearing exactly once
- **AND** tournaments with no relation to the user are not included

### Requirement: Admin drawer tournaments lists only editable tournaments

The drawer's "Tournaments" section month list SHALL show only tournaments the current user may edit according to the tournament editability rule, filtered client-side to the selected month (all tournaments for admins). The title search results SHALL be filtered to the editable tournaments; when nothing editable matches, the existing "no search results" message SHALL be shown. Selecting a tournament from either list SHALL navigate to `/tournaments/:id/edit`.

#### Scenario: Manager views the month list

- **WHEN** a manager opens the Tournaments section and selects a month
- **THEN** tournaments they created plus tournaments under associations they manage for that month are listed

#### Scenario: Manager searches for an unaffiliated tournament

- **WHEN** a manager searches by title and a matching tournament has no relation to them
- **THEN** that tournament is not displayed in the search results

#### Scenario: All search results filtered out

- **WHEN** every matching tournament is unrelated to the current manager
- **THEN** the "no search results" message is displayed

#### Scenario: Admin sees all results

- **WHEN** an admin uses the month list or the title search
- **THEN** all matching tournaments are listed regardless of ownership or associations

### Requirement: Tournament edit page requires authentication and edit access

The tournament edit page SHALL redirect unauthenticated visitors to `/login`. When an existing loaded tournament may not be edited by the current user according to the tournament editability rule, the page SHALL render a localized access-denied alert instead of the edit form, and no form fields, save, publish, or delete controls SHALL be rendered. While the user's managed-associations query is still loading, the page SHALL keep rendering the loading state so the access verdict cannot flash incorrectly. The creation route (`/tournaments/new`, where no tournament is loaded yet) SHALL NOT be affected by the access guard.

#### Scenario: Signed-out visitor opens a tournament edit page by URL

- **WHEN** an unauthenticated visitor navigates to `/tournaments/:id/edit`
- **THEN** the page redirects to `/login`

#### Scenario: User opens a tournament they may not edit

- **WHEN** a user navigates to `/tournaments/:id/edit` of a tournament they may not edit
- **THEN** the page shows the localized "no access" message instead of the edit form

#### Scenario: Authorized user opens an editable tournament

- **WHEN** the current user may edit the loaded tournament
- **THEN** the page renders the full edit form as before

#### Scenario: Associations still loading

- **WHEN** the tournament has loaded but the user's managed-associations query is in flight
- **THEN** the page keeps showing the loading spinner and does not render the access-denied state

#### Scenario: Creating a new tournament

- **WHEN** an authenticated user navigates to `/tournaments/new`
- **THEN** the empty edit form renders without any access verdict