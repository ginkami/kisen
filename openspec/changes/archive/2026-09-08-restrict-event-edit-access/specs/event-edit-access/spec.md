## ADDED Requirements

### Requirement: Event editability rule

The system SHALL provide a single pure helper `canEditEvent(event, userId, isAdmin, managedAssociationIds)` in the event domain that returns `true` exactly when `isAdmin` is `true`, or `event.createdBy === userId`, or `event.hostAssociation` is non-null and in `managedAssociationIds`. The drawer event search filter and the event edit page guard SHALL use this helper as their only source of truth for client-side edit access.

#### Scenario: Admin may edit any event

- **WHEN** `canEditEvent` is called with `isAdmin: true` for any event
- **THEN** it returns `true`

#### Scenario: Creator may edit own event

- **WHEN** `event.createdBy` equals `userId` regardless of the user's role
- **THEN** `canEditEvent` returns `true`

#### Scenario: Manager of the host association may edit

- **WHEN** the event's `hostAssociation` is in `managedAssociationIds`
- **THEN** `canEditEvent` returns `true`

#### Scenario: Unaffiliated event is not editable

- **WHEN** the user is not an admin, did not create the event, and does not manage the event's `hostAssociation`
- **THEN** `canEditEvent` returns `false`
- **AND** an event with `hostAssociation: null` is not editable by a non-admin non-creator

### Requirement: Editable events listing

The `EventService` SHALL provide a `listEditable(userId, managedAssociationIds, isAdmin)` method returning the events the current user may edit: all events for admins; otherwise the events created by the user plus events whose `hostAssociation` belongs to the managed associations, deduplicated by id and sorted by `updatedAt` descending. A `useEditableEvents(userId, managedAssociationIds, isAdmin)` hook SHALL expose this list via TanStack Query.

#### Scenario: Admin lists editable events

- **WHEN** `listEditable` is called with `isAdmin: true`
- **THEN** all events are returned

#### Scenario: User lists editable events

- **WHEN** `listEditable` is called for a non-admin user
- **THEN** the result contains events they created and events under associations they manage, each event appearing exactly once
- **AND** events with no relation to the user are not included

### Requirement: Tournament event picker offers only editable events

The `EventPickerModal` in the tournament edit form SHALL offer only events the current user may edit according to the event editability rule, filtered to the month selected in the picker (client-side). Admins SHALL see all events of the selected month. The "no parent event" option SHALL remain available.

#### Scenario: Manager opens the event picker

- **WHEN** a manager opens the event picker for a month
- **THEN** only events they created or events under associations they manage with `startYearMonth` equal to the selected month are offered

#### Scenario: Manager cannot pick an unaffiliated event

- **WHEN** an event of the selected month has no relation to the manager
- **THEN** it is not offered in the picker

#### Scenario: Admin opens the event picker

- **WHEN** an admin opens the event picker for a month
- **THEN** all events of that month are offered

#### Scenario: Clearing the parent event

- **WHEN** the user selects the "no parent event" option
- **THEN** the tournament's `parentEvent` is cleared

### Requirement: Event edit page blocks unauthorized direct access

When `/events/:id/edit` loads an existing event that the current user may not edit according to the event editability rule, the page SHALL render a localized access-denied alert instead of the event edit form, and no form fields, save, or delete controls SHALL be rendered. While the user's managed-associations query is still loading, the page SHALL keep rendering the loading state so the access verdict cannot flash incorrectly. The creation route (`/events/new`) SHALL NOT be affected by the guard.

#### Scenario: User opens an unauthorized event edit page by URL

- **WHEN** a user navigates directly to `/events/:id/edit` of an event they may not edit
- **THEN** the page shows the localized "no access" message instead of the edit form

#### Scenario: Authorized user opens an editable event

- **WHEN** the current user may edit the loaded event
- **THEN** the page renders the full edit form as before

#### Scenario: Associations still loading

- **WHEN** the event has loaded but the user's managed-associations query is in flight
- **THEN** the page keeps showing the loading spinner and does not render the access-denied state