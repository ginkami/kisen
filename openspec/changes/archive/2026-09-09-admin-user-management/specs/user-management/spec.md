## ADDED Requirements

### Requirement: Users section in the admin drawer

The admin drawer accordion SHALL include a "Users" section positioned below the "Regulations" section. The section SHALL be rendered only for users whose profile role is `admin`. It SHALL contain a single text search input with a magnifying glass icon (`BsSearch`). Typing a prefix of at least 3 characters SHALL trigger a live (debounced) search over registered users by email prefix, rendered as clickable cards below the input. Each card SHALL show the user's localized display name (locale-specific names with `locale → ru → en` fallback and `displayName` as the last resort, matching the managers section logic), the user's email, the user's role, and a blocked indicator when `auth.isActive === false`. Clicking a card SHALL navigate to `/users/{id}/edit`. Loading, empty ("no users found"), and error states SHALL follow the existing drawer section patterns.

#### Scenario: Admin opens the Users section

- **WHEN** an admin opens the admin drawer
- **THEN** the "Users" section is present below the "Regulations" section

#### Scenario: Non-admin does not see the section

- **WHEN** a user with role `manager` or `user` opens the admin drawer
- **THEN** the "Users" section is not rendered

#### Scenario: Searching users by email prefix

- **WHEN** the admin types 3 or more characters in the search input
- **THEN** matching users are shown as cards with display name, email, role, and a blocked badge where applicable
- **AND** blocked users are included in the results

#### Scenario: Opening a user for editing

- **WHEN** the admin clicks a user card
- **THEN** the application navigates to `/users/{id}/edit`

### Requirement: Admin edits a user's role and block state

The user edit page at `/users/{id}/edit` SHALL be accessible only to admins; non-admins SHALL see an access-restricted state instead of the form. The page SHALL render an "Access" block with a role dropdown offering `manager` and `user`, and a "Blocked" checkbox bound to `auth.isActive === false`, applied together by a Save button. Saving SHALL update the user's `role` and `auth.isActive` in Firestore and refresh the cached user data. For the admin's own account the dropdown and checkbox SHALL be disabled. The page SHALL also display the user's email and localized profile names read-only.

#### Scenario: Admin changes a user's role

- **WHEN** the admin selects `manager` for a user with role `user` and saves
- **THEN** the user's Firestore `role` becomes `manager`
- **AND** the change is reflected without a page reload

#### Scenario: Admin blocks a user

- **WHEN** the admin checks the "Blocked" checkbox and saves
- **THEN** the user's `auth.isActive` becomes `false`
- **AND** the user's active session is terminated by the existing blocking enforcement

#### Scenario: Admin unblocks a user

- **WHEN** the admin unchecks the "Blocked" checkbox for a blocked user and saves
- **THEN** the user's `auth.isActive` becomes `true`
- **AND** the user can sign in again

#### Scenario: Admin cannot lock themselves out

- **WHEN** the admin opens their own profile in the user edit page
- **THEN** the role dropdown and the blocked checkbox are disabled

#### Scenario: Non-admin opens the user edit URL directly

- **WHEN** a user with role `manager` or `user` opens `/users/{id}/edit`
- **THEN** an access-restricted state is shown instead of the edit form

### Requirement: Admin triggers a password reset for a user

The user edit page SHALL render a "Change password" block with a button that sends a Firebase password reset email to the edited user's email address. A success alert SHALL confirm that the email was sent. Firebase error codes SHALL be mapped to localized messages (generic fallback otherwise). The block SHALL NOT require the admin to know or enter the user's current password.

#### Scenario: Admin sends a password reset email

- **WHEN** the admin clicks the password reset button for a user
- **THEN** a password reset email is sent to the user's email address
- **AND** a localized success alert is shown

#### Scenario: Password reset fails

- **WHEN** Firebase reports an error (e.g. unknown email address)
- **THEN** a localized error alert is shown instead of the success message
