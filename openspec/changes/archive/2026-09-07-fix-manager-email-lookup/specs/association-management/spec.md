## MODIFIED Requirements

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
