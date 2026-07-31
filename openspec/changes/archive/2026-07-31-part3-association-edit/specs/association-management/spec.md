## MODIFIED Requirements

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

### Requirement: User service search methods

The `UserService` SHALL expose `searchByFamilyName(prefix)`, `getByEmail(email)`, and `getByIds(ids)` methods. `searchByFamilyName` SHALL query `locales.*.familyName` across supported locales in parallel (same pattern as player search). `getByEmail` SHALL perform an exact case-insensitive match. `getByIds` SHALL batch-fetch user profiles by id. All returned `User` objects SHALL exclude the `auth` field (passwordHash, providers, emailVerified, isActive).

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

### Requirement: Firestore rules for user permissions

Firestore rules SHALL allow `read` for all authenticated users on the `/users/{userId}` collection. `create` SHALL be allowed for the user creating their own profile. `update` SHALL be allowed for the profile owner or admins (with role field protection). `delete` SHALL be allowed for admins only.

#### Scenario: Authenticated user reads another user's profile

- **WHEN** an authenticated user reads any user profile
- **THEN** Firestore allows the read

#### Scenario: Unauthenticated read is denied

- **WHEN** an unauthenticated request reads a user profile
- **THEN** Firestore denies the read