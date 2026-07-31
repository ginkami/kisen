## ADDED Requirements

### Requirement: Associations section in admin drawer

The admin drawer's "Associations" section SHALL render a filter input (with `BsFunnel` icon), a scrollable list of associations available to the user, and a role-gated "+ Ассоциация" create button. The section SHALL be disabled for users with role `user` who are not invited managers (i.e., have zero associations returned).

#### Scenario: Admin views all associations

- **WHEN** a user with role `admin` opens the Associations section
- **THEN** all existing associations are listed
- **AND** the "+ Ассоциация" button is visible

#### Scenario: Manager views created and invited associations

- **WHEN** a user with role `manager` opens the Associations section
- **THEN** associations they created plus associations where they are in `managers` are listed
- **AND** the "+ Ассоциация" button is visible if they have not yet created any association
- **AND** the "+ Ассоциация" button is hidden if they already have a created association

#### Scenario: Invited user views invited associations

- **WHEN** a user with role `user` who is an invited manager opens the Associations section
- **THEN** associations where they are in `managers` are listed
- **AND** the "+ Ассоциация" button is NOT visible

#### Scenario: Regular user sees disabled section

- **WHEN** a user with role `user` who has zero associations opens the Associations section
- **THEN** the section is disabled (visually greyed out, not interactive)

#### Scenario: Filtering associations by title

- **WHEN** the user types text into the filter input
- **THEN** only associations whose title in the current locale contains the typed text (case-insensitive) are shown

#### Scenario: Navigating to association edit page

- **WHEN** the user clicks an association in the list
- **THEN** the application navigates to `/assn/:id/edit`

#### Scenario: Creating a new association

- **WHEN** the user clicks the "+ Ассоциация" button
- **THEN** the application navigates to `/assn/new`

### Requirement: Association edit routes

The application SHALL register routes `/assn/new` and `/assn/:id/edit` that render an `AssociationEditPage` component. The page SHALL be a placeholder that displays a message indicating the form will appear here.

#### Scenario: Visiting the new association route

- **WHEN** the user navigates to `/assn/new`
- **THEN** the `AssociationEditPage` placeholder is rendered

#### Scenario: Visiting the edit association route

- **WHEN** the user navigates to `/assn/:id/edit`
- **THEN** the `AssociationEditPage` placeholder is rendered

### Requirement: Association service listAll method

The `AssociationService` SHALL expose a `listAll(): Promise<Association[]>` method that returns all associations. The `FirestoreAssociationRepository` SHALL implement this by querying the entire `associations` collection.

#### Scenario: Admin fetches all associations

- **WHEN** `associationService.listAll()` is called
- **THEN** all association documents are returned from Firestore