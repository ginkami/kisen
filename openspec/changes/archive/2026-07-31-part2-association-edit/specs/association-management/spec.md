## ADDED Requirements

### Requirement: Association edit form

The association edit page SHALL render a form with a header block (overline "Редактирование ассоциации", h1 with localized title, document title "{title} — Редактирование ассоциации | shogi·world"), save and delete buttons. The form SHALL include an info section with LocaleTabs, title (required), slug (required, prefixed with "shogi.world/assn/"), description (ExpandableField), country (ExpandableField + CountrySelect), and location (ExpandableField). Title and slug SHALL be validated before save. Delete SHALL require a confirmation modal.

#### Scenario: Editing an existing association

- **WHEN** the user navigates to `/assn/:id/edit`
- **THEN** the form loads the association data
- **AND** the h1 displays the localized title
- **AND** the document title is set to "{title} — Редактирование ассоциации | shogi·world"

#### Scenario: Creating a new association

- **WHEN** the user navigates to `/assn/new`
- **THEN** the form displays empty fields
- **AND** the h1 displays "Новая ассоциация"

#### Scenario: Title and document title update reactively

- **WHEN** the user changes the title field
- **THEN** the h1 heading updates immediately
- **AND** the document title updates immediately

#### Scenario: Saving with empty title

- **WHEN** the user clicks Save and the title is empty in all locales
- **THEN** validation blocks the save
- **AND** the title field is highlighted with an error

#### Scenario: Deleting an association

- **WHEN** the user clicks Delete and confirms
- **THEN** the association is deleted
- **AND** the user is redirected to the home page

### Requirement: Association service CRUD

The `AssociationService` SHALL expose `create`, `update`, `delete`, and `slugExists` methods. `create` SHALL generate a uuidv7 id, validate via `associationSchema.parse`, and persist. `update` SHALL merge with existing data, validate, and persist. `slugExists` SHALL check for slug uniqueness excluding the current association id.

#### Scenario: Creating an association

- **WHEN** `create` is called with valid input
- **THEN** a new association is persisted with a generated uuidv7 id
- **AND** the created association is returned

#### Scenario: Updating an association

- **WHEN** `update` is called with valid input
- **THEN** the existing association is updated and returned

#### Scenario: Checking slug uniqueness

- **WHEN** `slugExists` is called with a slug
- **THEN** it returns `true` if another association already uses that slug

### Requirement: Manager management section

The association edit page SHALL render a "Управляют ассоциацией" section listing `createdBy`, `managers`, and `pendingInvites` as badges. The creator badge SHALL NOT have a remove button. Manager badges SHALL have a remove button visible only to admins and the association creator. Pending invite badges (email) SHALL have a remove button visible only to admins and the creator. Removing a manager or pending invite SHALL require confirmation.

#### Scenario: Displaying manager badges

- **WHEN** the association has managers and pending invites
- **THEN** each manager is displayed as a badge with their localized name
- **AND** each pending invite is displayed as a badge with the email
- **AND** the creator is displayed as a badge without a remove button

#### Scenario: Admin removes a manager

- **WHEN** an admin clicks the remove button on a manager badge and confirms
- **THEN** the manager id is removed from the `managers` array

#### Scenario: Invited manager cannot remove others

- **WHEN** a user with role `user` (invited manager) views the section
- **THEN** no remove buttons are displayed on any badge

#### Scenario: Removing a pending invite

- **WHEN** an admin or creator clicks remove on a pending invite badge and confirms
- **THEN** the email is removed from `pendingInvites`

### Requirement: Manager invite input with dual-mode autocomplete

The section SHALL include a text input labeled "Пригласить к управлению" with placeholder "Введите фамилию пользователя или email". When the input has more than 3 characters and does not contain `@`, the system SHALL search users by `familyName` and display matching results as cards with a "Выбрать" button. When the input contains `@`, the system SHALL validate the email format and, if valid, display a single card with the email and a "Выбрать" button.

#### Scenario: Searching users by family name

- **WHEN** the user types more than 3 characters without `@`
- **THEN** matching users are displayed as cards with "Выбрать" buttons

#### Scenario: Validating email input

- **WHEN** the user types text containing `@` that matches email format
- **THEN** a single card with the email and "Выбрать" is displayed

#### Scenario: Selecting a known user

- **WHEN** the user clicks "Выбрать" on a user card
- **THEN** the user's id is added to `managers`
- **AND** a new badge appears for that user

#### Scenario: Selecting an email that matches an existing user

- **WHEN** the user selects an email and a user with that email exists
- **THEN** the user's id is added to `managers`
- **AND** a new badge appears for that user

#### Scenario: Selecting an email with no matching user

- **WHEN** the user selects an email and no user with that email exists
- **THEN** the email is added to `pendingInvites`
- **AND** a new badge with the email appears

### Requirement: User service search methods

The `UserService` SHALL expose `searchByFamilyName(prefix)`, `getByEmail(email)`, and `getByIds(ids)` methods. `searchByFamilyName` SHALL query `locales.*.familyName` across supported locales in parallel (same pattern as player search). `getByEmail` SHALL perform an exact case-insensitive match. `getByIds` SHALL batch-fetch user profiles by id.

#### Scenario: Searching users by family name prefix

- **WHEN** `searchByFamilyName(prefix)` is called
- **THEN** users whose family name starts with the prefix in any locale are returned

#### Scenario: Finding a user by email

- **WHEN** `getByEmail(email)` is called
- **THEN** the user with that exact email (case-insensitive) is returned, or null

#### Scenario: Fetching multiple user profiles

- **WHEN** `getByIds(ids)` is called
- **THEN** user profiles for all provided ids are returned

### Requirement: Firestore rules for association permissions

Firestore rules SHALL allow association `create` for admins and managers, `update` for admins, the creator, or any user in the `managers` array, and `delete` for admins or the creator.

#### Scenario: Manager creates an association

- **WHEN** a user with role `manager` creates an association
- **THEN** Firestore allows the write

#### Scenario: Invited manager updates an association

- **WHEN** a user whose id is in the `managers` array updates the association
- **THEN** Firestore allows the write

#### Scenario: Non-manager cannot update

- **WHEN** a user who is not admin, not the creator, and not in `managers` attempts to update
- **THEN** Firestore denies the write

#### Scenario: Creator deletes an association

- **WHEN** the creator deletes the association
- **THEN** Firestore allows the delete

## MODIFIED Requirements

### Requirement: Associations section in admin drawer

The admin drawer's "Associations" section SHALL render a filter input (with `BsFunnel` icon), a scrollable list of associations available to the user, and a role-gated "+ Ассоциация" create button. The section SHALL be disabled for users with role `user` who are not invited managers (i.e., have zero associations returned). The create button SHALL be visible to all users with role `admin` or `manager` without any limit on the number of associations they can create.

#### Scenario: Admin views all associations

- **WHEN** a user with role `admin` opens the Associations section
- **THEN** all existing associations are listed
- **AND** the "+ Ассоциация" button is always visible

#### Scenario: Manager views associations

- **WHEN** a user with role `manager` opens the Associations section
- **THEN** associations they created plus associations where they are in `managers` are listed
- **AND** the "+ Ассоциация" button is always visible (no limit on created associations)

#### Scenario: Invited user views invited associations

- **WHEN** a user with role `user` who is an invited manager opens the Associations section
- **THEN** associations where they are in `managers` are listed
- **AND** the "+ Ассоциация" button is NOT visible

#### Scenario: Regular user sees disabled section

- **WHEN** a user with role `user` who has zero associations opens the Associations section
- **THEN** the section is disabled (visually greyed out, not interactive)
