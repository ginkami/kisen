## ADDED Requirements

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

### Requirement: Association edit form

The association edit page SHALL render a form with a header block (overline "Редактирование ассоциации", h1 with localized title, document title "{title} — Редактирование ассоциации | shogi·world"), save and delete buttons. The form SHALL include an info section with LocaleTabs, title (required), slug (required, prefixed with "shogi.world/assn/"), description (ExpandableField), country (ExpandableField + CountrySelect), and location (ExpandableField). Title and slug SHALL be validated before save. When saving, a locale with any non-empty field SHALL be kept; any empty required `title` in a kept locale SHALL be backfilled from the first locale whose `title` is non-empty, so optional fields (description, location) entered for a locale without a title are not lost. Delete SHALL require a confirmation modal.

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

#### Scenario: Locale with description but no title is preserved

- **WHEN** the user fills `title` in the `ru` locale and `description` in the `en` locale, leaving `en.title` empty, and saves
- **THEN** the saved association has both locales
- **AND** the `en` locale's `title` is backfilled from the `ru` locale's `title`
- **AND** the `en` locale's `description` is preserved

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

The association edit page SHALL render a "Управляют ассоциацией" section listing `createdBy`, `managers`, and `pendingInvites` as badges. The creator badge SHALL NOT have a remove button. Manager badges SHALL have a remove button visible to admins, the association creator, and to the manager themselves (for their own badge only). Pending invite badges (email) SHALL have a remove button visible only to admins and the creator. Removing a manager or pending invite SHALL require confirmation.

#### Scenario: Displaying manager badges

- **WHEN** the association has managers and pending invites
- **THEN** each manager is displayed as a badge with their localized name
- **AND** each pending invite is displayed as a badge with the email
- **AND** the creator is displayed as a badge without a remove button

#### Scenario: Admin removes a manager

- **WHEN** an admin clicks the remove button on a manager badge and confirms
- **THEN** the manager id is removed from the `managers` array

#### Scenario: Invited manager can remove themselves

- **WHEN** a user with role `user` (invited manager) views the section
- **THEN** a remove button is displayed only on their own badge
- **AND** no remove buttons are displayed on other managers' badges or pending invite badges
- **WHEN** they click remove on their own badge and confirm
- **THEN** their id is removed from the `managers` array

#### Scenario: Removing a pending invite

- **WHEN** an admin or creator clicks remove on a pending invite badge and confirms
- **THEN** the email is removed from `pendingInvites`

### Requirement: Manager invite input with dual-mode autocomplete

The section SHALL include a text input labeled «Пригласить к управлению» with placeholder «Введите фамилию пользователя или email». When the input has more than 3 characters and does not contain `@`, the system SHALL search users by `familyName` and display matching results as cards with a «Выбрать» button. When the input contains `@`, the system SHALL validate it with the same email rule as the association domain schema (`emailSchema`): only a fully valid email triggers the lookup and can be offered as an invite. For a fully valid email, the system SHALL look up a registered user by that exact email (case-insensitive) before selection: if the user exists, their card with the localized name and a «Выбрать» button SHALL be displayed and the email candidate card SHALL NOT be shown; if no user matches, the system SHALL display the «no users found» message together with an explicit «Пригласить по email» action, and the email SHALL be added to `pendingInvites` only after that action is taken. Registered users who are the association creator or already in `managers` (passed via `excludeUserIds`) SHALL NOT be offered: the system SHALL display the «no users found» message with neither a «Выбрать» button nor the invite action. The lookup SHALL NOT run for emails already present in `pendingInvites` and SHALL NOT run for incomplete email input. Typing `@` SHALL NOT trigger a family-name search. Selecting an email that does not pass the email validation SHALL NOT add it to `pendingInvites`.

#### Scenario: Searching users by family name

- **WHEN** the user types more than 3 characters without `@`
- **THEN** matching users are displayed as cards with «Выбрать» buttons

#### Scenario: Registered user is shown for a full email before selection

- **WHEN** the user types a full email of a registered user
- **THEN** the user's card with their localized name and a «Выбрать» button is displayed
- **AND** the email candidate card is not shown

#### Scenario: Full email with no matching user requires an explicit invite action

- **WHEN** the user types a full email and no user with that email exists
- **THEN** the «no users found» message is displayed together with the email and an explicit «Пригласить по email» button
- **AND** the pending invite is added only after the user clicks that button

#### Scenario: Creator or already added manager is not offered

- **WHEN** the user types the email of a registered user who is the association creator or already in `managers`
- **THEN** no user card and no invite action is displayed
- **AND** the «no users found» message is shown

#### Scenario: Selecting a known user

- **WHEN** the user clicks «Выбрать» on a user card
- **THEN** the user's id is added to `managers`
- **AND** a new badge appears for that user

#### Scenario: Selecting an email that matches an existing user

- **WHEN** the user selects an email and a user with that email exists
- **THEN** the user's id is added to `managers`
- **AND** a new badge appears for that user

#### Scenario: Selecting an email with no matching user

- **WHEN** the user clicks «Пригласить по email» and no user with that email exists
- **THEN** the email is added to `pendingInvites`
- **AND** a new badge with the email appears

#### Scenario: Email already pending is not offered

- **WHEN** the user types an email that is already in `pendingInvites`
- **THEN** no email candidate card is displayed and no lookup is performed

#### Scenario: Incomplete email does not trigger lookups

- **WHEN** the input contains `@` but does not pass the domain email validation (e.g. `ab@` or a top-level domain shorter than 2 letters like `test@site.b`)
- **THEN** neither the family-name search nor the email lookup is performed
- **AND** no email candidate card and no «no users found» message is displayed

#### Scenario: Selecting an invalid email adds nothing

- **WHEN** the user clicks «Выбрать» on an email that does not pass the domain email validation
- **THEN** nothing is added to `pendingInvites`

### Requirement: User service search methods

The `UserService` SHALL expose `searchByFamilyName(prefix)`, `getByEmail(email)`, and `getByIds(ids)` methods. `searchByFamilyName` SHALL query `locales.*.familyName` across supported locales in parallel (same pattern as player search). `getByEmail` SHALL perform an exact case-insensitive match. `getByIds` SHALL batch-fetch user profiles by id. All returned `User` objects SHALL exclude the `auth` field (passwordHash, providers, emailVerified, isActive). User profiles SHALL be created with the email stored lowercased so the case-insensitive lookup is exact.

#### Scenario: Searching users by family name prefix

- **WHEN** `searchByFamilyName(prefix)` is called
- **THEN** users whose family name starts with the prefix in any locale are returned
- **AND** returned users do not contain `auth` field

#### Scenario: Finding a user by email

- **WHEN** `getByEmail(email)` is called
- **THEN** the user with that exact email (case-insensitive) is returned, or null
- **AND** returned user does not contain `auth` field

#### Scenario: Fetching multiple user profiles

- **WHEN** `getByIds(ids)` is called
- **THEN** user profiles for all provided ids are returned
- **AND** returned users do not contain `auth` field

#### Scenario: Creating a user stores the email lowercased

- **WHEN** `createUser` is called with an email containing uppercase characters
- **THEN** the stored profile email is lowercased

### Requirement: Firestore rules for user permissions

Firestore rules SHALL allow `read` for all authenticated users on the `/users/{userId}` collection. `create` SHALL be allowed for the user creating their own profile. `update` SHALL be allowed for the profile owner or admins (with role field protection). `delete` SHALL be allowed for admins only.

#### Scenario: Authenticated user reads another user's profile

- **WHEN** an authenticated user reads any user profile
- **THEN** Firestore allows the read

#### Scenario: Unauthenticated read is denied

- **WHEN** an unauthenticated request reads a user profile
- **THEN** Firestore denies the read

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
